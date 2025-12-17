import prisma from "../config/prisma.js";

export const getStudents = async (user, options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const sort = options.sort || "createdAt";
  const order = options.order || "desc";

  const skip = (page - 1) * limit;

  if (user.role === "ADMIN") {
    // Return all students with their class and courses
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        username: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        class: {
          include: { courses: true },
        },
      },
      skip,
      take: limit,
      orderBy: {
        [sort]: order,
      },
    });

    const total = await prisma.user.count({
      where: { role: "STUDENT" },
    });

    return {
      data: students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  if (user.role === "TEACHER") {
    // Return students in classes taught by the teacher
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        class: { teacherId: user.id },
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        username: true,
        createdAt: true,
        class: {
          include: { courses: true },
        },
      },
      skip,
      take: limit,
      orderBy: {
        [sort]: order,
      },
    });

    const total = await prisma.user.count({
      where: {
        role: "STUDENT",
        class: { teacherId: user.id },
      },
    });

    return {
      data: students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  throw new Error("Forbidden");
};

export const getStudentByUsername = async (requester, username) => {
  const student = await prisma.user.findUnique({
    where: { username: username },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      username: true,
      class: {
        include: { courses: true },
      },
    },
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
    throw error;
  }
};
