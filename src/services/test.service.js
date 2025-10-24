import prisma from '../config/prisma.js';
export async function createTest({ title, type, courseId, createdBy }) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if(!course) throw new Error('Course not found');
  if(course.teacherId !== createdBy) throw new Error('Not authorized to create test for this course');
  return prisma.test.create({ data: { title, type, courseId, createdBy, isActive: true }});
}
export async function getTest(testId, user) {
  const test = await prisma.test.findUnique({ where: { id: testId }, include: { course: true, questions: true }});
  if(!test) throw new Error('Test not found');
  if(user.role === 'ADMIN') return test;
  if(user.role === 'TEACHER'){ if(test.course.teacherId !== user.id) throw new Error('Not authorized'); return test; }
  if(user.role === 'STUDENT'){
    const enrolled = await prisma.course.findFirst({ where: { id: test.courseId, classes: { some: { students: { some: { id: user.id } } } } }});
    if(!enrolled) throw new Error('Not enrolled');
    // hide answers
    test.questions = test.questions.map(q => { const { answer, ...rest } = q; return rest; });
    return test;
  }
  throw new Error('Invalid role');
}
