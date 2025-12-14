import prisma from "../config/prisma.js";
import { getStudentCourseResults } from "../services/result.service.js";

// export const fetchDashboardData = async (role, userId) => {
//   try {
//     let dashboardData = {};

//     // 🔹 ADMIN DASHBOARD
//     if (role === "ADMIN") {
//       dashboardData = {
//         adminName: await prisma.user.findUnique({
//           where: { id: userId },
//           select: { firstname: true, lastname: true },
//         }),
//         studentCount: await prisma.user.count({
//           where: { role: "STUDENT" },
//         }),
//         teacherCount: await prisma.user.count({
//           where: { role: "TEACHER" },
//         }),
//         testCount: await prisma.test.count(),
//         classCount: await prisma.class.count(),
//         courseCount: await prisma.course.count(),
//       };
//     }

//     // 🔹 TEACHER DASHBOARD
//     else if (role === "TEACHER") {
//       dashboardData = {
//         teacherName: await prisma.user.findUnique({
//           where: { id: userId },
//           select: { firstname: true, lastname: true },
//         }),
//         classCount: await prisma.class.count({
//           where: { teacherId: userId },
//         }),
//         studentCount: await prisma.user.count({
//           where: {
//             role: "STUDENT",
//             class: { teacherId: userId },
//           },
//         }),
//         testCount: await prisma.test.count({
//           where: { teacherId: userId },
//         }),
//         courseCount: await prisma.course.count({
//           where: { teacherId: userId },
//         }),
//       };
//     }

//     // name
//     // test
//     // receent result
//     // notifications
//     // 🔹 STUDENT DASHBOARD
//     else if (role === "STUDENT") {
//       const student = await prisma.user.findUnique({
//         where: { id: userId },
//         include: { class: true },
//       });

//       if (!student.classId) {
//         const error = new Error("Unable to fetch dashboard data");
//         error.details = "Student not assigned to any class";
//         throw error;
//       }

//       const classId = student.classId;

//       // Fetch active tests (including question counts)
//       const activeTestsRaw = await prisma.test.findMany({
//         where: {
//           testState: "active",
//           course: {
//             classes: { some: { id: classId } },
//           },
//         },
//         select: {
//           id: true,
//           title: true,
//           type: true,
//           attemptsAllowed: true,
//           duration: true,
//           testState: true,
//           startTime: true,
//           endTime: true,
//           course: { select: { title: true } },
//           bank: {
//             select: {
//               _count: {
//                 select: { questions: true },
//               },
//             },
//           },
//         },
//       });

//       // find a test session where studentId = userId and testId = test.id, we want to update the test progress in the returned active tests
//       const testProgress = await prisma.testSession.findMany({
//         where: {
//           studentId: userId,
//           testId: { in: activeTests.map((test) => test.id) },
//         },
//       });

//       // Flatten activeTests to remove bank and add totalQuestions
//       const activeTests = activeTestsRaw.map((test) => ({
//         ...test,
//         totalQuestions: test.bank?._count?.questions || 0,
//         bank: undefined, // remove bank field
//       }));

//       dashboardData = {
//         studentName: `${student.firstname} ${student.lastname}`,
//         className: student.class.className,
//         totalTests: await prisma.test.count({
//           where: {
//             course: {
//               classes: { some: { id: classId } },
//             },
//           },
//         }),
//         activeTests,
//         recentResults: await getStudentCourseResults(
//           { id: userId, role: "STUDENT" },
//           { limit: 5 }
//         ),
//         completedTests: await prisma.testSession.count({
//           where: {
//             studentId: userId,
//             status: "COMPLETED",
//           },
//         }),
//         inProgressTests: await prisma.testSession.count({
//           where: {
//             studentId: userId,
//             status: "IN_PROGRESS",
//           },
//         }),
//         totalScore: await prisma.testSession.aggregate({
//           where: { studentId: userId },
//           _sum: { score: true },
//         }),
//       };
//     }

//     return dashboardData;
//   } catch (error) {
//     console.error("Error fetching dashboard data:", error);
//     throw error;
//   }
// };

