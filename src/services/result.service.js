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
      // answers: canViewResults(session, user, session.test)
      //   ? session.answers
      //   : null,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

// export async function getStudentCourseResults(user, options = {}) {
//   if (user.role !== "STUDENT") {
//     throw new Error("Only students can access this endpoint");
//   }

//   const {
//     courseId, // optional: only fetch this course if provided
//     startDate,
//     endDate,
//     testLimit, // optional: limit number of tests per course
//     testType = "ALL",
//   } = options;

//   // Get student's class and enrolled courses
//   const student = await prisma.user.findUnique({
//     where: { id: user.id },
//     include: {
//       class: {
//         include: { courses: true },
//       },
//     },
//   });

//   if (!student.class) {
//     throw new Error("Student not assigned to any class");
//   }

//   // Get course IDs: either a single courseId or all courses for the class
//   const courseIds = courseId
//     ? [parseInt(courseId)]
//     : student.class.courses.map((c) => c.id);

//   const results = [];

//   for (const cid of courseIds) {
//     const course = await prisma.course.findUnique({
//       where: { id: cid },
//       include: {
//         tests: {
//           where: {
//             ...(testType !== "ALL" && { type: testType }),
//             ...(startDate && { startTime: { gte: new Date(startDate) } }),
//             ...(endDate && { endTime: { lte: new Date(endDate) } }),
//           },
//           orderBy: { startTime: "desc" },
//           take: testLimit ?? undefined, // only limit tests if testLimit is provided
//           include: {
//             sessions: {
//               where: { studentId: user.id },
//               include: { answers: { include: { question: true } } },
//             },
//           },
//         },
//       },
//     });

//     const validTests = course.tests.filter(
//       (test) => test.sessions && test.sessions.length > 0
//     );

//     const totalTests = course.tests.length;
//     const completedTests = validTests.length;

//     const visibleTests = validTests.filter(
//       (test) => test.showResult === true || test.type === "TEST"
//     );

//     const visibleScores = visibleTests.map((t) => t.sessions[0]?.score || 0);
//     const averageScore =
//       visibleScores.length > 0
//         ? visibleScores.reduce((a, b) => a + b, 0) / visibleScores.length
//         : 0;

//     const stats = { totalTests, completedTests, averageScore };

//     if (validTests.length > 0) {
//       results.push({
//         course: {
//           id: course.id,
//           title: course.title,
//           description: course.description,
//         },
//         stats,
//         tests: validTests.map((test) => {
//           const session = test.sessions[0]; // latest session
//           const isVisible = test.showResult === true || test.type === "TEST";
//           const score = isVisible ? session?.score ?? null : "unreleased";

//           let status = null;
//           if (!isVisible) {
//             status = "unreleased";
//           } else if (session) {
//             if (session.status === "IN_PROGRESS") {
//               status = "IN_PROGRESS";
//             } else if (session.status === "COMPLETED") {
//               status = session.score >= test.passMark ? "PASSED" : "FAILED";
//             } else {
//               status = session.status;
//             }
//           }

//           return {
//             id: test.id,
//             title: test.title,
//             type: test.type,
//             session: session
//               ? {
//                   score,
//                   status,
//                   startedAt: session.startedAt,
//                   endedAt: session.endedAt,
//                 }
//               : null,
//           };
//         }),
//       });
//     }
//   }

//   const overallStats = {
//     totalCourses: results.length,
//     totalTests: results.reduce((sum, r) => sum + r.stats.totalTests, 0),
//     testsCompleted: results.reduce((sum, r) => sum + r.stats.completedTests, 0),
//     averageScore:
//       results.length > 0
//         ? results.reduce((sum, r) => sum + r.stats.averageScore, 0) /
//           results.length
//         : 0,
//   };

//   return {
//     student: {
//       id: student.id,
//       name: `${student.firstname} ${student.lastname}`,
//       class: {
//         id: student.class.id,
//         className: student.class.className,
//       },
//     },
//     courses: results,
//     overallStats,
//   };
// }

// export async function getStudentCourseResults(user, options = {}) {
//   if (user.role !== "STUDENT") {
//     throw new Error("Only students can access this endpoint");
//   }

//   const {
//     courseId,    // optional: filter by specific course
//     startDate,   // optional: start date filter
//     endDate,     // optional: end date filter
//     testLimit,   // optional: limit number of tests per course
//     testType = "ALL", // optional: test type filter
//   } = options;

