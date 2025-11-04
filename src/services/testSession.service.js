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

export async function fetchQuestionsByNumber({ sessionId, questionNumber }) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      test: {
        include: {
          bank: {
            include: {
              questions: { orderBy: { id: "asc" } }, // ✅ correct path
            },
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

  // Remove the correct answer
  const pair = questions
    .slice(startIndex, endIndex)
    .map(({ answer, ...rest }) => rest);

  // Fetch previously selected options
  const questionIds = pair.map((p) => p.id).filter(Boolean);
  const answers =
    questionIds.length > 0
      ? await prisma.answer.findMany({
          where: { testSessionId: sessionId, questionId: { in: questionIds } },
          select: { questionId: true, selectedOption: true, createdAt: true },
        })
      : [];

  const answerMap = new Map(
    answers.map((a) => [
      a.questionId,
      { selectedOption: a.selectedOption, answeredAt: a.createdAt },
    ])
  );

  return {
    questions: pair,
    index: startIndex + 1, // 1-based for frontend
    total: questions.length,
    answered: pair.map((p, i) => ({
      questionId: p.id,
      questionNumber: startIndex + i + 1,
      isAnswered: answerMap.has(p.id),
      previousAnswer: answerMap.get(p.id)?.selectedOption,
      answeredAt: answerMap.get(p.id)?.answeredAt,
    })),
    finished: endIndex >= questions.length, // true if last batch
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
  // ✅ Step 1: Validate session ownership and existence
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
    throw new Error("Session already finished");

  const questions = session.test.bank.questions;

  // ✅ Step 2: Save up to 2 answers
  for (const a of answers) {
    await submitAnswerOnly({
      sessionId,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
    });
  }

  // ✅ Step 3: Determine the last submitted question index
  const lastSubmittedId = answers[answers.length - 1].questionId;
  const lastIndex = questions.findIndex((q) => q.id === lastSubmittedId);

  // ✅ Step 4: Find the next 2 questions
  const nextQuestions = questions.slice(lastIndex + 1, lastIndex + 3);

  // ✅ Step 5: If no remaining questions, use finishSession()
  if (nextQuestions.length === 0) {
    const result = await finishSession({ sessionId, studentId });
    return { finished: true, data: result };
  }

  // ✅ Step 6: Get any previously selected options for next 2 questions
  const questionIds = nextQuestions.map((q) => q.id);
  const existingAnswers = await prisma.answer.findMany({
    where: { testSessionId: sessionId, questionId: { in: questionIds } },
    select: { questionId: true, selectedOption: true },
  });

  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a.selectedOption])
  );

  // ✅ Step 7: Hide correct answers
  const publicQuestions = nextQuestions.map(({ answer, ...rest }) => ({
    ...rest,
    selectedOption: answerMap.get(rest.id) || null,
  }));

  // ✅ Step 8: Progress info
  const answeredCount = await prisma.answer.count({
    where: { testSessionId: sessionId },
  });

  return {
    finished: false,
    nextQuestions: publicQuestions,
    progress: {
      answeredCount,
      total: questions.length,
    },
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
    await submitAnswerOnly({
      sessionId,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
    });
  }

  const firstIndex = questions.findIndex((q) => q.id === answers[0].questionId);
  const start = Math.max(firstIndex - 2, 0);
  const previousQuestions = questions.slice(start, firstIndex);

  // Compute answered count once
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

  // Attach previously selected options
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

  const publicQuestions = previousQuestions.map(({ answer, ...rest }) => ({
    ...rest,
    selectedOption: answerMap.get(rest.id) || null,
  }));

  return {
    finished: false,
    previousQuestions: publicQuestions,
    progress: { answeredCount, total: questions.length },
  };
}

// export async function finishSession({ sessionId, studentId }) {
//   const session = await prisma.testSession.findUnique({
//     where: { id: sessionId },
//     include: {
//       answers: { include: { question: true } },
//       test: true,
//     },
//   });

//   if (!session) throw new Error("Session not found");
//   if (session.studentId !== studentId) throw new Error("Not your session");
//   if (session.endedAt || session.status === "COMPLETED") return session;

//   console.log("this is the test type:", session.test.type);

//   // 🧮 Compute score (only for TEST)
//   const score =
//     session.test.type === "TEST"
//       ? session.answers.reduce((s, a) => s + (a.isCorrect ? 1 : 0), 0)
//       : null;

//   // ✅ Mark the session as completed
//   const updated = await prisma.testSession.update({
//     where: { id: sessionId },
//     data: {
//       endedAt: new Date(),
//       status: "COMPLETED",
//       score: score ?? undefined,
//     },
//     include: { test: true },
//   });

//   // 🧹 Clear any active timer
//   if (sessionTimers.has(sessionId)) {
//     clearTimeout(sessionTimers.get(sessionId));
//     sessionTimers.delete(sessionId);
//   }

//   // ✅ For non-TEST sessions, hide answers, questions, and score
//   if (session.test.type !== "TEST") {
//     return {
//       id: updated.id,
//       testId: updated.testId,
//       studentId: updated.studentId,
//       status: updated.status,
//       startedAt: updated.startedAt,
//       endedAt: updated.endedAt,
//       type: updated.test.type,
//     };
//   }

//   // ✅ For TEST — show selected + correct answers
//   const formattedAnswers = session.answers.map((a) => {
//     const { answer: correctAnswer, options, ...restQuestion } = a.question;

//     return {
//       id: a.id,
//       questionId: a.questionId,
//       selectedOption: a.selectedOption,
//       isCorrect: a.isCorrect,
//       question: {
//         ...restQuestion,
//         options: Array.isArray(options)
//           ? options
//           : typeof options === "string"
//           ? JSON.parse(options)
//           : [],
//         correctAnswer, // ✅ include correct answer for review
//       },
//     };
//   });

//   return {
//     ...updated,
//     score,
//     answers: formattedAnswers,
//   };
// }

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

  // Compute score for TEST
  const score =
    session.test.type === "TEST" ? computeScore(session.answers) : null;

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
