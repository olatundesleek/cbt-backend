import prisma from '../config/prisma.js';
export async function startSession({ studentId, testId }) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { course: { include: { classes: { include: { students: true } } } }, questions: true }
  });
  if(!test) throw new Error('Test not found');
  const now = new Date();
  if(test.startTime && test.startTime > now) throw new Error('Test not yet started');
  if(test.endTime && test.endTime < now) throw new Error('Test already ended');
  if(!test.isActive) throw new Error('Test is not active');
  const enrolled = await prisma.course.findFirst({
    where: { id: test.courseId, classes: { some: { students: { some: { id: studentId } } } } }
  });
  if(!enrolled) throw new Error('Student not enrolled in this course');
  const existing = await prisma.testSession.findFirst({ where: { studentId, testId, endedAt: null } });
  if(existing) return existing;
  const session = await prisma.testSession.create({ data: { studentId, testId }, include: { answers: true } });
  return session;
}
export async function fetchQuestionByNumber({ sessionId, questionNumber }) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { questions: { orderBy: { id: 'asc' } } } } }
  });
  if(!session) throw new Error('Session not found');
  const questions = session.test.questions;
  if(!questions || questions.length === 0) throw new Error('No questions');
  if(questionNumber < 1 || questionNumber > questions.length) throw new Error('Invalid question number');
  const q = questions[questionNumber - 1];
  const { answer, ...publicQ } = q;
  const existing = await prisma.answer.findFirst({ where: { testSessionId: sessionId, questionId: q.id } });
  return { question: publicQ, index: questionNumber, total: questions.length, answered: !!existing };
}
export async function submitAnswerAndGetNext({ sessionId, questionId, selectedOption }) {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: { test: { include: { questions: { orderBy: { id: 'asc' } } } } }
  });
  if(!session) throw new Error('Session not found');
  if(session.endedAt) throw new Error('Session already finished');
  const questions = session.test.questions;
  const question = questions.find(q => q.id === questionId);
  if(!question) throw new Error('Question does not belong to this test');
  const isCorrect = question.answer === selectedOption;
  const existing = await prisma.answer.findFirst({ where: { testSessionId: sessionId, questionId } });
  if(existing) {
    await prisma.answer.update({ where: { id: existing.id }, data: { selectedOption, isCorrect, createdAt: new Date() }});
  } else {
    await prisma.answer.create({ data: { testSessionId: sessionId, questionId, selectedOption, isCorrect }});
  }
  const answered = await prisma.answer.findMany({ where: { testSessionId: sessionId }, select: { questionId: true }});
  const answeredIds = new Set(answered.map(a=>a.questionId));
  let nextQuestion = null;
  for(const q of questions) { if(!answeredIds.has(q.id)) { nextQuestion = q; break; } }
  if(!nextQuestion) {
    const allAnswers = await prisma.answer.findMany({ where: { testSessionId: sessionId }, include: { question: true }});
    const score = allAnswers.reduce((s,a)=> s + (a.isCorrect ? 1 : 0), 0);
    await prisma.testSession.update({ where: { id: sessionId }, data: { endedAt: new Date(), score }});
    return { finished: true, score };
  }
  const { answer:_, ...publicNext } = nextQuestion;
  const total = questions.length;
  const answeredCount = answeredIds.size;
  return { finished: false, nextQuestion: publicNext, progress: { answered: answeredCount, total } };
}
export async function finishSession({ sessionId, studentId }) {
  const session = await prisma.testSession.findUnique({ where: { id: sessionId }, include: { answers: { include: { question: true } } }});
  if(!session) throw new Error('Session not found');
  if(session.studentId !== studentId) throw new Error('Not your session');
  if(session.endedAt) return session;
  const score = session.answers.reduce((s,a)=> s + (a.isCorrect ? 1 : 0), 0);
  const updated = await prisma.testSession.update({ where: { id: sessionId }, data: { endedAt: new Date(), score }});
  return updated;
}
