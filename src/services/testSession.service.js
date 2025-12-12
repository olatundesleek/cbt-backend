import prisma from "../config/prisma.js";
import { getIo } from "../utils/socket.js";
import { getCachedOrFetch } from "../utils/cache.js";

// in-memory timers for active sessions (cleared on finish)
const sessionTimers = new Map();

export async function endSessionByTimer(sessionId, reason = "duration") {
  try {
    // Clear both the timeout and interval first
    const timers = sessionTimers.get(sessionId);
    if (timers) {
      clearTimeout(timers.timeout);
      clearInterval(timers.interval);
      sessionTimers.delete(sessionId);
    }

    // Fetch session with related data
    const session = await prisma.testSession.findUnique({
      where: { id: sessionId },
      include: { answers: { include: { question: true } }, test: true },
    });

    // Ignore if already completed or ended
    if (!session || session.endedAt || session.status === "COMPLETED") return;

    // Compute score safely
    const score = session.answers.reduce(
      (total, answer) => total + (answer.isCorrect ? 1 : 0),
      0
    );

    // Mark as completed
    await prisma.testSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), status: "COMPLETED", score },
    });

    // Notify clients in that session room
    try {
      const io = getIo();
      io.to(`session_${sessionId}`).emit("time_up", {
        sessionId,
        score,
        reason,
      });
    } catch {
      console.warn("Socket not initialized or not connected.");
    }
  } catch (e) {
    console.error("Error ending session by timer:", e);
  }
}

export async function startSession({ studentId, testId }) {
  try {
    // Fetch student info
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, username: true, firstname: true, lastname: true },
    });
    if (!student) {
      const error = new Error();
      error.details = "Student not found";
      error.statusCode = 404;
      throw error;
    }

    // Fetch test with course and class
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: { include: { classes: { include: { students: true } } } },
        bank: true,
      },
    });
    if (!test) {
      const error = new Error();
      error.details = "Test not found";
      error.statusCode = 404;
      throw error;
    }

    // Fetch questions from cache
    const allQuestions = await getCachedOrFetch(
      `questions_bank_${test.bankId}`,
      () =>
        prisma.question.findMany({
          where: { bankId: test.bankId },
          orderBy: { id: "asc" },
        }),
      30 * 60 * 1000
    );

    const now = new Date();

    // Check test availability
    if (test.startTime && test.startTime > now) {
      const error = new Error();
      error.details = "Test not yet started";
      error.statusCode = 400;
      throw error;
    }
    if (test.endTime && test.endTime < now) {
      const error = new Error();
      error.details = "Test already ended";
      error.statusCode = 400;
      throw error;
    }
    if (test.testState !== "active") {
      const error = new Error();
      error.details = "Test is not active";
      error.statusCode = 400;
      throw error;
    }

    // Verify student enrollment
    const enrolled = await prisma.course.findFirst({
      where: {
        id: test.courseId,
        classes: { some: { students: { some: { id: studentId } } } },
      },
    });
    if (!enrolled) {
      const error = new Error();
      error.details = "Student not enrolled for this course";
      error.statusCode = 404;
      throw error;
    }

    // Count completed attempts
    const attemptCount = await prisma.testSession.count({
      where: { studentId, testId, status: "COMPLETED" },
    });
    if (test.attemptsAllowed && attemptCount >= test.attemptsAllowed) {
      const error = new Error();
      error.details = "Maximum attempts reached for this test";
      error.statusCode = 400;
      throw error;
    }

    // Check for existing unfinished session
    const existing = await prisma.testSession.findFirst({
      where: { studentId, testId, status: "IN_PROGRESS", endedAt: null },
    });

    // --------------------------------------------------------
    // EXISTING SESSION — INCLUDE selectedOption
    // --------------------------------------------------------
    if (existing) {
      const answeredCount = await prisma.answer.count({
        where: { testSessionId: existing.id },
      });
      const course = { courseTitle: test.course.title, testTitle: test.title };

      // First 2 questions
      const baseQuestions = allQuestions.slice(0, 2);

      // Fetch previously selected answers
      const existingAnswers = await prisma.answer.findMany({
        where: {
          testSessionId: existing.id,
          questionId: { in: allQuestions.map((q) => q.id) },
        },
        select: { questionId: true, selectedOption: true },
      });

      const answerMap = new Map(
        existingAnswers.map((a) => [a.questionId, a.selectedOption])
      );

      // Add displayNumber and selectedOption
      const answeredWithDisplayNumbers = existingAnswers.map((a) => {
        const index = allQuestions.findIndex((q) => q.id === a.questionId);
        return { ...a, displayNumber: index + 1 };
      });

      const questions = baseQuestions.map(({ answer, ...rest }, i) => ({
        ...rest,
        selectedOption: answerMap.get(rest.id) || null,
        displayNumber: i + 1,
      }));

      return {
        student,
        session: existing,
        course,
        questions,
        answered: answeredWithDisplayNumbers,
        progress: { answeredCount, total: allQuestions.length },
      };
    }

    // --------------------------------------------------------
    // NEW SESSION — INCLUDE selectedOption = null
    // --------------------------------------------------------
    const session = await prisma.testSession.create({
      data: { studentId, testId, status: "IN_PROGRESS" },
    });

    // Timers + socket setup
    const endTimeMs = test.endTime
      ? new Date(test.endTime).getTime() - now.getTime()
      : Infinity;
    const durationMs = test.duration ? test.duration * 60 * 1000 : Infinity;
    const timeoutMs = Math.min(endTimeMs, durationMs);

    try {
      if (timeoutMs > 0 && timeoutMs !== Infinity) {
        const io = getIo();
        const timeout = setTimeout(
          () =>
            endSessionByTimer(
              session.id,
              timeoutMs === endTimeMs ? "endTime" : "duration"
            ),
          timeoutMs
        );
        const interval = setInterval(() => {
          const remaining = Math.max(
            0,
            timeoutMs - (Date.now() - now.getTime())
          );
          io.to(`session_${session.id}`).emit("time_left", {
            sessionId: session.id,
            timeLeft: remaining,
          });
        }, 1000);
        sessionTimers.set(session.id, { timeout, interval });
      }

      const io = getIo();
      io.to(`session_${session.id}`).emit("test_started", {
        sessionId: session.id,
        testId,
      });
    } catch (err) {
      console.warn("Socket/timer setup failed:", err);
    }

    // First 2 questions for new session → selectedOption = null
    const questions = allQuestions
      .slice(0, 2)
      .map(({ answer, ...rest }, i) => ({
        ...rest,
        selectedOption: null,
        displayNumber: i + 1,
      }));

    return {
      student,
      session,
      questions,
      totalQuestions: allQuestions.length,
      progress: { answeredCount: 0, total: allQuestions.length },
    };
  } catch (error) {
    console.error("Error in startSession:", error);
    error.message = "failed to start test session";
    throw error;
  }
}