//   // Fetch student with class info
//   const student = await prisma.user.findUnique({
//     where: { id: user.id },
//     include: {
//       class: {
//         include: { courses: true },
//       },
//     },
//   });

//   if (!student.class) {
//     throw new Error("Student not assigned to any class");
//   }

//   // Fetch all sessions for this student with optional filters
//   const sessions = await prisma.testSession.findMany({
//     where: {
//       studentId: user.id,
//       test: {
//         ...(courseId && { courseId: parseInt(courseId) }),
//         ...(testType !== "ALL" && { type: testType }),
//         ...(startDate && { startTime: { gte: new Date(startDate) } }),
//         ...(endDate && { endTime: { lte: new Date(endDate) } }),
//       },
//     },
//     orderBy: { startedAt: "desc" },
//     include: {
//       test: {
//         include: {
//           course: true,
//         },
//       },
//       answers: { include: { question: true } },
//     },
//   });

//   // Group sessions by course
//   const resultsByCourse: Record<number, any> = {};

//   sessions.forEach((session) => {
//     const courseId = session.test.course.id;
//     if (!resultsByCourse[courseId]) {
//       resultsByCourse[courseId] = {
//         course: session.test.course,
//         sessions: [],
//       };
//     }
//     resultsByCourse[courseId].sessions.push(session);
//   });

//   // Prepare final results
//   const results = Object.values(resultsByCourse).map(({ course, sessions }) => {
//     const totalTests = sessions.length;
//     const completedTests = sessions.filter(s => s.status === "COMPLETED").length;

//     const visibleScores = sessions
//       .filter(s => s.test.showResult || s.test.type === "TEST")
//       .map(s => s.score ?? 0);

//     const averageScore =
//       visibleScores.length > 0
//         ? visibleScores.reduce((a, b) => a + b, 0) / visibleScores.length
//         : 0;

//     return {
//       course: {
//         id: course.id,
//         title: course.title,
//         description: course.description,
//       },
//       stats: { totalTests, completedTests, averageScore },
//       tests: sessions.map((session) => {
//         const isVisible = session.test.showResult || session.test.type === "TEST";
//         const score = isVisible ? session.score ?? null : "unreleased";

//         let status: string | null = null;
//         if (!isVisible) {
//           status = "unreleased";
//         } else if (session.status === "IN_PROGRESS") {
//           status = "IN_PROGRESS";
//         } else if (session.status === "COMPLETED") {
//           status = session.score! >= session.test.passMark ? "PASSED" : "FAILED";
//         } else {
//           status = session.status;
//         }

//         return {
//           id: session.test.id,
//           title: session.test.title,
//           type: session.test.type,
//           session: {
//             score,
//             status,
//             startedAt: session.startedAt,
//             endedAt: session.endedAt,
//           },
//         };
//       }),
//     };
//   });

//   // Compute overall stats
//   const overallStats = {
//     totalCourses: results.length,
//     totalTests: results.reduce((sum, r) => sum + r.stats.totalTests, 0),
//     testsCompleted: results.reduce((sum, r) => sum + r.stats.completedTests, 0),
//     averageScore:
//       results.length > 0
//         ? results.reduce((sum, r) => sum + r.stats.averageScore, 0) / results.length
//         : 0,
//   };

//   return {
//     student: {
//       id: student.id,
//       name: `${student.firstname} ${student.lastname}`,
//       class: {
//         id: student.class.id,
//         className: student.class.className,
//       },
//     },
//     courses: results,
//     overallStats,
//   };
// }

// export async function getStudentCourseResults(user, options = {}) {
//   if (user.role !== "STUDENT") {
//     throw new Error("Only students can access this endpoint");
//   }

//   const {
//     courseId, // optional: filter by specific course
//     startDate, // optional: start date filter
//     endDate, // optional: end date filter
//     testLimit, // optional: limit number of recent tests per course
//     testType = "ALL", // optional: test type filter
//   } = options;

//   console.log("limit is:", testLimit);
//   // Fetch student with class info
//   const student = await prisma.user.findUnique({
//     where: { id: user.id },
//     include: {
//       class: {
//         include: { courses: true },
//       },
//     },
//   });

//   if (!student.class) {
//     throw new Error("Student not assigned to any class");
//   }

