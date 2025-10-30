import prisma from "../config/prisma.js";

const canAccessTest = async (testId, user) => {
  const test = await prisma.test.findUnique({
    where: { id: parseInt(testId) },
    include: {
      course: {
        include: {
          classes: {
            include: {
              students: true,
            },
          },
        },
      },
    },
  });

  if (!test) throw new Error("Test not found");

  // Admin can access all tests
  if (user.role === "ADMIN") return true;

  // Teachers can access their own tests
  if (user.role === "TEACHER") {
    return test.createdBy === user.id;
  }

  // Students can only access active tests in their class's courses
  if (user.role === "STUDENT") {
    const isStudentInClass = test.course.classes.some((class_) =>
      class_.students.some((student) => student.id === user.id)
    );
    return isStudentInClass && test.isActive;
  }

  return false;
};

export const createTest = async (data, user) => {
  // Verify course exists and user has access
  const course = await prisma.course.findUnique({
    where: { id: parseInt(data.courseId) },
    include: { teacher: true },
  });

  if (!course) throw new Error("Course not found");
  if (course.teacherId !== user.id && user.role !== "ADMIN") {
    throw new Error(
      "You don't have permission to create tests for this course"
    );
  }

  // Verify question bank exists and user has access
  const bank = await prisma.questionBank.findUnique({
    where: { id: parseInt(data.bankId) },
    include: { teacher: true },
  });

  if (!bank) throw new Error("Question bank not found");
  if (bank.createdBy !== user.id && user.role !== "ADMIN") {
    throw new Error("You don't have permission to use this question bank");
  }

  // Create test
  const test = await prisma.test.create({
    data: {
      ...data,
      courseId: parseInt(data.courseId),
      bankId: parseInt(data.bankId),
      createdBy: user.id,
    },
    include: {
      course: {
        select: {
          title: true,
        },
      },
      bank: {
        select: {
          questionBankName: true,
        },
      },
    },
  });

  return test;
};

export const getTestById = async (testId, user) => {
  const test = await prisma.test.findUnique({
    where: { id: parseInt(testId) },
    include: {
      course: {
        select: {
          title: true,
          classes: {
            select: {
              className: true,
              _count: {
                select: {
                  students: true,
                },
              },
            },
          },
        },
      },
      bank: {
        select: {
          questionBankName: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
      },
      _count: {
        select: {
          sessions: true,
        },
      },
    },
  });

  if (!test) throw new Error("Test not found");

  switch (user.role) {
    case "ADMIN":
      return test;

    case "TEACHER":
      if (test.createdBy !== user.id) {
        throw new Error("You don't have permission to access this test");
      }
      return test;

    case "STUDENT":
      if (!user.classId) {
        throw new Error("You are not assigned to any class");
      }

      if (!test.isActive) {
        throw new Error("This test is not currently active");
      }

      // Check if student's class has access to this test's course
      const hasAccess = await prisma.class.findFirst({
        where: {
          id: user.classId,
          courses: {
            some: {
              id: test.courseId,
            },
          },
        },
      });

      if (!hasAccess) {
        throw new Error("You don't have access to this test");
      }

      // Return limited test info for students
      const { bankId, createdBy, ...safeTest } = test;
      return safeTest;

    default:
      throw new Error("Invalid role");
  }
};

export const updateTest = async (testId, data, user) => {
  if (!(await canAccessTest(testId, user))) {
    throw new Error("You don't have permission to update this test");
  }

  const test = await prisma.test.update({
    where: { id: parseInt(testId) },
    data,
    include: {
      course: {
        select: {
          title: true,
        },
      },
      bank: {
        select: {
          questionBankName: true,
        },
      },
    },
  });

  return test;
};

export const getTests = async (user) => {
  switch (user.role) {
    case "ADMIN":
      return prisma.test.findMany({
        include: {
          course: {
            select: {
              title: true,
              classes: true,
            },
          },
          bank: {
            select: {
              questionBankName: true,
              _count: {
                select: {
                  questions: true,
                },
              },
            },
          },
          _count: {
            select: {
              sessions: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    case "TEACHER":
      return prisma.test.findMany({
        where: {
          createdBy: user.id,
        },
        include: {
          course: {
            select: {
              title: true,
              classes: {
                select: {
                  className: true,
                  _count: {
                    select: {
                      students: true,
                    },
                  },
                },
              },
            },
          },
          bank: {
            select: {
              questionBankName: true,
              _count: {
                select: {
                  questions: true,
                },
              },
            },
          },
          _count: {
            select: {
              sessions: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    case "STUDENT":
      if (!user.classId) {
        throw new Error("You are not assigned to any class");
      }

      const tests = await prisma.test.findMany({
        where: {
          isActive: true,
          course: {
            classes: {
              some: {
                id: user.classId,
              },
            },
          },
        },
        include: {
          course: {
            select: {
              title: true,
            },
          },
          bank: {
            select: {
              _count: {
                select: {
                  questions: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Remove sensitive data for students
      return tests.map((test) => {
        const { bankId, createdBy, ...safeTest } = test;
        return safeTest;
      });

    default:
      throw new Error("Invalid role");
  }
};