export async function fetchQuestionsByNumber({ sessionId, questionNumber }) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { bank: true } } },
  });
  if (!session?.test?.bank) throw new Error("Test bank not found");

  const questions = await getCachedOrFetch(
    `questions_bank_${session.test.bankId}`,
    () =>
      prisma.question.findMany({
        where: { bankId: session.test.bankId },
        orderBy: { id: "asc" },
      }),
    30 * 60 * 1000
  );

  if (!questions.length) throw new Error("No questions found for this test");
  if (questionNumber < 1 || questionNumber > questions.length)
    throw new Error("Invalid question number");

  const startIndex = questionNumber - 1;
  const endIndex = Math.min(startIndex + 2, questions.length);

  const nextQuestionsSlice = questions
    .slice(startIndex, endIndex)
    .map(({ answer, ...rest }, i) => ({
      ...rest,
      displayNumber: startIndex + i + 1,
    }));

  const questionIds = nextQuestionsSlice.map((q) => q.id);
  const existingAnswers = questionIds.length
    ? await prisma.answer.findMany({
        where: { testSessionId: sessionId, questionId: { in: questionIds } },
        select: { questionId: true, selectedOption: true },
      })
    : [];

  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a.selectedOption])
  );
  const nextQuestions = nextQuestionsSlice.map((q) => ({
    ...q,
    selectedOption: answerMap.get(q.id) || null,
  }));

  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });
  const showSubmitButton = endIndex >= questions.length;

  return {
    showSubmitButton,
    finished: false,
    nextQuestions,
    progress: { answeredCount, total: questions.length },
  };
}

export async function submitAnswerOnly({
  sessionId,
  questionId,
  selectedOption,
}) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new Error("Question not found");

  const isCorrect =
    question.answer.trim().toLowerCase() ===
    selectedOption.trim().toLowerCase();
  const existing = await prisma.answer.findFirst({
    where: { testSessionId: sessionId, questionId },
  });

  if (existing) {
    await prisma.answer.update({
      where: { id: existing.id },
      data: { selectedOption, isCorrect, createdAt: new Date() },
    });
  } else {
    await prisma.answer.create({
      data: { testSessionId: sessionId, questionId, selectedOption, isCorrect },
    });
  }
}