export const fetchDashboardData = async (role, userId) => {
  try {
    let dashboardData = {};

    // 🔹 ADMIN DASHBOARD
    if (role === "ADMIN") {
      dashboardData = {
        adminName: await prisma.user.findUnique({
          where: { id: userId },
          select: { firstname: true, lastname: true },
        }),
        studentCount: await prisma.user.count({ where: { role: "STUDENT" } }),
        teacherCount: await prisma.user.count({ where: { role: "TEACHER" } }),
        adminCount: await prisma.user.count({ where: { role: "ADMIN" } }),
        testCount: await prisma.test.count(),
        classCount: await prisma.class.count(),
        courseCount: await prisma.course.count(),
        activeSessionCount: await prisma.testSession.count({
          where: { status: "IN_PROGRESS" },
        }),
      };
    }

    // 🔹 TEACHER DASHBOARD
    else if (role === "TEACHER") {
      dashboardData = {
        teacherName: await prisma.user.findUnique({
          where: { id: userId },
          select: { firstname: true, lastname: true },
        }),
        classCount: await prisma.class.count({ where: { teacherId: userId } }),
        studentCount: await prisma.user.count({
          where: { role: "STUDENT", class: { teacherId: userId } },
        }),
        testCount: await prisma.test.count({ where: { createdBy: userId } }),
        courseCount: await prisma.course.count({
          where: { teacherId: userId },
        }),
      };
    }

    // 🔹 STUDENT DASHBOARD
    else if (role === "STUDENT") {
      // Fetch student details once
      const student = await prisma.user.findUnique({
        where: { id: userId },
        include: { class: true },
      });

      if (!student.classId) {
        const error = new Error("Unable to fetch dashboard data");
        error.details = "Student not assigned to any class";
        throw error;
      }

      const classId = student.classId;

      // Fetch active tests with question counts
      const activeTestsRaw = await prisma.test.findMany({
        where: {
          testState: "active",
          course: { classes: { some: { id: classId } } },
          endTime: {
            gt: new Date(), // Only tests where endTime is in the future
          },
        },
        select: {
          id: true,
          title: true,
          type: true,
          attemptsAllowed: true,
          duration: true,
          testState: true,
          startTime: true,
          endTime: true,
          course: { select: { title: true } },
          bank: { select: { _count: { select: { questions: true } } } },
        },
      });

      // Flatten activeTests to remove bank and add totalQuestions
      const activeTests = activeTestsRaw.map((test) => ({
        ...test,
        totalQuestions: test.bank?._count?.questions || 0,
        bank: undefined,
      }));

      // Fetch IN_PROGRESS sessions for active tests
      const inProgressSessions = await prisma.testSession.findMany({
        where: {
          studentId: userId,
          testId: { in: activeTests.map((test) => test.id) },
          status: "IN_PROGRESS",
        },
        select: { id: true, testId: true },
      });

      // Map testId → session info
      const sessionMap = new Map(
        inProgressSessions.map((s) => [s.testId, s.id])
      );

      // Merge session info into activeTests
      const activeTestsWithProgress = activeTests.map((test) => {
        const sessionId = sessionMap.get(test.id) || null;
        return {
          ...test,
          sessionId,
          progress: sessionId ? "in-progress" : null,
        };
      });

      // Build student dashboard
      dashboardData = {
        studentName: `${student.firstname} ${student.lastname}`,
        className: student.class.className,
        totalTests: await prisma.test.count({
          where: { course: { classes: { some: { id: classId } } } },
        }),
        activeTests: activeTestsWithProgress,
        recentResults: await getStudentCourseResults(
          { id: userId, role: "STUDENT" },
          { testLimit: 5 }
        ),
        completedTests: await prisma.testSession.count({
          where: { studentId: userId, status: "COMPLETED" },
        }),
        inProgressTests: await prisma.testSession.count({
          where: { studentId: userId, status: "IN_PROGRESS" },
        }),
        totalScore: await prisma.testSession.aggregate({
          where: { studentId: userId },
          _sum: { score: true },
        }),
      };
    }

    return dashboardData;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
};
