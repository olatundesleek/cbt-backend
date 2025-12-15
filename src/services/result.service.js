import prisma from "../config/prisma.js";
import ExcelJS from "exceljs";
import pdf from "html-pdf-node";
// Helper function to check if user can view results
function canViewResults(session, user, test) {
  const type = test.type.toUpperCase();

  // for test type
  if (type === "TEST") {
    // Must be completed first
    if (session.status !== "COMPLETED") {
      return false;
    }
  }
  // For EXAM type
  if (type === "EXAM") {
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
      test: {
        include: {
          teacher: true, // who created the test
          course: true,
        },
      },
      student: {
        select: { id: true, firstname: true, lastname: true, class: true },
      },
    },
  });

  if (!session) throw new Error("Session not found");

  // Exclude Practice results
  if (session.test.type.toUpperCase() === "PRACTICE") {
    throw new Error("Practice results are not viewable");
  }

  // Authorization checks
  if (user.role === "STUDENT" && session.studentId !== user.id) {
    throw new Error("Not authorized to view this result");
  }

  if (user.role === "TEACHER") {
    const authorized = await prisma.course.findFirst({
      where: { id: session.test.courseId, teacherId: user.id },
    });
    if (!authorized) throw new Error("Not authorized to view this result");
  }

  // Determine score and status
  let score = session.score;
  let status;

  if (user.role === "ADMIN") {
    // Admin can view everything
    if (session.status === "IN_PROGRESS") {
      status = "IN_PROGRESS";
      score = "IN_PROGRESS";
    } else if (session.status === "COMPLETED") {
      const numericScore = Number(score);
      const numericPassMark = Number(session.test.passMark);
      status = isNaN(numericScore)
        ? "ungraded"
        : numericScore >= numericPassMark
        ? "PASSED"
        : "FAILED";
    } else {
      status = session.status;
    }
  } else {
    // Students and teachers: show unreleased if showResult = false
    if (session.status === "IN_PROGRESS") {
      status = "IN_PROGRESS";
      score = "IN_PROGRESS";
    } else if (!session.test.showResult) {
      status = "unreleased";
      score = "unreleased";
    } else if (session.status === "COMPLETED") {
      const numericScore = Number(score);
      const numericPassMark = Number(session.test.passMark);
      status = isNaN(numericScore)
        ? "ungraded"
        : numericScore >= numericPassMark
        ? "PASSED"
        : "FAILED";
    } else {
      status = session.status;
    }
  }

  return {
    session: {
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      score,
      status,
    },
    student: session.student,
    test: {
      id: session.test.id,
      title: session.test.title,
      type: session.test.type,
      showResult: session.test.showResult,
      createdBy: session.test.teacher
        ? {
            id: session.test.teacher.id,
            name: `${session.test.teacher.firstname} ${session.test.teacher.lastname}`,
          }
        : null,
      passMark: session.test.passMark,
    },
    course: session.test.course,
  };
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

  let orderBy;
  if (sort === "score") {
    orderBy = [{ score: order }];
  } else if (sort === "student") {
    orderBy = [{ student: { firstname: order } }];
  } else if (sort === "date") {
    orderBy = [{ startedAt: order }];
  } else {
    // Default: sort by latest endedAt
    orderBy = [{ endedAt: "desc" }];
  }

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
    testType,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sort = "date",
    order = "desc",
    search,
  } = filters;

  const where = {
    test: { type: { not: "PRACTICE" } },
  };

  if (testId) where.testId = parseInt(testId);
  if (studentId) where.studentId = parseInt(studentId);

  if (user.role === "TEACHER") {
    const teacherCourseIds = await prisma.course
      .findMany({
        where: { teacherId: user.id },
        select: { id: true },
      })
      .then((courses) => courses.map((c) => c.id));

    where.test = { ...where.test, courseId: { in: teacherCourseIds } };
  }

  if (courseId) where.test = { ...where.test, courseId: parseInt(courseId) };
  if (testType && testType !== "ALL")
    where.test = { ...where.test, type: testType.toUpperCase() };
  if (classId) where.student = { ...where.student, classId: parseInt(classId) };

  if (startDate || endDate) {
    // Create date filter for completed sessions
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };

    // Combine date filter with other conditions using AND
    where.AND = [
      {
        OR: [
          { status: "IN_PROGRESS" },
          { status: "COMPLETED", endedAt: dateFilter },
        ],
      },
    ];
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

  // console.log("this is the total session minus practice" + total);

  let orderBy;

  if (sort === "score") {
    orderBy = { score: order };
  } else if (sort === "date") {
    orderBy = [{ endedAt: order }, { startedAt: order }];
  } else if (sort === "student") {
    orderBy = { student: { firstname: order } };
  } else if (sort === "course") {
    orderBy = { test: { course: { title: order } } };
  } else {
    // Default sort by most recent
    orderBy = { startedAt: order };
  }

  const sessions = await prisma.testSession.findMany({
    where,
    include: {
      test: { include: { course: true } },
      student: {
        select: { id: true, firstname: true, lastname: true, class: true },
      },
    },
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
  });

  // === Map sessions according to rules ===
  const mappedSessions = sessions.map((session) => {
    const type = session.test.type.toUpperCase();
    const inProgress = session.status === "IN_PROGRESS";
    const showResult = session.test.showResult;

    let score = session.score;
    let status;

    if (inProgress) {
      status = "IN_PROGRESS";
      score = "IN_PROGRESS";
    } else if (!showResult) {
      status = "unreleased";
      score = "unreleased";
    } else if (session.status === "COMPLETED") {
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
      student: session.student,
      course: session.test.course,
    };
  });

  // === Group by course ===
  const resultsByCourse = {};
  mappedSessions.forEach((t) => {
    const courseIdKey = t.course.id;
    if (!resultsByCourse[courseIdKey]) {
      resultsByCourse[courseIdKey] = {
        course: t.course,
        tests: [],
      };
    }
    resultsByCourse[courseIdKey].tests.push(t);
  });

  const courses = Object.values(resultsByCourse).map((c) => {
    const numericScores = c.tests
      .map((t) =>
        typeof t.session.score === "number" ? t.session.score : null
      )
      .filter((s) => s !== null);

    const totalTests = c.tests.length;
    const completedTests = numericScores.length;
    const totalScore = numericScores.reduce((a, b) => a + b, 0);
    const averageScore = completedTests ? totalScore / completedTests : 0;
    const highestScore = completedTests ? Math.max(...numericScores) : 0;
    const lowestScore = completedTests ? Math.min(...numericScores) : 0;

    return {
      course: c.course,
      stats: {
        totalTests,
        completedTests,
        averageScore,
        highestScore,
        lowestScore,
      },
      tests: c.tests,
    };
  });

  const allNumericScores = mappedSessions
    .map((s) => (typeof s.session.score === "number" ? s.session.score : null))
    .filter((s) => s !== null);

  const overallStats = {
    totalCourses: courses.length,
    totalTests: mappedSessions.length,
    testsCompleted: allNumericScores.length,
    averageScore: allNumericScores.length
      ? allNumericScores.reduce((a, b) => a + b, 0) / allNumericScores.length
      : 0,
    highestScore: allNumericScores.length ? Math.max(...allNumericScores) : 0,
    lowestScore: allNumericScores.length ? Math.min(...allNumericScores) : 0,
  };

  return {
    courses,
    overallStats,
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

  const {
    courseId,
    startDate,
    endDate,
    testLimit = 10,
    testType = "ALL",
    page = 1,
    limit = 10,
    sort = "date",
    order = "desc",
  } = options;

  console.log("this is the testType" + testType);
  // === Fetch student with class info ===
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      username: true,
      class: {
        select: {
          id: true,
          className: true,
        },
      },
    },
  });

  if (!student.class) throw new Error("Student not assigned to any class");

  // === Count total sessions ===
  const totalSessions = await prisma.testSession.count({
    where: {
      studentId: user.id,
      test: {
        ...(courseId && { courseId: parseInt(courseId) }),
        ...(testType !== "ALL" && { type: testType.toUpperCase() }),
        ...(startDate && { startTime: { gte: new Date(startDate) } }),
        ...(endDate && { endTime: { lte: new Date(endDate) } }),
      },
      test: { type: { not: "PRACTICE" } },
    },
  });

  // === Determine sorting ===
  let orderBy;
  if (sort === "score") {
    orderBy = [{ score: order }];
  } else if (sort === "date") {
    orderBy = [{ startedAt: order }];
  } else if (sort === "student") {
    orderBy = [{ student: { firstname: order } }];
  } else if (sort === "course") {
    orderBy = [{ test: { course: { title: order } } }];
  } else {
    // Default: sort by latest endedAt
    orderBy = [{ endedAt: "desc" }];
  }

  // === Fetch all sessions with filters ===
  const sessions = await prisma.testSession.findMany({
    where: {
      studentId: user.id,
      test: {
        ...(courseId && { courseId: parseInt(courseId) }),
        ...(testType !== "ALL" && { type: testType.toUpperCase() }),
        ...(startDate && { startTime: { gte: new Date(startDate) } }),
        ...(endDate && { endTime: { lte: new Date(endDate) } }),
      },
      test: { type: { not: "PRACTICE" } },
    },
    orderBy,
    include: {
      test: { include: { course: true } },
      answers: { include: { question: true } },
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  console.log("this is the total that sending sessions" + sessions.length);

  if (!sessions.length) {
    return {
      student: {
        id: student.id,
        name: `${student.firstname} ${student.lastname}`,
        class: { id: student.class.id, className: student.class.className },
      },
      courses: [],
      overallStats: {
        totalCourses: 0,
        totalTests: 0,
        testsCompleted: 0,
        averageScore: 0,
      },
      pagination: {
        page,
        limit,
        total: totalSessions,
        pages: Math.ceil(totalSessions / limit),
      },
    };
  }

  // === Helper to determine if session is hidden ===
  const isHiddenSession = (session) => {
    const type = session.test.type.toUpperCase();
    if (type === "PRACTICE") return true; // Always hide practice
    if ((type === "TEST" || type === "EXAM") && !session.test.showResult)
      return true;
    return false;
  };

  // === Group sessions by course ===
  const resultsByCourse = {};
  sessions.forEach((session) => {
    const cId = session.test.course.id;
    if (!resultsByCourse[cId])
      resultsByCourse[cId] = { course: session.test.course, sessions: [] };
    resultsByCourse[cId].sessions.push(session);
  });

  // === Build course results ===
  const results = Object.values(resultsByCourse).map(({ course, sessions }) => {
    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
    );

    // const limitedSessions = testLimit
    //   ? sortedSessions.slice(0, testLimit)
    //   : sortedSessions;

    const limitedSessions = sortedSessions;

    // Stats: total tests & completed tests (exclude practice)
    const totalTests = sessions.filter(
      (s) => s.test.type.toUpperCase() !== "PRACTICE"
    ).length;
    const completedTests = sessions.filter(
      (s) =>
        s.test.type.toUpperCase() !== "PRACTICE" && s.status === "COMPLETED"
    ).length;

    // Scores for average calculation (only completed, visible)
    const gradedScores = limitedSessions
      .filter((s) => !isHiddenSession(s) && s.status === "COMPLETED")
      .map((s) => Number(s.score) || 0);
    console.log("this is the graded scores" + gradedScores);
    console.log("this is the graded scores lenght" + gradedScores.length);

    const averageScore = gradedScores.length
      ? gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length
      : 0;

    // Map test results
    const testResults = limitedSessions
      .filter((s) => s.test.type.toUpperCase() !== "PRACTICE") // never return practice
      .map((session) => {
        const type = session.test.type.toUpperCase();
        const inProgress = session.status === "IN_PROGRESS";
        const hidden = isHiddenSession(session);

        let score = session.score;
        let status = session.status;

        if (hidden || inProgress) {
          score = "unreleased";
          status = inProgress ? "IN_PROGRESS" : "unreleased";
        } else if (session.status === "COMPLETED") {
          const numericScore = Number(session.score);
          const passMark = Number(session.test.passMark);
          if (isNaN(numericScore)) status = "ungraded";
          else status = numericScore >= passMark ? "PASSED" : "FAILED";
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
    console.log("this is the test results" + testResults.length);
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
    overallAverageScore: results.length
      ? results.reduce((sum, r) => sum + r.stats.averageScore, 0) /
        results.length
      : 0,
    averageScore: results.reduce((sum, r) => sum + r.stats.averageScore, 0),
  };

  return {
    student: {
      id: student.id,
      name: `${student.firstname} ${student.lastname}`,
      class: { id: student.class.id, className: student.class.className },
    },
    courses: results,
    overallStats,
    pagination: {
      page,
      limit,
      total: totalSessions,
      pages: Math.ceil(totalSessions / limit),
    },
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

  const updated = await prisma.test.update({
    where: { id: parseInt(testId) },
    data: { showResult },
  });

  return updated;
}

export async function generatePDF(results) {
  // Calculate average safely (ignore unreleased scores)
  const totalScores = [];
  results.courses.forEach((c) => {
    c.tests.forEach((t) => {
      const score = Number(t.session?.score);
      if (!isNaN(score)) totalScores.push(score);
    });
  });
  console.log("this is the total scores" + totalScores.length);
  console.log("this is the total scores" + totalScores);
  const averageScore =
    totalScores.length > 0
      ? (totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(2)
      : "N/A";

  // Build HTML
  const html = `
    <html>
    <head>
      <style>
        /* Reset */
        body, h1, h2, p, table { margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f6fa; color: #2c3e50; padding: 40px; }

        /* Container */
        .container { max-width: 900px; margin: auto; background: #fff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.1); }

        /* Header */
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 30px; color: #34495e; letter-spacing: 1px; }
        .header h2 { font-size: 18px; color: #7f8c8d; margin-top: 5px; font-weight: normal; }

        /* Student info */
        .info { text-align: center; margin-bottom: 30px; }
        .info p { font-size: 16px; color: #34495e; margin: 6px 0; }
        .info span { font-weight: 600; color: #2980b9; }

        /* Table styling */
        table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
        thead { background-color: #2980b9; color: #fff; font-weight: 600; }
        th, td { padding: 12px 15px; text-align: center; }
        tbody tr:nth-child(even) { background-color: #ecf0f1; }
        tbody tr:hover { background-color: #d6eaf8; transition: 0.3s; }
        tfoot td { font-weight: 600; background-color: #bdc3c7; }

        /* Footer */
        .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #7f8c8d; }

        /* Responsive */
        @media(max-width: 600px){
          body { padding: 20px; }
          .container { padding: 20px; }
          .info p { font-size: 14px; }
          table { font-size: 12px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Student Transcript</h1>
          <h2>Generated by CBT System</h2>
        </div>

        <div class="info">
          <p><span>Student:</span> ${results.student?.name ?? "N/A"}</p>
          <p><span>Class:</span> ${
            results.student?.class?.className ?? "N/A"
          }</p>
          <p><span>Date:</span> ${new Date().toLocaleDateString()}</p>
        </div>

        <table>
          <thead>
            <tr>
            <th>S/N</th>
              <th>Course</th>
              <th>Test</th>
              <th>Score</th>
              <th>Status</th>
              <th>Started At</th>
              <th>Ended At</th>
            </tr>
          </thead>
          <tbody>
            ${results.courses
              .map((c) =>
                c.tests
                  .map(
                    (t, index) => `<tr>
                      <td>${index + 1}</td>
                      <td>${c.course?.title ?? "N/A"}</td>
                      <td>${t.title ?? "N/A"}</td>
                      <td>${
                        t.session?.score != null
                          ? t.session.score
                          : "unreleased"
                      }</td>
                      <td>${t.session?.status ?? "unreleased"}</td>
                      <td>${
                        t.session?.startedAt
                          ? new Date(t.session.startedAt).toLocaleString()
                          : ""
                      }</td>
                      <td>${
                        t.session?.endedAt
                          ? new Date(t.session.endedAt).toLocaleString()
                          : ""
                      }</td>
                    </tr>`
                  )
                  .join("")
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">Average Score</td>
              <td colspan="4">${averageScore}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          Generated automatically by CBT System &copy; ${new Date().getFullYear()}
        </div>
      </div>
    </body>
  </html>
  `;

  const file = { content: html };
  const pdfBuffer = await pdf.generatePdf(file, { format: "A4" });
  return pdfBuffer;
}

export async function generateExcel(results) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Results");

  sheet.columns = [
    { header: "Course", key: "course", width: 30 },
    { header: "Test", key: "test", width: 30 },
    { header: "Score", key: "score", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Started At", key: "startedAt", width: 20 },
    { header: "Ended At", key: "endedAt", width: 20 },
  ];

  results.courses.forEach((c) => {
    c.tests.forEach((t) => {
      sheet.addRow({
        course: c.course.title,
        test: t.title,
        score: t.session?.score ?? "unreleased",
        status: t.session?.status ?? "unreleased",
        startedAt: t.session?.startedAt
          ? new Date(t.session.startedAt).toLocaleString()
          : "",
        endedAt: t.session?.endedAt
          ? new Date(t.session.endedAt).toLocaleString()
          : "",
      });
    });
  });

  return workbook;
}

export async function generateAllResultsPdf(user, filters) {
  // Get the results just like frontend used
  const results = await getAllResults(user, filters);

  // Compute average score
  const totalScores = [];
  results.courses.forEach((c) => {
    c.tests.forEach((t) => {
      if (typeof t.session.score === "number")
        totalScores.push(t.session.score);
    });
  });

  const averageScore =
    totalScores.length > 0
      ? (totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(2)
      : "N/A";

  // Build HTML
  const html = `
    <html>
    <head>
      <style>
        body, h1, p, table { margin:0; padding:0; font-family: 'Segoe UI', sans-serif; }
        .container { max-width:900px; margin:auto; padding:40px; background:#fff; border-radius:12px; }
        table { width:100%; border-collapse:collapse; margin-top:20px; }
        th, td { padding:12px; text-align:center; border:1px solid #ccc; }
        thead { background:#2980b9; color:#fff; font-weight:600; }
        tfoot { font-weight:600; background:#bdc3c7; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Student Transcript</h1>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Test</th>
              <th>Score</th>
              <th>Status</th>
              <th>Started At</th>
              <th>Ended At</th>
            </tr>
          </thead>
          <tbody>
            ${results.courses
              .map((c) =>
                c.tests
                  .map(
                    (t) => `<tr>
                      <td>${t.student?.firstname ?? ""} ${
                      t.student?.lastname ?? ""
                    }</td>
                      <td>${c.course.title}</td>
                      <td>${t.title}</td>
                      <td>${t.session.score ?? "unreleased"}</td>
                      <td>${t.session.status ?? "unreleased"}</td>
                      <td>${
                        t.session.startedAt
                          ? new Date(t.session.startedAt).toLocaleString()
                          : ""
                      }</td>
                      <td>${
                        t.session.endedAt
                          ? new Date(t.session.endedAt).toLocaleString()
                          : ""
                      }</td>
                    </tr>`
                  )
                  .join("")
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Average Score</td>
              <td colspan="4">${averageScore}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </body>
    </html>
  `;

  const file = { content: html };
  const pdfBuffer = await pdf.generatePdf(file, { format: "A4" });
  return pdfBuffer;
}

/**
 * Fetch results based on filters and user, then generate Excel
 */
export async function generateAllResultsExcel(user, filters) {
  const results = await getAllResults(user, filters);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Results");

  sheet.columns = [
    { header: "Student", key: "student", width: 30 },
    { header: "Course", key: "course", width: 30 },
    { header: "Test", key: "test", width: 30 },
    { header: "Score", key: "score", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Started At", key: "startedAt", width: 20 },
    { header: "Ended At", key: "endedAt", width: 20 },
  ];

  results.courses.forEach((c) => {
    c.tests.forEach((t) => {
      sheet.addRow({
        student: `${t.student?.firstname ?? ""} ${t.student?.lastname ?? ""}`,
        course: c.course.title,
        test: t.title,
        score: t.session.score ?? "unreleased",
        status: t.session.status ?? "unreleased",
        startedAt: t.session.startedAt
          ? new Date(t.session.startedAt).toLocaleString()
          : "",
        endedAt: t.session.endedAt
          ? new Date(t.session.endedAt).toLocaleString()
          : "",
      });
    });
  });

  return workbook;
}
