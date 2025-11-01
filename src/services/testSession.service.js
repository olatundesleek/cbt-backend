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
    if (!session) return;
    if (session.endedAt) return;
    const score = session.answers.reduce(
      (s, a) => s + (a.isCorrect ? 1 : 0),
      0
    );
    await prisma.testSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), score },
    });

    // emit time_up to session room with reason
    try {
      const io = getIo();
      io.to(`session_${sessionId}`).emit("time_up", {
        sessionId,
        score,
        reason, // 'duration' or 'endTime'
      });
    } catch (e) {
      // socket not initialized
    }
  } catch (e) {
    // swallow
  } finally {
    sessionTimers.delete(sessionId);
  }
}

export async function startSession({ studentId, testId }) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      course: { include: { classes: { include: { students: true } } } },
      questions: { orderBy: { id: "asc" } },
    },
  });
  if (!test) throw new Error("Test not found");
  const now = new Date();
  if (test.startTime && test.startTime > now)
    throw new Error("Test not yet started");
  if (test.endTime && test.endTime < now) throw new Error("Test already ended");
  if (!test.isActive) throw new Error("Test is not active");
  const enrolled = await prisma.course.findFirst({
    where: {
      id: test.courseId,
      classes: { some: { students: { some: { id: studentId } } } },
    },
  });
  if (!enrolled) throw new Error("Student not enrolled in this course");
  const existing = await prisma.testSession.findFirst({
    where: { studentId, testId, endedAt: null },
  });
  if (existing) {
    // return only first two questions, never include answers during test
    const questions = test.questions.slice(0, 2).map((q) => {
      const { answer, ...rest } = q;
      return rest;
    });
    return { session: existing, questions };
  }

  const session = await prisma.testSession.create({
    data: { studentId, testId },
    include: { answers: true },
  });

  // Handle both duration and endTime timers
  if (test.duration || test.endTime) {
    // Calculate time until endTime (if set)
    const endTimeMs = test.endTime
      ? new Date(test.endTime).getTime() - now.getTime()
      : Infinity;

    // Calculate duration in ms (if set)
    const durationMs = test.duration ? test.duration * 60 * 1000 : Infinity; // duration is in minutes

    // Use the shorter time between duration and endTime
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

  // return first two questions, never include answers during test
  const questions = test.questions.slice(0, 2).map((q) => {
    const { answer, ...rest } = q;
    return rest;
  });

  // notify client that session started
  try {
    const io = getIo();
    io.to(`session_${session.id}`).emit("test_started", {
      sessionId: session.id,
      testId,
    });
  } catch (e) {
    // ignore if io not ready
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
  // reuse submitAnswerOnly then find next unanswered question
  await submitAnswerOnly({ sessionId, questionId, selectedOption });
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { questions: { orderBy: { id: "asc" } } } } },
  });
  if (!session) throw new Error("Session not found");
  if (session.endedAt) throw new Error("Session already finished");
  const questions = session.test.questions;
  const answered = await prisma.answer.findMany({
    where: { testSessionId: sessionId },
    select: { questionId: true },
  });
  const answeredIds = new Set(answered.map((a) => a.questionId));
  let nextQuestion = null;
  for (const q of questions) {
    if (!answeredIds.has(q.id)) {
      nextQuestion = q;
      break;
    }
  }
  if (!nextQuestion) {
    const allAnswers = await prisma.answer.findMany({
      where: { testSessionId: sessionId },
      include: { question: true },
    });
    const score = allAnswers.reduce((s, a) => s + (a.isCorrect ? 1 : 0), 0);
    await prisma.testSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), score },
    });
    // clear timer if exists
    if (sessionTimers.has(sessionId)) {
      clearTimeout(sessionTimers.get(sessionId));
      sessionTimers.delete(sessionId);
    }
    return { finished: true, score };
  }
  const { answer: _, ...publicNext } = nextQuestion;
  const total = questions.length;
  const answeredCount = answeredIds.size;
  return {
    finished: false,
    nextQuestion: publicNext,
    progress: { answered: answeredCount, total },
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
  if (session.endedAt) return session;

  const score = session.answers.reduce((s, a) => s + (a.isCorrect ? 1 : 0), 0);

  // For non-TEST type, remove answers from response
  if (session.test.type !== "TEST") {
    session.answers = session.answers.map((a) => {
      const { answer, ...rest } = a.question;
      return { ...a, question: rest };
    });
  }

  const updated = await prisma.testSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date(), score },
  });

  // clear timer if exists
  if (sessionTimers.has(sessionId)) {
    clearTimeout(sessionTimers.get(sessionId));
    sessionTimers.delete(sessionId);
  }

  // Return session with answers only for TEST type
  return {
    ...updated,
    answers: session.answers,
    score,
  };
}
