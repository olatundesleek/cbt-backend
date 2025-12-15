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
    throw error;
  }
};

export const deleteCourse = async (courseId) => {
  try {
    const id = parseInt(courseId);

    // 1. Check if any test exists in this course
    const linkedTests = await prisma.test.findMany({
      where: { courseId: id },
      select: { id: true, title: true },
    });

    if (linkedTests.length > 0) {
      const titles = linkedTests.map((t) => t.title).join(", ");
      const error = new Error("unable to delete course");
      error.details = `Cannot delete this course. The following tests are still using it: ${titles}. Please assign them to another course first.`;
      throw error;
    }

    // 2. Disconnect course from classes
    await prisma.class.updateMany({
      where: { courses: { some: { id } } },
      data: { courses: { disconnect: { id } } },
    });

    // 3. Delete the course (question banks will automatically set courseId to null)
    await prisma.course.delete({ where: { id } });

    return { deletedCourseId: id };
  } catch (error) {
    throw error;
  }
};

export async function getCoursesForUser(user, options = {}) {
  try {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || "createdAt";
    const order = options.order || "desc";

    const skip = (page - 1) * limit;

    if (user.role === "ADMIN") {
      const courses = await prisma.course.findMany({
        include: {
          teacher: { select: { id: true, firstname: true, lastname: true } },
        },
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
      });

      const total = await prisma.course.count();

      return {
        data: courses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    if (user.role === "TEACHER") {
      const courses = await prisma.course.findMany({
        where: { teacherId: user.id },
        include: {
          teacher: { select: { id: true, firstname: true, lastname: true } },
        },
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
      });

      const total = await prisma.course.count({
        where: { teacherId: user.id },
      });

      return {
        data: courses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    if (user.role === "STUDENT") {
      const courses = await prisma.course.findMany({
        where: {
          classes: {
            some: {
              students: { some: { id: user.id } },
            },
          },
        },
        include: {
          teacher: { select: { id: true, firstname: true, lastname: true } },
        },
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
      });

      const total = await prisma.course.count({
        where: {
          classes: {
            some: {
              students: { some: { id: user.id } },
            },
          },
        },
      });

      return {
        data: courses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    throw new Error("Invalid role");
  } catch (error) {
    throw error;
  }
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
    throw error;
  }
};
