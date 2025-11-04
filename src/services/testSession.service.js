import prisma from "../config/prisma.js";
import { getIo } from "../utils/socket.js";

// in-memory timers for active sessions (cleared on finish)
const sessionTimers = new Map();

async function endSessionByTimer(sessionId, reason = "duration") {
  try {
    const session = await prisma.testSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: { include: { question: true } },
        test: true,
      },
    });

    if (!session || session.endedAt || session.status === "COMPLETED") return;

    const score = session.answers.reduce(
      (s, a) => s + (a.isCorrect ? 1 : 0),
      0
    );

    await prisma.testSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        status: "COMPLETED",
        score,
      },
    });

    try {
      const io = getIo();
      io.to(`session_${sessionId}`).emit("time_up", {
        sessionId,
        score,
        reason,
      });
    } catch {
      // socket not initialized
    }
  } catch (e) {
    console.error("Error ending session by timer:", e);
  } finally {
    sessionTimers.delete(sessionId);
  }
}

export async function startSession({ studentId, testId }) {
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
  if (test.endTime && test.endTime < now) throw new Error("Test already ended");
  if (test.testState !== "active") throw new Error("Test is not active");

  // ✅ Verify student enrollment
  const enrolled = await prisma.course.findFirst({
    where: {
      id: test.courseId,
      classes: { some: { students: { some: { id: studentId } } } },
    },
  });
  if (!enrolled) throw new Error("Student not enrolled in this course");

  // ✅ Count only COMPLETED sessions as attempts
  const attemptCount = await prisma.testSession.count({
    where: { studentId, testId, status: "COMPLETED" },
  });

  console.log("this is the Attempt count:", attemptCount);
  console.log("this is the attemptsAllowed:", test.attemptsAllowed);

  if (test.attemptsAllowed && attemptCount >= test.attemptsAllowed) {
    throw new Error("Maximum attempts reached for this test");
  }

  // ✅ Resume existing unfinished session if any
  const existing = await prisma.testSession.findFirst({
    where: { studentId, testId, status: "IN_PROGRESS", endedAt: null },
  });

  if (existing) {
    const questions = test.bank.questions
      .slice(0, 2)
      .map(({ answer, ...rest }) => rest);
    return { session: existing, questions };
  }

  // ✅ Otherwise, create new session
  const session = await prisma.testSession.create({
    data: { studentId, testId, status: "IN_PROGRESS" },
    include: { answers: true },
  });

  // ✅ Handle timer (duration or endTime)
  if (test.duration || test.endTime) {
    const endTimeMs = test.endTime
      ? new Date(test.endTime).getTime() - now.getTime()
      : Infinity;

    const durationMs = test.duration ? test.duration * 60 * 1000 : Infinity;
    const timeoutMs = Math.min(endTimeMs, durationMs);

    if (timeoutMs > 0 && timeoutMs !== Infinity) {
      const timer = setTimeout(
        () =>
          endSessionByTimer(
            session.id,
            timeoutMs === endTimeMs ? "endTime" : "duration"
          ),
        timeoutMs
      );
      sessionTimers.set(session.id, timer);
    }
  }

  // ✅ Return first two questions (hide answers)
  const questions = test.bank.questions
    .slice(0, 2)
    .map(({ answer, ...rest }) => rest);

  // ✅ Notify client that test started
  try {
    const io = getIo();
    io.to(`session_${session.id}`).emit("test_started", {
      sessionId: session.id,
      testId,
    });
  } catch {
    // socket not initialized
  }

  return { session, questions };
}

export async function fetchQuestionsByNumber({
  sessionId,
  questionNumber,
  includeAnswers = false,
}) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { questions: { orderBy: { id: "asc" } } } } },
  });
  if (!session) throw new Error("Session not found");
  const questions = session.test.questions;
  if (!questions || questions.length === 0) throw new Error("No questions");
  if (questionNumber < 1 || questionNumber > questions.length)
    throw new Error("Invalid question number");

  const startIndex = questionNumber - 1;
  const q1 = questions[startIndex];
  const q2 = questions[startIndex + 1];

  // Never include answers during the test
  const pair = [q1, q2].filter(Boolean).map((q) => {
    const { answer, ...rest } = q;
    return rest;
  });

  const answers = await prisma.answer.findMany({
    where: {
      testSessionId: sessionId,
      questionId: { in: pair.map((p) => p.id).filter(Boolean) },
    },
    select: {
      questionId: true,
      selectedOption: true,
      createdAt: true,
    },
  });

  // Create a map of question ID to answer for easy lookup
  const answerMap = new Map(
    answers.map((a) => [
      a.questionId,
      { selectedOption: a.selectedOption, answeredAt: a.createdAt },
    ])
  );

  return {
    questions: pair,
    index: questionNumber,
    total: questions.length,
    answered: pair.map((p) => ({
      questionId: p.id,
      isAnswered: answerMap.has(p.id),
      previousAnswer: answerMap.get(p.id)?.selectedOption,
      answeredAt: answerMap.get(p.id)?.answeredAt,
    })),
  };
}

