import prisma from "../config/prisma.js";

export const getTeachers = async (user, options = {}) => {
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const page = options.page || 1;
  const limit = options.limit || 10;
  const sort = options.sort || "createdAt";
  const order = options.order || "desc";

  const skip = (page - 1) * limit;

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      teacherOf: {
        select: {
          id: true,
          className: true,
        },
      },
      courses: {
        select: {
          id: true,
          title: true,
        },
      },
      createdAt: true,
    },
    skip,
    take: limit,
    orderBy: {
      [sort]: order,
    },
  });

  const total = await prisma.user.count({
    where: { role: "TEACHER" },
  });

  return {
    data: teachers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const assignClassTeacher = async (teacherId, classId, requester) => {
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

    // validate teacher exists and role
    const teacher = await prisma.user.findUnique({
      where: { id: parseInt(teacherId) },
    });
    if (!teacher || teacher.role !== "TEACHER")
      throw new Error("user is not a teacher");

    const updated = await prisma.class.update({
      where: { id: parseInt(classId) },
      data: { teacher: { connect: { id: parseInt(teacherId) } } },
      include: {
        teacher: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    return updated;
  } catch (error) {
    throw error;
  }
};
