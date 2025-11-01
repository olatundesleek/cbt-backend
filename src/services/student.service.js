import prisma from "../config/prisma.js";

export const getStudents = async (user) => {
  if (user.role === "ADMIN") {
    return prisma.user.findMany({
      where: { role: "STUDENT" },
      include: { class: true, courses: true },
    });
  }

  if (user.role === "TEACHER") {
    // students whose class has teacherId === user.id
    return prisma.user.findMany({
      where: { role: "STUDENT", class: { teacherId: user.id } },
      include: { class: true },
    });
  }

  throw new Error("Forbidden");
};

export const getStudentByUsername = async (requester, username) => {
  const student = await prisma.user.findUnique({
    where: { username: username },
    include: { class: true },
  });

  if (!student || student.role !== "STUDENT")
    throw new Error("Student not found");

  if (requester.role === "ADMIN") return student;

  if (requester.role === "TEACHER") {
    // allow if teacher owns the student's class
    if (student.class && student.class.teacherId === requester.id)
      return student;
    throw new Error("Forbidden");
  }

  if (requester.role === "STUDENT") {
    if (requester.id === student.id) return student;
    throw new Error("Forbidden");
  }

  throw new Error("Invalid role");
};

export const assignStudentToClass = async (studentId, classId, requester) => {
  try {
    // validate class exists
    const klass = await prisma.class.findUnique({
      where: { id: parseInt(classId) },
    });
    if (!klass) throw new Error("Class not found");

    // Only ADMIN or TEACHER (who teaches the class) can assign
    if (requester.role === "TEACHER" && klass.teacherId !== requester.id) {
      throw new Error("Forbidden");
    }

    // validate student exists and role
    const student = await prisma.user.findUnique({
      where: { id: parseInt(studentId) },
    });
    if (!student || student.role !== "STUDENT")
      throw new Error("user is not a student");

    const updated = await prisma.user.update({
      where: { id: parseInt(studentId) },
      data: { class: { connect: { id: parseInt(classId) } } },
      include: { class: true },
    });

    return updated;
  } catch (error) {
    console.error("Error assigning student to class:", error);
    throw error;
  }
};

export const changeUserPassword = async (username, newPassword) => {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new Error("User not found");
    await prisma.user.update({
      where: { username },
      data: { password: newPassword },
    });
  } catch (error) {
    console.error("Error changing user password:", error);
    throw error;
  }
};