export async function submitAnswerAndGetNext({
  sessionId,
  answers,
  studentId,
}) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { bank: true } } },
  });
  if (!session) throw new Error("Session not found");
  if (session.studentId !== studentId)
    throw new Error("Unauthorized access to session");
  if (session.endedAt || session.status === "COMPLETED")
    throw new Error("Session already ended");

  const questions = await getCachedOrFetch(
    `questions_bank_${session.test.bankId}`,
    () =>
      prisma.question.findMany({
        where: { bankId: session.test.bankId },
        orderBy: { id: "asc" },
      }),
    30 * 60 * 1000
  );

  for (const a of answers) {
    if (!a.selectedOption || a.selectedOption === 0) continue;
    await submitAnswerOnly({
      sessionId,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
    });
  }

  const lastSubmittedId = answers[answers.length - 1].questionId;
  const lastIndex = questions.findIndex((q) => q.id === lastSubmittedId);
  const nextQuestionsSlice = questions.slice(lastIndex + 1, lastIndex + 3);

  const questionIds = nextQuestionsSlice.map((q) => q.id);
  const existingAnswers = await prisma.answer.findMany({
    where: { testSessionId: sessionId, questionId: { in: questionIds } },
    select: { questionId: true, selectedOption: true },
  });
  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a.selectedOption])
  );

  const nextQuestions = nextQuestionsSlice.map(({ answer, ...rest }, i) => ({
    ...rest,
    selectedOption: answerMap.get(rest.id) || null,
    displayNumber: lastIndex + i + 2,
  }));

  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });

  if (!nextQuestions.length) {
    const result = await finishSession({ sessionId, studentId });
    return { finished: true, data: result };
  }

  const showSubmitButton = nextQuestionsSlice.length <= 1;

  return {
    showSubmitButton,
    finished: false,
    nextQuestions,
    progress: { answeredCount, total: questions.length },
  };
}

export async function submitAnswerAndGetPrevious({
  sessionId,
  answers,
  studentId,
}) {
  if (!answers?.length) throw new Error("No answers provided");

  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { bank: true } } },
  });
  if (!session) throw new Error("Session not found");
  if (session.studentId !== studentId) throw new Error("Unauthorized access");
  if (session.endedAt || session.status === "COMPLETED")
    throw new Error("Session already finished");

  const questions = await getCachedOrFetch(
    `questions_bank_${session.test.bankId}`,
    () =>
      prisma.question.findMany({
        where: { bankId: session.test.bankId },
        orderBy: { id: "asc" },
      }),
    30 * 60 * 1000
  );

  for (const a of answers) {
    if (!a.selectedOption || a.selectedOption === 0) continue;
    await submitAnswerOnly({
      sessionId,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
    });
  }

  const firstIndex = questions.findIndex((q) => q.id === answers[0].questionId);
  const start = Math.max(firstIndex - 2, 0);
  const previousQuestionsSlice = questions.slice(start, firstIndex);

  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });

  if (!previousQuestionsSlice.length) {
    return {
      finished: false,
      previousQuestions: [],
      progress: { answeredCount, total: questions.length },
      message: "No previous questions available",
    };
  }

  const questionIds = previousQuestionsSlice.map((q) => q.id);
  const existingAnswers = await prisma.answer.findMany({
    where: { testSessionId: sessionId, questionId: { in: questionIds } },
    select: { questionId: true, selectedOption: true },
  });
  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a.selectedOption])
  );

  const previousQuestions = previousQuestionsSlice.map(
    ({ answer, ...rest }, i) => ({
      ...rest,
      selectedOption: answerMap.get(rest.id) || null,
      displayNumber: start + i + 1,
    })
  );

  return {
    finished: false,
    previousQuestions,
    progress: { answeredCount, total: questions.length },
  };
}

export async function finishSession({ sessionId, studentId }) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { answers: { include: { question: true } }, test: true },
  });
  if (!session) throw new Error("Session not found");
  if (session.studentId !== studentId) throw new Error("Not your session");

  const formatTestAnswers = (answers) =>
    answers.map((a) => {
      const { answer: correctAnswer, options, ...restQuestion } = a.question;
      return {
        id: a.id,
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        question: {
          ...restQuestion,
          options: Array.isArray(options)
            ? options
            : JSON.parse(options || "[]"),
          correctAnswer,
        },
      };
    });

  const computeScore = (answers) =>
    answers.reduce((sum, a) => sum + (a.isCorrect ? 1 : 0), 0);

  if (session.endedAt || session.status === "COMPLETED") {
    if (session.test.type === "PRACTICE") {
      return {
        id: session.id,
        testId: session.testId,
        studentId: session.studentId,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        type: session.test.type,
        score: computeScore(session.answers),
        answers: formatTestAnswers(session.answers),
      };
    }
    return {
      id: session.id,
      testId: session.testId,
      studentId: session.studentId,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      type: session.test?.type ?? "UNKNOWN",
    };
  }

  console.log("Finishing session for type:", session.test.type);

  const score = computeScore(session.answers);
  const updated = await prisma.testSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date(), status: "COMPLETED", score },
    include: { test: true },
  });

  if (sessionTimers.has(sessionId)) {
    clearTimeout(sessionTimers.get(sessionId));
    sessionTimers.delete(sessionId);
  }

  if (session.test.type === "PRACTICE") {
    return { ...updated, score, answers: formatTestAnswers(session.answers) };
  }

  return {
    id: updated.id,
    testId: updated.testId,
    studentId: updated.studentId,
    status: updated.status,
    startedAt: updated.startedAt,
    endedAt: updated.endedAt,
    type: updated.test.type,
  };
}
