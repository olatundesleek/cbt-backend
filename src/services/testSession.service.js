import prisma from "../config/prisma.js";
import { getIo } from "../utils/socket.js";

// in-memory timers for active sessions (cleared on finish)
const sessionTimers = new Map();

export async function endSessionByTimer(sessionId, reason = "duration") {
  try {
    //  Clear both the timeout and interval first
    const timers = sessionTimers.get(sessionId);
    if (timers) {
      clearTimeout(timers.timeout);
      clearInterval(timers.interval);
      sessionTimers.delete(sessionId);
    }

    //  Fetch session with related data
    const session = await prisma.testSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: { include: { question: true } },
        test: true,
      },
    });

    //  Ignore if already completed or ended
    if (!session || session.endedAt || session.status === "COMPLETED") return;

    //  Compute score safely
    const score = session.answers.reduce(
      (total, answer) => total + (answer.isCorrect ? 1 : 0),
      0
    );

    //  Mark as completed
    await prisma.testSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        status: "COMPLETED",
        score,
      },
    });

    //  Notify clients in that session room
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
    if (!student) throw new Error("Student not found");

    // Fetch test with course, class, and questions
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: { include: { classes: { include: { students: true } } } },
        bank: { include: { questions: { orderBy: { id: "asc" } } } },
      },
    });
    if (!test) throw new Error("Test not found");

    const now = new Date();

    if (test.startTime && test.startTime > now)
      throw new Error("Test not yet started");
    if (test.endTime && test.endTime < now)
      throw new Error("Test already ended");
    if (test.testState !== "active") throw new Error("Test is not active");

    // Verify student enrollment
    const enrolled = await prisma.course.findFirst({
      where: {
        id: test.courseId,
        classes: { some: { students: { some: { id: studentId } } } },
      },
    });
    if (!enrolled) throw new Error("Student not enrolled in this course");

    // Count completed attempts
    const attemptCount = await prisma.testSession.count({
      where: { studentId, testId, status: "COMPLETED" },
    });
    if (test.attemptsAllowed && attemptCount >= test.attemptsAllowed)
      throw new Error("Maximum attempts reached for this test");

    // Check for existing unfinished session
    const existing = await prisma.testSession.findFirst({
      where: { studentId, testId, status: "IN_PROGRESS", endedAt: null },
    });

    // Get questions from test bank
    const allQuestions = test.bank.questions;

    if (existing) {
      const answeredCount = await prisma.answer.count({
        where: { testSessionId: existing.id },
      });

      const course = {
        courseTitle: test.course.title, //
        testTitle: test.title,
      };
      // Add displayNumber for frontend
      const questions = allQuestions
        .slice(0, 2)
        .map(({ answer, ...rest }, i) => ({ ...rest, displayNumber: i + 1 }));

      return {
        student,
        session: existing,
        course,
        questions,
        progress: { answeredCount, total: allQuestions.length },
      };
    }

    // Create new session
    const session = await prisma.testSession.create({
      data: { studentId, testId, status: "IN_PROGRESS" },
      include: { answers: true },
    });

    // Calculate timers
    const endTimeMs = test.endTime
      ? new Date(test.endTime).getTime() - now.getTime()
      : Infinity;
    const durationMs = test.duration ? test.duration * 60 * 1000 : Infinity;
    const timeoutMs = Math.min(endTimeMs, durationMs);

    // Safe socket & timer setup
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

    // Return first questions (hide answers) with displayNumber
    const totalQuestions = allQuestions.length;
    const questions = allQuestions
      .slice(0, 2)
      .map(({ answer, ...rest }, i) => ({ ...rest, displayNumber: i + 1 }));

    return {
      student,
      session,
      questions,
      totalQuestions,
      progress: { answeredCount: 0, total: totalQuestions },
    };
  } catch (error) {
    console.error("Error in startSession:", error);
    throw new Error(error.message || "Failed to start session");
  }
}

