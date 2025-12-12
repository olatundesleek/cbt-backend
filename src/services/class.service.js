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

// export const getClassesForUser = async (user, options = {}) => {
//   try {
//     const page = options.page || 1;
//     const limit = options.limit || 10;
//     const sort = options.sort || "createdAt";
//     const order = options.order || "desc";

//     const skip = (page - 1) * limit;

//     const role = user.role;

//     if (role === "ADMIN") {
//       const classes = await prisma.class.findMany({
//         include: {
//           teacher: {
//             select: {
//               id: true,
//               firstname: true,
//               lastname: true,
//             },
//           },
//           courses: true,
//         },
//         skip,
//         take: limit,
//         orderBy: {
//           [sort]: order,
//         },
//       });

//       const total = await prisma.class.count();

//       return {
//         data: classes,
//         pagination: {
//           page,
//           limit,
//           total,
//           pages: Math.ceil(total / limit),
//         },
//       };
//     }

//     if (role === "TEACHER") {
//       const classes = await prisma.class.findMany({
//         where: { teacherId: user.id },
//         include: {
//           teacher: {
//             select: {
//               id: true,
//               firstname: true,
//               lastname: true,
//             },
//           },
//           courses: true,
//         },
//         skip,
//         take: limit,
//         orderBy: {
//           [sort]: order,
//         },
//       });

//       const total = await prisma.class.count({
//         where: { teacherId: user.id },
//       });

//       return {
//         data: classes,
//         pagination: {
//           page,
//           limit,
//           total,
//           pages: Math.ceil(total / limit),
//         },
//       };
//     }

//     if (role === "STUDENT") {
//       const userWithClass = await prisma.user.findUnique({
//         where: { id: user.id },
//         select: { classId: true },
//       });

//       if (!userWithClass?.classId) {
//         return {
//           data: [],
//           pagination: {
//             page,
//             limit,
//             total: 0,
//             pages: 0,
//           },
//         };
//       }

//       const studentClass = await prisma.class.findUnique({
//         where: { id: userWithClass.classId },
//         include: {
//           teacher: {
//             select: {
//               id: true,
//               firstname: true,
//               lastname: true,
//             },
//           },
//           courses: true,
//         },
//       });

//       return {
//         data: studentClass ? [studentClass] : [],
//         pagination: {
//           page,
//           limit,
//           total: studentClass ? 1 : 0,
//           pages: studentClass ? 1 : 0,
//         },
//       };
//     }

//     throw new Error("Invalid role");
//   } catch (error) {
//     console.error("Error fetching classes for user:", error);
//     throw error;
//   }
// };

export const getClassesForUser = async (user, options = {}) => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || "createdAt";
    const order = options.order || "desc";

    const skip = (page - 1) * limit;
    const role = user.role;

    if (role === "ADMIN") {
      const classes = await prisma.class.findMany({
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
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
      });

      // add studentCount
      const classesWithCount = await Promise.all(
        classes.map(async (cls) => {
          const studentCount = await prisma.user.count({
            where: { classId: cls.id },
          });
          return { ...cls, studentCount };
        })
      );

      const total = await prisma.class.count();

      return {
        data: classesWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    if (role === "TEACHER") {
      const classes = await prisma.class.findMany({
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
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
      });

      const classesWithCount = await Promise.all(
        classes.map(async (cls) => {
          const studentCount = await prisma.user.count({
            where: { classId: cls.id },
          });
          return { ...cls, studentCount };
        })
      );

      const total = await prisma.class.count({
        where: { teacherId: user.id },
      });

      return {
        data: classesWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    if (role === "STUDENT") {
      const userWithClass = await prisma.user.findUnique({
        where: { id: user.id },
        select: { classId: true },
      });

      if (!userWithClass?.classId) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
          },
        };
      }

      const studentClass = await prisma.class.findUnique({
        where: { id: userWithClass.classId },
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

      return {
        data: studentClass ? [studentClass] : [],
        pagination: {
          page,
          limit,
          total: studentClass ? 1 : 0,
          pages: studentClass ? 1 : 0,
        },
      };
    }

    throw new Error("Invalid role");
  } catch (error) {
    console.error("Error fetching classes for user:", error);
    throw error;
  }
};
