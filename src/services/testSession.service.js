import prisma from "../config/prisma.js";
import { getIo } from "../utils/socket.js";
import { getCachedOrFetch } from "../utils/cache.js";
import { seededShuffle } from "../utils/seededShuffle.js";

// in-memory timers for active sessions (cleared on finish)
const sessionTimers = new Map();

export async function endSessionByTimer(sessionId, reason = "duration") {
  try {
    const timers = sessionTimers.get(sessionId);
    if (timers) {
      clearTimeout(timers.timeout);
      clearInterval(timers.interval);
      sessionTimers.delete(sessionId);
    }

    const session = await prisma.testSession.findUnique({
      where: { id: sessionId },
      include: { answers: { include: { question: true } }, test: true },
    });

    if (!session || session.endedAt || session.status === "COMPLETED") return;

    const score = session.answers.reduce(
      (total, answer) => total + (answer.isCorrect ? 1 : 0),
      0
    );

    await prisma.testSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), status: "COMPLETED", score },
    });

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
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, username: true, firstname: true, lastname: true },
    });
    if (!student)
      throw Object.assign(new Error("Student not found"), { statusCode: 404 });

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        course: { include: { classes: { include: { students: true } } } },
        bank: true,
      },
    });
    if (!test)
      throw Object.assign(new Error("Test not found"), { statusCode: 404 });

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
    if (
      (test.startTime && test.startTime > now) ||
      (test.endTime && test.endTime < now) ||
      test.testState !== "active"
    ) {
      throw Object.assign(new Error("Test not available at this time"), {
        statusCode: 400,
      });
    }

    const enrolled = await prisma.course.findFirst({
      where: {
        id: test.courseId,
        classes: { some: { students: { some: { id: studentId } } } },
      },
    });
    if (!enrolled)
      throw Object.assign(new Error("Student not enrolled"), {
        statusCode: 404,
      });

    const attemptCount = await prisma.testSession.count({
      where: { studentId, testId, status: "COMPLETED" },
    });
    if (test.attemptsAllowed && attemptCount >= test.attemptsAllowed) {
      throw Object.assign(new Error("Maximum attempts reached"), {
        statusCode: 400,
      });
    }

    const existing = await prisma.testSession.findFirst({
      where: { studentId, testId, status: "IN_PROGRESS", endedAt: null },
    });

    // Shuffle questions deterministically using session ID
    const shuffledQuestions = existing
      ? seededShuffle(allQuestions, existing.id)
      : null;

    if (existing) {
      // Existing session: return first 2 questions with selectedOption
      const answeredCount = await prisma.answer.count({
        where: { testSessionId: existing.id },
      });
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
      const questions = shuffledQuestions.slice(0, 2).map((q, i) => ({
        id: q.id,
        text: q.text,
        options: Array.isArray(q.options)
          ? q.options
          : JSON.parse(q.options || "[]"),
        selectedOption: answerMap.get(q.id) || null,
        displayNumber: i + 1,
      }));

      return {
        student,
        session: existing,
        course: { courseTitle: test.course.title, testTitle: test.title },
        questions,
        answered: existingAnswers.map((a) => ({
          ...a,
          displayNumber:
            shuffledQuestions.findIndex((q) => q.id === a.questionId) + 1,
        })),
        progress: { answeredCount, total: allQuestions.length },
      };
    }

    // New session
    const session = await prisma.testSession.create({
      data: { studentId, testId, status: "IN_PROGRESS" },
    });
    const shuffled = seededShuffle(allQuestions, session.id);

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

      getIo()
        .to(`session_${session.id}`)
        .emit("test_started", { sessionId: session.id, testId });
    } catch (err) {
      console.warn("Socket/timer setup failed:", err);
    }

    const questions = shuffled.slice(0, 2).map((q, i) => ({
      id: q.id,
      text: q.text,
      options: Array.isArray(q.options)
        ? q.options
        : JSON.parse(q.options || "[]"),
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
    throw Object.assign(new Error("Failed to start test session"), {
      statusCode: 400,
    });
  }
}

/**
 * Fetch questions by visual order (paginated), using seeded shuffle
 */
export async function fetchQuestionsByNumber({
  sessionId,
  questionNumber,
  pageSize = 2,
}) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { bank: true } } },
  });
  if (!session?.test?.bank) throw new Error("Test bank not found");

  const allQuestions = await getCachedOrFetch(
    `questions_bank_${session.test.bankId}`,
    () =>
      prisma.question.findMany({
        where: { bankId: session.test.bankId },
        orderBy: { id: "asc" },
      }),
    30 * 60 * 1000
  );

  if (!allQuestions.length) throw new Error("No questions found for this test");
  if (questionNumber < 1 || questionNumber > allQuestions.length)
    throw new Error("Invalid question number");

  const shuffled = seededShuffle(allQuestions, session.id);
  const startIndex = questionNumber - 1;
  const endIndex = Math.min(startIndex + pageSize, shuffled.length);
  const slice = shuffled.slice(startIndex, endIndex);

  const existingAnswers = await prisma.answer.findMany({
    where: {
      testSessionId: sessionId,
      questionId: { in: slice.map((q) => q.id) },
    },
    select: { questionId: true, selectedOption: true },
  });
  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a.selectedOption])
  );

  const nextQuestions = slice.map((q, i) => ({
    id: q.id,
    text: q.text,
    options: Array.isArray(q.options)
      ? q.options
      : JSON.parse(q.options || "[]"),
    selectedOption: answerMap.get(q.id) || null,
    displayNumber: startIndex + i + 1,
  }));

  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });
  const showSubmitButton = endIndex >= shuffled.length;

  return {
    showSubmitButton,
    finished: endIndex >= shuffled.length,
    nextQuestions,
    progress: { answeredCount, total: shuffled.length },
  };
}

