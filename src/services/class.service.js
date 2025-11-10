import prisma from "../config/prisma.js";

export const createClass = async (className, teacherId, courses = []) => {
  try {
    const data = { className };

    if (teacherId) {
      const teacher = await prisma.user.findUnique({
        where: { id: parseInt(teacherId) },
        select: { id: true, role: true },
      });

      if (!teacher || teacher.role !== "TEACHER") {
        throw new Error("Invalid teacher ID or role");
      }

      data.teacher = { connect: { id: parseInt(teacherId) } };
    }

    // if (teacherId) {
    //   data.teacher = { connect: { id: parseInt(teacherId) } };
    // }

    if (courses.length > 0) {
      data.courses = { connect: courses.map((id) => ({ id: parseInt(id) })) };
    }

    const newClass = await prisma.class.create({
      data,
      include: {
        teacher: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        courses: true,
      },
    });

    return newClass;
  } catch (error) {
    console.error("Prisma error:", error);
    throw error;
  }
};

export const updateClass = async (
  classId,
  className,
  teacherId,
  courses = []
) => {
  try {
    const data = { className };

    if (teacherId) {
      data.teacher = { connect: { id: parseInt(teacherId) } };
    }

    if (courses.length > 0) {
      data.courses = { set: courses.map((id) => ({ id: parseInt(id) })) };
    }

    const updatedClass = await prisma.class.update({
      where: { id: parseInt(classId) },
      data,
      include: {
        teacher: {
          select: {
            firstname: true,
            lastname: true,
          },
        },
        courses: true,
      },
    });

    return updatedClass;
  } catch (error) {
    console.error("Prisma error:", error);
    throw error;
  }
};

export const deleteClass = async (classId) => {
  try {
    await prisma.class.delete({ where: { id: classId } });
  } catch (error) {
    throw new Error("Error deleting class");
  }
};

export const getClassesForUser = async (user) => {
  try {
    const role = user.role;

    if (role === "ADMIN") {
      return await prisma.class.findMany({
        include: {
          teacher: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          courses: true,
        },
      });
    }

    if (role === "TEACHER") {
      return await prisma.class.findMany({
        where: { teacherId: user.id },
        include: {
          teacher: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          courses: true,
        },
      });
    }

    if (role === "STUDENT") {
      const student = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          class: {
            include: {
              teacher: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
                },
              },
              courses: true,
            },
          },
        },
      });

      // Return an array for consistency with other roles
      return student?.class ? [student.class] : [];
    }

    throw new Error("Invalid role");
  } catch (error) {
    console.error("Error fetching classes for user:", error);
    throw error;
  }
};
