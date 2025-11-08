import prisma from "../config/prisma.js";

export const createCourse = async (title, description, teacherId, userRole) => {
  try {
    //  Ensure only admin can create courses
    if (userRole !== "ADMIN") {
      throw new Error("Only admins can create courses");
    }

    const data = { title, description };

    //  If teacher is provided, validate and connect
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

    //  Create course
    const newCourse = await prisma.course.create({
      data,
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

    return newCourse;
  } catch (error) {
    console.error("Prisma error:", error);
    throw error;
  }
};

/**
 * Update a course’s details or teacher.
 */
export const updateCourse = async (courseId, title, description, teacherId) => {
  try {
    const data = { title, description };

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

    const updatedCourse = await prisma.course.update({
      where: { id: parseInt(courseId) },
      data,
      include: {
        teacher: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        classes: true,
      },
    });

    return updatedCourse;
  } catch (error) {
    console.error("Prisma error:", error);
    throw error;
  }
};

export const deleteCourse = async (courseId) => {
  try {
    await prisma.course.delete({ where: { id: parseInt(courseId) } });
  } catch (error) {
    console.error("Prisma error deleting course:", error);
    throw new Error("Error deleting course");
  }
};

export async function getCoursesForUser(user) {
  if (user.role === "ADMIN")
    return prisma.course.findMany({ include: { teacher: true } });
  if (user.role === "TEACHER")
    return prisma.course.findMany({
      where: { teacherId: user.id },
      include: { teacher: true },
    });
  if (user.role === "STUDENT")
    return prisma.course.findMany({
      where: { classes: { some: { students: { some: { id: user.id } } } } },
      include: { teacher: true },
    });
  throw new Error("Invalid role");
}

// export const createCourse = async (courseName, title, desc) => {
//   try {
//     const data = { className };

//     if (teacherId) {
//       data.teacher = { connect: { id: parseInt(teacherId) } };
//     }

//     if (courses.length > 0) {
//       data.courses = { connect: courses.map((id) => ({ id: parseInt(id) })) };
//     }

//     const newClass = await prisma.class.create({
//       data,
//       include: {
//         teacher: {
//           select: {
//             id: true,
//             firstname: true,
//             lastname: true,
//           },
//         },
//         courses: true,
//       },
//     });

//     return newClass;
//   } catch (error) {
//     console.error("Prisma error:", error);
//     throw error;
//   }
// };

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