/**
 * Submit single answer
 */
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

/**
 * Submit answers and get next page
 */
export async function submitAnswerAndGetNext({
  sessionId,
  answers,
  studentId,
  pageSize = 2,
}) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { bank: true } } },
  });
  if (
    !session ||
    session.studentId !== studentId ||
    session.endedAt ||
    session.status === "COMPLETED"
  ) {
    throw new Error("Session not accessible");
  }

  const allQuestions = await getCachedOrFetch(
    `questions_bank_${session.test.bankId}`,
    () =>
      prisma.question.findMany({
        where: { bankId: session.test.bankId },
        orderBy: { id: "asc" },
      }),
    30 * 60 * 1000
  );

  // Save submitted answers
  for (const a of answers) {
    if (!a.selectedOption || a.selectedOption === 0) continue;
    await submitAnswerOnly({
      sessionId,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
    });
  }

  const shuffled = seededShuffle(allQuestions, session.id);
  const lastSubmittedId = answers[answers.length - 1].questionId;
  const lastIndex = shuffled.findIndex((q) => q.id === lastSubmittedId);

  const nextSlice = shuffled.slice(lastIndex + 1, lastIndex + 1 + pageSize);

  const existingAnswers = await prisma.answer.findMany({
    where: {
      testSessionId: sessionId,
      questionId: { in: nextSlice.map((q) => q.id) },
    },
    select: { questionId: true, selectedOption: true },
  });
  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a.selectedOption])
  );

  const nextQuestions = nextSlice.map((q, i) => ({
    id: q.id,
    text: q.text,
    options: Array.isArray(q.options)
      ? q.options
      : JSON.parse(q.options || "[]"),
    selectedOption: answerMap.get(q.id) || null,
    displayNumber: lastIndex + i + 2,
  }));

  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });
  if (!nextQuestions.length)
    return {
      finished: true,
      data: await finishSession({ sessionId, studentId }),
    };

  const showSubmitButton =
    lastIndex + 1 + nextQuestions.length >= shuffled.length;
  return {
    showSubmitButton,
    finished: false,
    nextQuestions,
    progress: { answeredCount, total: shuffled.length },
  };
}

/**
 * Submit answers and get previous page
 */
export async function submitAnswerAndGetPrevious({
  sessionId,
  answers,
  studentId,
  pageSize = 2,
}) {
  if (!answers || !answers.length) throw new Error("No answers provided");
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { bank: true } } },
  });
  if (
    !session ||
    session.studentId !== studentId ||
    session.endedAt ||
    session.status === "COMPLETED"
  )
    throw new Error("Session not accessible");

  const allQuestions = await getCachedOrFetch(
    `questions_bank_${session.test.bankId}`,
    () =>
      prisma.question.findMany({
        where: { bankId: session.test.bankId },
        orderBy: { id: "asc" },
      }),
    30 * 60 * 1000
  );

  // Save submitted answers
  for (const a of answers) {
    if (!a.selectedOption || a.selectedOption === 0) continue;
    await submitAnswerOnly({
      sessionId,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
    });
  }

  const shuffled = seededShuffle(allQuestions, session.id);
  const firstIndex = shuffled.findIndex((q) => q.id === answers[0].questionId);
  const start = Math.max(firstIndex - pageSize, 0);
  const prevSlice = shuffled.slice(start, firstIndex);

  const existingAnswers = await prisma.answer.findMany({
    where: {
      testSessionId: sessionId,
      questionId: { in: prevSlice.map((q) => q.id) },
    },
    select: { questionId: true, selectedOption: true },
  });
  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a.selectedOption])
  );

  const previousQuestions = prevSlice.map((q, i) => ({
    id: q.id,
    text: q.text,
    options: Array.isArray(q.options)
      ? q.options
      : JSON.parse(q.options || "[]"),
    selectedOption: answerMap.get(q.id) || null,
    displayNumber: start + i + 1,
  }));

  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });
  return {
    finished: false,
    previousQuestions,
    progress: { answeredCount, total: shuffled.length },
  };
}

/**
 * Finish session
 */
export async function finishSession({ sessionId, studentId }) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { answers: { include: { question: true } }, test: true },
  });
  if (!session || session.studentId !== studentId)
    throw new Error("Session not found");

  const computeScore = (answers) =>
    answers.reduce((sum, a) => sum + (a.isCorrect ? 1 : 0), 0);
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
    const formattedAnswers = session.answers.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isCorrect: a.isCorrect,
      question: {
        id: a.question.id,
        text: a.question.text,
        options: Array.isArray(a.question.options)
          ? a.question.options
          : JSON.parse(a.question.options || "[]"),
      },
    }));
    return { ...updated, score, answers: formattedAnswers };
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
