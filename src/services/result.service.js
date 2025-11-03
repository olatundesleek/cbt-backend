import prisma from "../config/prisma.js";

// Helper function to check if user can view results
function canViewResults(session, user, test) {
  // For TEST type, results are always visible after completion
  if (test.type === "TEST" && session.status === "COMPLETED") {
    return true;
  }

  // For EXAM type
  if (test.type === "EXAM") {
    // Must be completed first
    if (session.status !== "COMPLETED") {
      return false;
    }

    // Admin can always view
    if (user.role === "ADMIN") {
      return true;
    }

    // Others need showResult to be true
    return test.showResult === true;
  }

  return false;
}

// Helper to calculate stats for a course
async function calculateCourseStats(courseId, studentId) {
  const tests = await prisma.test.findMany({
    where: { courseId },
    include: {
      sessions: {
        where: { studentId },
        include: { answers: true },
      },
    },
  });

  const stats = {
    totalTests: tests.length,
    testsAttempted: 0,
    totalScore: 0,
    averageScore: 0,
    highestScore: 0,
    completedTests: 0,
  };

  tests.forEach((test) => {
    if (test.sessions.length > 0) {
      stats.testsAttempted++;
      const session = test.sessions[0];
      if (session.endedAt) {
        stats.completedTests++;
        const score = session.score || 0;
        stats.totalScore += score;
        stats.highestScore = Math.max(stats.highestScore, score);
      }
    }
  });

  stats.averageScore =
    stats.completedTests > 0 ? stats.totalScore / stats.completedTests : 0;

  return stats;
}

export async function getSessionResult(sessionId, user) {
  const session = await prisma.testSession.findUnique({
    where: { id: parseInt(sessionId) },
    include: {
      test: true,
      student: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          class: true,
        },
      },
      answers: {
        include: { question: true },
      },
    },
  });

  if (!session) throw new Error("Session not found");

  // Check authorization
  if (user.role === "STUDENT" && session.studentId !== user.id) {
    throw new Error("Not authorized to view this result");
  }

  if (user.role === "TEACHER") {
    const authorized = await prisma.course.findFirst({
      where: {
        id: session.test.courseId,
        teacherId: user.id,
      },
    });
    if (!authorized) throw new Error("Not authorized to view this result");
  }

  const canView = canViewResults(session, user, session.test);
  const response = {
    session: {
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      score: session.score,
      status: session.status,
    },
    student: session.student,
    test: {
      id: session.test.id,
      title: session.test.title,
      type: session.test.type,
      showResult: session.test.showResult,
    },
    answers: canView ? session.answers : null,
    canViewAnswers: canView,
  };

  return response;
}

