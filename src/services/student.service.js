import prisma from "../config/prisma.js";

export const getStudents = async (user) => {
  if (user.role === "ADMIN") {
    // Return all students with their class and courses
    return prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        firstname: true,
        lastname: true,
        username: true,
        class: true,
        courses: true,
      },
    });
  }

  if (user.role === "TEACHER") {
    // Return students in classes taught by the teacher
    return prisma.user.findMany({
      where: {
        role: "STUDENT",
        class: { teacherId: user.id },
      },
      select: {
        firstname: true,
        lastname: true,
        username: true,
        class: true,
      },
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

    // Only ADMIN can assign
    if (requester.role !== "ADMIN") {
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
      select: {
        id: true,
        firstname: true,
        lastname: true,
        username: true,
        role: true,
        class: {
          include: {
            teacher: {
              select: { id: true, firstname: true, lastname: true },
            },
            courses: true,
          },
        },
      },
    });

    return updated;
  } catch (error) {
    console.error("Error assigning student to class:", error);
    throw error;
  }
};