//   // Fetch all sessions for this student with optional filters
//   const sessions = await prisma.testSession.findMany({
//     where: {
//       studentId: user.id,
//       test: {
//         ...(courseId && { courseId: parseInt(courseId) }),
//         ...(testType !== "ALL" && { type: testType }),
//         ...(startDate && { startTime: { gte: new Date(startDate) } }),
//         ...(endDate && { endTime: { lte: new Date(endDate) } }),
//       },
//     },
//     orderBy: { startedAt: "desc" }, // ensures most recent first
//     include: {
//       test: {
//         include: {
//           course: true,
//         },
//       },
//       answers: { include: { question: true } },
//     },
//   });

//   // Group sessions by course
//   const resultsByCourse = {};

//   sessions.forEach((session) => {
//     const cId = session.test.course.id;
//     if (!resultsByCourse[cId]) {
//       resultsByCourse[cId] = {
//         course: session.test.course,
//         sessions: [],
//       };
//     }
//     resultsByCourse[cId].sessions.push(session);
//   });

//   // Prepare final results with optional limit
//   const results = Object.values(resultsByCourse).map(({ course, sessions }) => {
//     // Sort sessions by most recent
//     const sortedSessions = sessions.sort(
//       (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
//     );

//     // Apply testLimit only if provided
//     const limitedSessions = testLimit
//       ? sortedSessions.slice(0, testLimit)
//       : sortedSessions;

//     const totalTests = sessions.length; // total sessions for stats
//     const completedTests = sessions.filter(
//       (s) => s.status === "COMPLETED"
//     ).length;

//     const visibleScores = limitedSessions
//       .filter((s) => s.test.showResult || s.test.type === "TEST")
//       .map((s) => s.score || 0);

//     const averageScore =
//       visibleScores.length > 0
//         ? visibleScores.reduce((a, b) => a + b, 0) / visibleScores.length
//         : 0;

//     return {
//       course: {
//         id: course.id,
//         title: course.title,
//         description: course.description,
//       },
//       stats: { totalTests, completedTests, averageScore },
//       tests: limitedSessions.map((session) => {
//         const isVisible =
//           session.test.showResult || session.test.type === "TEST";
//         const score = isVisible ? session.score || null : "unreleased";

//         let status = null;
//         if (!isVisible) status = "unreleased";
//         else if (session.status === "IN_PROGRESS") status = "IN_PROGRESS";
//         else if (session.status === "COMPLETED") {
//           status = session.score >= session.test.passMark ? "PASSED" : "FAILED";
//         } else status = session.status;

//         return {
//           id: session.test.id,
//           title: session.test.title,
//           type: session.test.type,
//           session: {
//             id: session.id,
//             score,
//             status,
//             startedAt: session.startedAt,
//             endedAt: session.endedAt,
//           },
//         };
//       }),
//     };
//   });

//   // Compute overall stats
//   const overallStats = {
//     totalCourses: results.length,
//     totalTests: results.reduce((sum, r) => sum + r.stats.totalTests, 0),
//     testsCompleted: results.reduce((sum, r) => sum + r.stats.completedTests, 0),
//     averageScore:
//       results.length > 0
//         ? results.reduce((sum, r) => sum + r.stats.averageScore, 0) /
//           results.length
//         : 0,
//   };
//   console.log(results);
//   return {
//     student: {
//       id: student.id,
//       name: `${student.firstname} ${student.lastname}`,
//       class: {
//         id: student.class.id,
//         className: student.class.className,
//       },
//     },
//     courses: results,
//     overallStats,
//   };
// }

// export async function getStudentCourseResults(user, options = {}) {
//   if (user.role !== "STUDENT") {
//     throw new Error("Only students can access this endpoint");
//   }

//   const {
//     courseId, // optional: filter by specific course
//     startDate, // optional: start date filter
//     endDate, // optional: end date filter
//     testLimit, // optional: limit number of recent tests per course
//     testType = "ALL", // optional: test type filter
//   } = options;

//   console.log("limit is:", testLimit);

//   // === Fetch student with class info ===
//   const student = await prisma.user.findUnique({
//     where: { id: user.id },
//     include: {
//       class: {
//         include: { courses: true },
//       },
//     },
//   });

//   if (!student.class) {
//     throw new Error("Student not assigned to any class");
//   }

