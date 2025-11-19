// services/notification.service.js
import prisma from "../config/prisma.js";

export const createNotification = async (data, userId) => {
  const notificationData = { ...data, createdById: userId };
  return await prisma.notification.create({ data: notificationData });
};

export const updateNotification = async (id, data) => {
  return await prisma.notification.update({
    where: { id },
    data,
  });
};

export const deleteNotification = async (id) => {
  return await prisma.notification.delete({ where: { id } });
};

export const getNotificationsForUser = async (user) => {
  const role = user.role;

  if (role === "ADMIN") {
    return await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  const conditions = [{ type: "GENERAL" }];

  if (role === "TEACHER") {
    conditions.push({ type: "TEACHER" });
  }

  if (role === "STUDENT") {
    conditions.push({ type: "STUDENT" });
  }

  if (role === "STUDENT" && user.classId) {
    conditions.push({ type: "CLASS", classId: user.classId });
  }

  if (role === "STUDENT" && user.courses?.length > 0) {
    conditions.push({
      type: "COURSE",
      courseId: { in: user.courses.map((c) => c.id) },
    });
  }

  return await prisma.notification.findMany({
    where: { OR: conditions },
    orderBy: { createdAt: "desc" },
  });
};
