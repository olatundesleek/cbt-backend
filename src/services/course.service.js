import prisma from '../config/prisma.js';
export async function createCourse({ title, description, teacherId }) {
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }});
  if(!teacher || teacher.role !== 'TEACHER') throw new Error('Teacher invalid');
  return prisma.course.create({ data: { title, description, teacherId }});
}
export async function getCoursesForUser(user){
  if(user.role === 'ADMIN') return prisma.course.findMany({ include: { teacher: true }});
  if(user.role === 'TEACHER') return prisma.course.findMany({ where: { teacherId: user.id }, include: { teacher: true }});
  if(user.role === 'STUDENT') return prisma.course.findMany({
    where: { classes: { some: { students: { some: { id: user.id } } } } },
    include: { teacher: true }
  });
  throw new Error('Invalid role');
}