export async function submitAnswerOnly({
  sessionId,
  questionId,
  selectedOption,
}) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: true },
  });
  if (!session) throw new Error("Session not found");
  if (session.endedAt) throw new Error("Session already finished");
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
  return { ok: true };
}

export async function submitAnswerAndGetNext({
  sessionId,
  questionId,
  selectedOption,
}) {
  // Step 1: Record the answer
  await submitAnswerOnly({ sessionId, questionId, selectedOption });

  // Step 2: Fetch session with questions
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
  if (session.endedAt || session.status === "COMPLETED")
    throw new Error("Session already finished");

  // Step 3: Find next unanswered question
  const questions = session.test.bank.questions;
  const answered = await prisma.answer.findMany({
    where: { testSessionId: sessionId },
    select: { questionId: true },
  });

  const answeredIds = new Set(answered.map((a) => a.questionId));
  const nextQuestion = questions.find((q) => !answeredIds.has(q.id));

  // Step 4: If no more questions => finish session
  if (!nextQuestion) {
    const result = await finishSession({
      sessionId,
      studentId: session.studentId,
    });
    return { finished: true, score: result.score };
  }

  // Step 5: Hide the correct answer and return progress
  const { answer: _, ...publicNext } = nextQuestion;
  const total = questions.length;
  const answeredCount = answeredIds.size;

  return {
    finished: false,
    nextQuestion: publicNext,
    progress: { answered: answeredCount, total },
  };
}

export async function submitAnswerAndGetPrevious({
  sessionId,
  questionId,
  selectedOption,
}) {
  // Step 1: Record the current answer
  if (selectedOption !== undefined) {
    await submitAnswerOnly({ sessionId, questionId, selectedOption });
  }

  // Step 2: Fetch session with ordered questions
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
  if (session.endedAt || session.status === "COMPLETED")
    throw new Error("Session already finished");

  const questions = session.test.bank.questions;
  const currentIndex = questions.findIndex((q) => q.id === questionId);
  if (currentIndex === -1) throw new Error("Question not in test");

  // Step 3: Get previous question (if any)
  const previousQuestion = questions[currentIndex - 1];

  if (!previousQuestion) {
    return {
      finished: false,
      message: "You’re already at the first question.",
      previousQuestion: null,
    };
  }

  // Step 4: Get progress
  const answered = await prisma.answer.findMany({
    where: { testSessionId: sessionId },
    select: { questionId: true },
  });
  const answeredIds = new Set(answered.map((a) => a.questionId));

  // Step 5: Hide correct answer
  const { answer: _, ...publicPrev } = previousQuestion;

  return {
    finished: false,
    previousQuestion: publicPrev,
    progress: {
      currentIndex: currentIndex - 1,
      total: questions.length,
      answered: answeredIds.size,
    },
  };
}

export async function finishSession({ sessionId, studentId }) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      answers: { include: { question: true } },
      test: true,
    },
  });

  if (!session) throw new Error("Session not found");
  if (session.studentId !== studentId) throw new Error("Not your session");
  if (session.endedAt || session.status === "COMPLETED") return session;

  const score = session.answers.reduce((s, a) => s + (a.isCorrect ? 1 : 0), 0);

  // ✅ For non-TEST types, remove correct answers before returning
  if (session.test.type !== "TEST") {
    session.answers = session.answers.map((a) => {
      const { answer, ...rest } = a.question;
      return { ...a, question: rest };
    });
  }

  const updated = await prisma.testSession.update({
    where: { id: sessionId },
    data: {
      endedAt: new Date(),
      status: "COMPLETED",
      score,
    },
  });

  // ✅ Clear any active timer
  if (sessionTimers.has(sessionId)) {
    clearTimeout(sessionTimers.get(sessionId));
    sessionTimers.delete(sessionId);
  }

  return {
    ...updated,
    answers: session.answers,
    score,
  };
}
