import prisma from "../config/prisma.js";
import ExcelJS from "exceljs";
import pdf from "html-pdf-node";
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

export async function getStudentCourseResults(user, options = {}) {
  if (user.role !== "STUDENT") {
    throw new Error("Only students can access this endpoint");
  }

  const { courseId, startDate, endDate, testLimit, testType = "ALL" } = options;

  console.log("limit is:", testLimit);

  // === Fetch student with class info ===
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      username: true,
      // role: true,
      class: {
        select: {
          id: true,
          className: true,

          courses: true,
        },
      },
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

      //  Force unreleased if exam hidden OR test/exam in progress
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

      //  Completed visible test/exam
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

export async function generatePDF(results) {
  // Calculate average
  console.log("this is the result" + results);
  const totalScores = [];
  results.courses.forEach((c) => {
    c.tests.forEach((t) => {
      if (t.session?.score != null) totalScores.push(t.session.score);
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
                      <td>${c.course?.title ?? "N/A"}</td>
                      <td>${t.title ?? "N/A"}</td>
                      <td>${t.session?.score ?? "unreleased"}</td>
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
