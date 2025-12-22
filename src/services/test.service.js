import e from "express";
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

  if (!test) {
    const error = new Error();
    error.status = 404;
    error.details = "Test not found";
    throw error;
  }

  // Admin can access all tests
  if (user.role === "ADMIN") return true;

  // Teachers can access their own tests
  if (user.role === "TEACHER") {
    return test.createdBy === user.id;
  }

  // Students can only access tests in their class's courses
  if (user.role === "STUDENT") {
    const isStudentInClass = test.course.classes.some((class_) =>
      class_.students.some((student) => student.id === user.id)
    );
    return isStudentInClass;
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
    include: { teacher: true, questions: true },
  });

  if (!bank) {
    const error = new Error("unable to create test");
    error.details = "Question bank not found";
    throw error;
  }

  //  check if bank question is 0
  if (bank.questions.length === 0) {
    const error = new Error("unable to create test");
    error.details = "Question bank is empty";
    throw error;
  }

  if (bank.createdBy !== user.id && user.role !== "ADMIN") {
    const error = new Error("unable to create test");
    error.details = "You don't have permission to use this question bank";
    throw error;
  }

  // if userRole is TEACHER and status is being set to 'active', prevent it
  if (user.role === "TEACHER" && data.testState === "active") {
    const error = new Error("Unable to update test");
    error.details =
      "You don't have permission to activate the test, kindly schedule it instead";
    throw error;
  }

  // if userRole is TEACHER and status is being changed to 'completed', prevent it

  if (user.role === "TEACHER" && data.testState === "completed") {
    const error = new Error("Unable to update test");
    error.details =
      "You don't have permission to complete the test, kindly contact admin";
    throw error;
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

      const title = test?.course?.title || "Untitled"; // safely extract title
      const questionCount = test.bank._count;
      // Remove unwanted fields
      const {
        bankId,
        createdBy,
        bank,
        course,
        createdAt,
        updatedAt,
        showResult,
        id,
        // _count,
        ...safeTest
      } = test;

      // Return the test info with course title included
      return {
        ...safeTest,
        courseTitle: title,
        questionCount,
      };

    default:
      throw new Error("Invalid role");
  }
};

export const updateTest = async (testId, data, user) => {
  if (!(await canAccessTest(testId, user))) {
    const error = new Error("unable to update Test");
    error.details = "You don't have permission to update this test";
    throw error;
  }

  // Fetch current test
  const existingTest = await prisma.test.findUnique({
    where: { id: parseInt(testId) },
  });

  if (!existingTest) {
    const error = new Error("Test not found");
    error.details = "unable to update Test";
    throw error;
  }

  // Prevent teachers from updating active tests
  if (user.role === "TEACHER" && existingTest.testState === "active") {
    const error = new Error("Unable to update test");
    error.details =
      "You cannot update an active test. Contact admin if changes are required.";
    throw error;
  }

  // Check course if courseId is updated
  if (data.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(data.courseId) },
      include: { teacher: true },
    });

    if (!course) throw new Error("Course not found");
    if (course.teacherId !== user.id && user.role !== "ADMIN") {
      throw new Error(
        "You don't have permission to assign this course to the test"
      );
    }
  }

  // Check question bank if bankId is updated
  if (data.bankId) {
    const bank = await prisma.questionBank.findUnique({
      where: { id: parseInt(data.bankId) },
      include: { teacher: true, questions: true },
    });

    if (!bank) {
      const error = new Error("Unable to update test");
      error.details = "Question bank not found";
      throw error;
    }

    if (bank.questions.length === 0) {
      const error = new Error("Unable to update test");
      error.details = "Question bank is empty";
      throw error;
    }

    if (bank.createdBy !== user.id && user.role !== "ADMIN") {
      const error = new Error("Unable to update test");
      error.details = "You don't have permission to use this question bank";
      throw error;
    }
  }

  // Now update
  const test = await prisma.test.update({
    where: { id: parseInt(testId) },
    data,
    include: {
      course: { select: { title: true } },
      bank: { select: { questionBankName: true } },
    },
  });

  return test;
};

export const getTests = async (user, options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const sort = options.sort || "createdAt";
  const order = options.order || "desc";

  const skip = (page - 1) * limit;

  switch (user.role) {
    case "ADMIN": {
      const allTest = await prisma.test.findMany({
        include: {
          teacher: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              username: true,
            },
          },
          course: {
            select: {
              title: true,
              classes: true,
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
          _count: {
            select: {
              sessions: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
      });

      const total = await prisma.test.count();

      const data = allTest.map((test) => {
        const { teacher, ...safeTest } = test;

        return {
          ...safeTest,
          createdBy: teacher,
        };
      });

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    case "TEACHER": {
      const tests = await prisma.test.findMany({
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
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
      });

      const total = await prisma.test.count({
        where: {
          createdBy: user.id,
        },
      });

      return {
        data: tests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    case "STUDENT": {
      if (!user.classId) {
        const error = new Error("Unable to fetch tests");
        error.details = "You are not assigned to any class";
        throw error;
      }

      // Fetch all tests for the student's class where end date has not passed
      const tests = await prisma.test.findMany({
        where: {
          course: {
            classes: {
              some: {
                id: user.classId,
              },
            },
          },
          endTime: {
            gt: new Date(), // Only tests where endTime is in the future
          },
        },
        include: {
          teacher: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              username: true,
            },
          },
          course: {
            select: {
              title: true,
            },
          },
          sessions: {
            where: {
              studentId: user.id,
              status: "IN_PROGRESS", // only fetch in-progress sessions
            },
            select: {
              id: true,
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
        skip,
        take: limit,
        orderBy: {
          [sort]: order,
        },
      });

      const total = await prisma.test.count({
        where: {
          course: {
            classes: {
              some: {
                id: user.classId,
              },
            },
          },
          endTime: {
            gt: new Date(), // Only count tests where endTime is in the future
          },
        },
      });

      // Map session info into each test if there is an in-progress session
      const data = tests.map((test) => {
        const { bankId, showResult, teacher, createdBy, ...safeTest } = test;

        const inProgressSession = test.sessions[0]; // will be undefined if no in-progress session

        return {
          ...safeTest,
          createdBy: teacher,
          ...(inProgressSession
            ? { sessionId: inProgressSession.id, progress: "in-progress" }
            : {}),
        };
      });

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    default:
      throw new Error("Invalid role");
  }
};

export const deleteTest = async (testId, user) => {
  try {
    if (!(await canAccessTest(testId, user))) {
      throw new Error("You don't have permission to delete this test");
    }

    // you cannot delete an active test if your role is TEACHER

    // if userRole is TEACHER and status is being changed to 'completed', prevent it

    const data = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
    });

    if (
      (user.role === "TEACHER" && data.testState === "active") ||
      data.testState === "completed"
    ) {
      const error = new Error("Unable to delete test");
      error.details =
        "You don't have permission to delete an active or completed test, kindly contact admin";
      throw error;
    }

    await prisma.test.delete({
      where: { id: parseInt(testId) },
    });
  } catch (error) {
    console.log("Delete test error:", error);
    error.message = "Unable to delete test";
    throw error;
  }
};
