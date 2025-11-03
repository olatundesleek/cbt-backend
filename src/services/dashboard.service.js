import prisma from "../config/prisma.js";
import { getStudentCourseResults } from "../services/result.service.js";

export const fetchDashboardData = async (role, userId) => {
  try {
    let dashboardData = {};

    // 🔹 ADMIN DASHBOARD
    if (role === "ADMIN") {
      dashboardData = {
        studentCount: await prisma.user.count({
          where: { role: "STUDENT" },
        }),
        teacherCount: await prisma.user.count({
          where: { role: "TEACHER" },
        }),
        testCount: await prisma.test.count(),
        classCount: await prisma.class.count(),
        courseCount: await prisma.course.count(),
      };
    }

    // 🔹 TEACHER DASHBOARD
    else if (role === "TEACHER") {
      dashboardData = {
        classCount: await prisma.class.count({
          where: { teacherId: userId },
        }),
        studentCount: await prisma.user.count({
          where: {
            role: "STUDENT",
            class: { teacherId: userId },
          },
        }),
        testCount: await prisma.test.count({
          where: { teacherId: userId },
        }),
        courseCount: await prisma.course.count({
          where: { teacherId: userId },
        }),
      };
    }

    // name
    // test
    // receent result
    // notifications
    // 🔹 STUDENT DASHBOARD
    else if (role === "STUDENT") {
      // Fetch student details once to avoid multiple DB hits
      const student = await prisma.user.findUnique({
        where: { id: userId },
        include: { class: true },
      });

      if (!student.classId) {
        const error = new Error("unable to fetch dashboard data");
        error.details = "Student not assigned to any class";
        throw error;
      }

      // Fetch tests that belong to student's class
      const classId = student.classId;

      dashboardData = {
        className: student.class.className,
        totalTests: await prisma.test.count({
          where: {
            course: {
              classes: { some: { id: classId } },
            },
          },
        }),
        activeTests: await prisma.test.findMany({
          where: {
            testState: "active",
            course: {
              classes: { some: { id: classId } },
            },
          },
          select: {
            id: true,
            title: true,
            type: true,
            startTime: true,
            endTime: true,
            course: { select: { title: true } },
          },
        }),

        recentResults: await getStudentCourseResults(
          { id: userId, role: "STUDENT" },
          { limit: 5 }
        ),

        completedTests: await prisma.testSession.count({
          where: {
            studentId: userId,
            status: "COMPLETED",
          },
        }),
        inProgressTests: await prisma.testSession.count({
          where: {
            studentId: userId,
            status: "IN_PROGRESS",
          },
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