//   // === Fetch all sessions for this student with optional filters ===
//   const sessions = await prisma.testSession.findMany({
//     where: {
//       studentId: user.id,
//       test: {
//         ...(courseId && { courseId: parseInt(courseId) }),
//         ...(testType !== "ALL" && { type: testType }),
//         ...(startDate && { startTime: { gte: new Date(startDate) } }),
//         ...(endDate && { endTime: { lte: new Date(endDate) } }),
//       },
//     },
//     orderBy: { startedAt: "desc" },
//     include: {
//       test: { include: { course: true } },
//       answers: { include: { question: true } },
//     },
//   });

//   // === Group sessions by course ===
//   const resultsByCourse = {};
//   sessions.forEach((session) => {
//     const cId = session.test.course.id;
//     if (!resultsByCourse[cId]) {
//       resultsByCourse[cId] = {
//         course: session.test.course,
//         sessions: [],
//       };
//     }
//     resultsByCourse[cId].sessions.push(session);
//   });

//   // === Prepare final results per course ===
//   const results = Object.values(resultsByCourse).map(({ course, sessions }) => {
//     // Sort sessions by most recent
//     const sortedSessions = sessions.sort(
//       (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
//     );

//     // Apply testLimit if provided
//     const limitedSessions = testLimit
//       ? sortedSessions.slice(0, testLimit)
//       : sortedSessions;

//     const totalTests = sessions.length;
//     const completedTests = sessions.filter(
//       (s) => s.status?.toUpperCase() === "COMPLETED"
//     ).length;

//     // === Average score logic ===
//     // Include all TESTs and only EXAMs where showResult = true
//     const visibleScores = limitedSessions
//       .filter(
//         (s) =>
//           s.test.type === "TEST" ||
//           (s.test.type === "EXAM" && s.test.showResult)
//       )
//       .map((s) => s.score || 0);

//     const averageScore =
//       visibleScores.length > 0
//         ? visibleScores.reduce((a, b) => a + b, 0) / visibleScores.length
//         : 0;

//     // === Build each test's display data ===
//     const testResults = limitedSessions.map((session) => {
//       const { type, showResult, passMark } = session.test;
//       const testType = type?.toUpperCase();

//       let score;
//       let status;

//       if (testType === "EXAM" && !showResult) {
//         //  Exam results are hidden — mark as unreleased
//         score = "unreleased";
//         status = "unreleased";
//       } else {
//         // 🟢 Visible results (TEST or EXAM with showResult = true)
//         score = session.score ?? null;

//         if (session.status === "IN_PROGRESS") {
//           status = "IN_PROGRESS";
//         } else if (session.status?.toUpperCase() === "COMPLETED") {
//           const numericScore = Number(session.score);
//           const numericPassMark = Number(passMark);

//           if (isNaN(numericScore)) {
//             status = "ungraded";
//           } else {
//             status = numericScore >= numericPassMark ? "PASSED" : "FAILED";
//           }
//         } else {
//           status = session.status;
//         }
//       }

//       return {
//         id: session.test.id,
//         title: session.test.title,
//         type: session.test.type,
//         session: {
//           id: session.id,
//           score,
//           status,
//           startedAt: session.startedAt,
//           endedAt: session.endedAt,
//         },
//       };
//     });

//     return {
//       course: {
//         id: course.id,
//         title: course.title,
//         description: course.description,
//       },
//       stats: { totalTests, completedTests, averageScore },
//       tests: testResults,
//     };
//   });

//   // === Compute overall stats ===
//   const overallStats = {
//     totalCourses: results.length,
//     totalTests: results.reduce((sum, r) => sum + r.stats.totalTests, 0),
//     testsCompleted: results.reduce((sum, r) => sum + r.stats.completedTests, 0),
//     averageScore:
//       results.length > 0
//         ? results.reduce((sum, r) => sum + r.stats.averageScore, 0) /
//           results.length
//         : 0,
//   };

//   console.log(results);

//   // === Final return ===
//   return {
//     student: {
//       id: student.id,
//       name: `${student.firstname} ${student.lastname}`,
//       class: {
//         id: student.class.id,
//         className: student.class.className,
//       },
//     },
//     courses: results,
//     overallStats,
//   };
// }