export async function getTestResults(testId, user, options = {}) {
  const { page = 1, limit = 10, sort = "date", order = "desc" } = options;

  const test = await prisma.test.findUnique({
    where: { id: parseInt(testId) },
  });
  if (!test) throw new Error("Test not found");

  // Check authorization
  if (user.role === "TEACHER") {
    const authorized = await prisma.course.findFirst({
      where: {
        id: test.courseId,
        teacherId: user.id,
      },
    });
    if (!authorized) throw new Error("Not authorized to view these results");
  }

  const where = { testId: parseInt(testId) };
  const total = await prisma.testSession.count({ where });

  const orderBy = {
    ...(sort === "score" && { score: order }),
    ...(sort === "date" && { endedAt: order }),
    ...(sort === "student" && { student: { firstname: order } }),
  };

  const sessions = await prisma.testSession.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          class: true,
        },
      },
      answers: test.showResult
        ? {
            include: { question: true },
          }
        : false,
    },
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    test,
    sessions: sessions.map((session) => ({
      ...session,
      answers: canViewResults(session, user, test) ? session.answers : null,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getAllResults(user, filters = {}) {
  const {
    testId,
    courseId,
    classId,
    studentId,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sort = "date",
    order = "desc",
    search,
  } = filters;

  const where = {};

  if (testId) where.testId = parseInt(testId);
  if (studentId) where.studentId = parseInt(studentId);

  if (user.role === "TEACHER") {
    where.test = {
      courseId: {
        in: await prisma.course
          .findMany({
            where: { teacherId: user.id },
            select: { id: true },
          })
          .then((courses) => courses.map((c) => c.id)),
      },
    };
  }

  if (courseId) {
    where.test = {
      ...where.test,
      courseId: parseInt(courseId),
    };
  }

  if (classId) {
    where.student = {
      ...where.student,
      classId: parseInt(classId),
    };
  }

  if (startDate || endDate) {
    where.endedAt = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };
  }

  if (search) {
    where.student = {
      ...where.student,
      OR: [
        { firstname: { contains: search, mode: "insensitive" } },
        { lastname: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const total = await prisma.testSession.count({ where });

  const orderBy = {
    ...(sort === "score" && { score: order }),
    ...(sort === "date" && { endedAt: order }),
    ...(sort === "student" && { student: { firstname: order } }),
    ...(sort === "course" && { test: { course: { title: order } } }),
  };

  const sessions = await prisma.testSession.findMany({
    where,
    include: {
      test: {
        include: {
          course: true,
        },
      },
      student: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          class: true,
        },
      },
      answers: {
        include: { question: true },
      },
    },
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    sessions: sessions.map((session) => ({
      ...session,
      answers: canViewResults(session, user, session.test)
        ? session.answers
        : null,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getStudentCourseResults(user, options = {}) {
  if (user.role !== "STUDENT") {
    throw new Error("Only students can access this endpoint");
  }

  const { courseId, startDate, endDate, limit, testType = "ALL" } = options;

  // Get student's class and enrolled courses
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      class: {
        include: {
          courses: true,
        },
      },
    },
  });

  if (!student.class) {
    throw new Error("Student not assigned to any class");
  }

  // Get course IDs
  const courseIds = courseId
    ? [parseInt(courseId)]
    : student.class.courses.map((c) => c.id);

  // Apply limit to number of courses if provided
  const limitedCourseIds = limit ? courseIds.slice(0, limit) : courseIds;

  const results = [];

  for (const cid of limitedCourseIds) {
    const course = await prisma.course.findUnique({
      where: { id: cid },
      include: {
        tests: {
          where: {
            ...(testType !== "ALL" && { type: testType }),
            ...(startDate && { startTime: { gte: new Date(startDate) } }),
            ...(endDate && { endTime: { lte: new Date(endDate) } }),
          },
          orderBy: { startTime: "desc" }, // newest first
          take: limit ? limit : undefined, // also limit tests per course
          include: {
            sessions: {
              where: { studentId: user.id },
              include: {
                answers: {
                  include: { question: true },
                },
              },
            },
          },
        },
      },
    });

    const stats = await calculateCourseStats(cid, user.id);

    results.push({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
      },
      stats,
      tests: course.tests.map((test) => ({
        id: test.id,
        title: test.title,
        type: test.type,
        session: test.sessions[0]
          ? {
              score: test.sessions[0].score,
              startedAt: test.sessions[0].startedAt,
              endedAt: test.sessions[0].endedAt,
              answers: canViewResults(test.sessions[0], user, test)
                ? test.sessions[0].answers
                : null,
            }
          : null,
      })),
    });
  }

  // Calculate overall stats
  const overallStats = {
    totalCourses: results.length,
    totalTests: results.reduce((sum, r) => sum + r.stats.totalTests, 0),
    testsCompleted: results.reduce((sum, r) => sum + r.stats.completedTests, 0),
    averageScore:
      results.length > 0
        ? results.reduce((sum, r) => sum + r.stats.averageScore, 0) /
          results.length
        : 0,
    pendingTests: results.reduce(
      (sum, r) => sum + (r.stats.totalTests - r.stats.testsAttempted),
      0
    ),
  };

  return {
    student: {
      id: student.id,
      name: `${student.firstname} ${student.lastname}`,
      class: {
        id: student.class.id,
        className: student.class.className,
      },
    },
    courses: results,
    overallStats,
  };
}

export async function toggleResultRelease(testId, showResult, user) {
  if (user.role !== "ADMIN") {
    throw new Error("Only administrators can toggle result visibility");
  }

  const test = await prisma.test.findUnique({
    where: { id: parseInt(testId) },
  });

  if (!test) {
    throw new Error("Test not found");
  }

  if (test.type === "TEST") {
    throw new Error(
      "Cannot toggle visibility for TEST type - results are always visible"
    );
  }

  const updated = await prisma.test.update({
    where: { id: parseInt(testId) },
    data: { showResult },
  });

  return updated;
}