export async function fetchQuestionsByNumber({ sessionId, questionNumber }) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      test: {
        include: {
          bank: {
            include: { questions: { orderBy: { id: "asc" } } },
          },
        },
      },
    },
  });

  if (!session?.test?.bank?.questions?.length)
    throw new Error("No questions found for this test");

  const questions = session.test.bank.questions;

  if (questionNumber < 1 || questionNumber > questions.length)
    throw new Error("Invalid question number");

  const startIndex = questionNumber - 1;
  const endIndex = Math.min(startIndex + 2, questions.length);

  // Slice and add displayNumber
  const nextQuestionsSlice = questions
    .slice(startIndex, endIndex)
    .map(({ answer, ...rest }, i) => ({
      ...rest,
      displayNumber: startIndex + i + 1, // 👈 NEW - visual number
    }));

  // Fetch previously selected options
  const questionIds = nextQuestionsSlice.map((q) => q.id);
  const existingAnswers =
    questionIds.length > 0
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

  const showSubmitButton = endIndex >= questions.length;

  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });

  return {
    showSubmitButton,
    finished: false,
    nextQuestions,
    progress: {
      answeredCount,
      total: questions.length,
    },
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

  const isCorrect = question.answer === selectedOption;
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
  answers, // [{ questionId, selectedOption }, ... up to 2]
  studentId,
}) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      test: {
        include: {
          bank: { include: { questions: { orderBy: { id: "asc" } } } },
        },
      },
    },
  });

  if (!session) throw new Error("Session not found");
  if (session.studentId !== studentId)
    throw new Error("Unauthorized access to session");
  if (session.endedAt || session.status === "COMPLETED")
    throw new Error("Session already ended");

  const questions = session.test.bank.questions;

  // Save up to 2 answers
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

  const nextQuestions = questions.slice(lastIndex + 1, lastIndex + 3);

  const showSubmitButton = nextQuestions.length <= 1;

  const questionIds = nextQuestions.map((q) => q.id);
  const existingAnswers = await prisma.answer.findMany({
    where: { testSessionId: sessionId, questionId: { in: questionIds } },
    select: { questionId: true, selectedOption: true },
  });

  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a.selectedOption])
  );

  const publicQuestions = nextQuestions.map(({ answer, ...rest }, i) => ({
    ...rest,
    selectedOption: answerMap.get(rest.id) || null,
    displayNumber: lastIndex + i + 2, // 👈 NEW - visual number
  }));

  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });

  if (nextQuestions.length === 0) {
    const result = await finishSession({ sessionId, studentId });
    return { finished: true, data: result };
  }

  return {
    showSubmitButton,
    finished: false,
    nextQuestions: publicQuestions,
    progress: { answeredCount, total: questions.length },
  };
}

export async function submitAnswerAndGetPrevious({
  sessionId,
  answers,
  studentId,
}) {
  if (!answers || answers.length === 0) throw new Error("No answers provided");

  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      test: {
        include: {
          bank: { include: { questions: { orderBy: { id: "asc" } } } },
        },
      },
    },
  });

  if (!session) throw new Error("Session not found");
  if (session.studentId !== studentId) throw new Error("Unauthorized access");
  if (session.endedAt || session.status === "COMPLETED")
    throw new Error("Session already finished");

  const questions = session.test.bank.questions;

  // Save submitted answers
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
  const previousQuestions = questions.slice(start, firstIndex);

  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });

  if (previousQuestions.length === 0) {
    return {
      finished: false,
      previousQuestions: [],
      progress: { answeredCount, total: questions.length },
      message: "No previous questions available",
    };
  }

  const existingAnswers = await prisma.answer.findMany({
    where: {
      testSessionId: sessionId,
      questionId: { in: previousQuestions.map((q) => q.id) },
    },
    select: { questionId: true, selectedOption: true },
  });

  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a.selectedOption])
  );

  const publicQuestions = previousQuestions.map(({ answer, ...rest }, i) => ({
    ...rest,
    selectedOption: answerMap.get(rest.id) || null,
    displayNumber: start + i + 1, // 👈 NEW - visual number
  }));

  return {
    finished: false,
    previousQuestions: publicQuestions,
    progress: { answeredCount, total: questions.length },
  };
}
export async function finishSession({ sessionId, studentId }) {
  // Fetch the session with answers and test type
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      answers: { include: { question: true } },
      test: true,
    },
  });

  if (!session) throw new Error("Session not found");
  if (session.studentId !== studentId) throw new Error("Not your session");

  // Helper to format TEST answers
  const formatTestAnswers = (answers) => {
    return answers.map((a) => {
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
            : typeof options === "string"
            ? JSON.parse(options)
            : [],
          correctAnswer,
        },
      };
    });
  };

  // Compute score helper
  const computeScore = (answers) =>
    answers.reduce((sum, a) => sum + (a.isCorrect ? 1 : 0), 0);

  // Already completed session
  if (session.endedAt || session.status === "COMPLETED") {
    if (session.test.type === "TEST") {
      const formattedAnswers = formatTestAnswers(session.answers);
      const score = computeScore(session.answers);
      return {
        id: session.id,
        testId: session.testId,
        studentId: session.studentId,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        type: session.test.type,
        score,
        answers: formattedAnswers,
      };
    }

    // EXAM → minimal info only
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

  // Compute score
  const score = computeScore(session.answers);
  // Mark session as completed
  const updated = await prisma.testSession.update({
    where: { id: sessionId },
    data: {
      endedAt: new Date(),
      status: "COMPLETED",
      score: score ?? undefined,
    },
    include: { test: true },
  });

  // Clear any active timer
  if (sessionTimers.has(sessionId)) {
    clearTimeout(sessionTimers.get(sessionId));
    sessionTimers.delete(sessionId);
  }

  // Return based on test type
  if (session.test.type === "TEST") {
    const formattedAnswers = formatTestAnswers(session.answers);
    return {
      ...updated,
      score,
      answers: formattedAnswers,
    };
  }

  // EXAM → minimal info only
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