export async function getStudentCourseResults(user, options = {}) {
  if (user.role !== "STUDENT") {
    throw new Error("Only students can access this endpoint");
  }

  const { courseId, startDate, endDate, testLimit, testType = "ALL" } = options;

  console.log("limit is:", testLimit);

  // === Fetch student with class info ===
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      class: { include: { courses: true } },
    },
  });

  if (!student.class) {
    throw new Error("Student not assigned to any class");
  }

  // === Fetch all sessions with filters ===
  const sessions = await prisma.testSession.findMany({
    where: {
      studentId: user.id,
      test: {
        ...(courseId && { courseId: parseInt(courseId) }),
        ...(testType !== "ALL" && { type: testType }),
        ...(startDate && { startTime: { gte: new Date(startDate) } }),
        ...(endDate && { endTime: { lte: new Date(endDate) } }),
      },
    },
    orderBy: { startedAt: "desc" },
    include: {
      test: { include: { course: true } },
      answers: { include: { question: true } },
    },
  });

  // === Group sessions by course ===
  const resultsByCourse = {};
  sessions.forEach((session) => {
    const cId = session.test.course.id;
    if (!resultsByCourse[cId]) {
      resultsByCourse[cId] = { course: session.test.course, sessions: [] };
    }
    resultsByCourse[cId].sessions.push(session);
  });

  // === Prepare final results per course ===
  const results = Object.values(resultsByCourse).map(({ course, sessions }) => {
    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
    );

    const limitedSessions = testLimit
      ? sortedSessions.slice(0, testLimit)
      : sortedSessions;

    // === Stats: exclude hidden exams (showResult=false) ===
    const totalTests = sessions.length;

    const completedTests = sessions.filter((s) => {
      const normalizedType = s.test.type.toUpperCase();
      const isHiddenExam = normalizedType === "EXAM" && !s.test.showResult;
      const isInProgress = s.status === "IN_PROGRESS";
      if (isHiddenExam || isInProgress) return false;
      return s.status?.toUpperCase() === "COMPLETED";
    }).length;

    const visibleScores = limitedSessions
      .filter((s) => {
        const normalizedType = s.test.type.toUpperCase();
        const isHiddenExam = normalizedType === "EXAM" && !s.test.showResult;
        const isInProgress = s.status === "IN_PROGRESS";
        return !isHiddenExam && !isInProgress;
      })
      .map((s) => Number(s.score) || 0);

    const averageScore =
      visibleScores.length > 0
        ? visibleScores.reduce((a, b) => a + b, 0) / visibleScores.length
        : 0;

    // === Build test results ===
    const testResults = limitedSessions.map((session) => {
      const normalizedType = session.test.type.toUpperCase();
      const isHiddenExam =
        normalizedType === "EXAM" && !session.test.showResult;
      const isInProgress = session.status === "IN_PROGRESS";

      // 🛑 Force unreleased if exam hidden OR test/exam in progress
      if (isHiddenExam || isInProgress) {
        return {
          id: session.test.id,
          title: session.test.title,
          type: session.test.type,
          session: {
            id: session.id,
            score: "unreleased",
            status: isInProgress ? "IN_PROGRESS" : "unreleased",
            startedAt: session.startedAt,
            endedAt: session.endedAt,
          },
        };
      }

      // 🟢 Completed visible test/exam
      let score = session.score ?? null;
      let status;

      if (session.status?.toUpperCase() === "COMPLETED") {
        const numericScore = Number(score);
        const numericPassMark = Number(session.test.passMark);

        if (isNaN(numericScore)) {
          status = "ungraded";
        } else {
          status = numericScore >= numericPassMark ? "PASSED" : "FAILED";
        }
      } else {
        status = session.status;
      }

      return {
        id: session.test.id,
        title: session.test.title,
        type: session.test.type,
        session: {
          id: session.id,
          score,
          status,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
        },
      };
    });

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
      },
      stats: { totalTests, completedTests, averageScore },
      tests: testResults,
    };
  });

  // === Overall stats ===
  const overallStats = {
    totalCourses: results.length,
    totalTests: results.reduce((sum, r) => sum + r.stats.totalTests, 0),
    testsCompleted: results.reduce((sum, r) => sum + r.stats.completedTests, 0),
    averageScore:
      results.length > 0
        ? results.reduce((sum, r) => sum + r.stats.averageScore, 0) /
          results.length
        : 0,
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
