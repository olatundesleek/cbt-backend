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

export const getNotificationsForUser = async (user, options = {}) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const sort = options.sort || "createdAt";
  const order = options.order || "desc";
  const search = options.search?.trim();

  const skip = (page - 1) * limit;
  const role = user.role;
  const notificationTypes = [
    "GENERAL",
    "STUDENT",
    "TEACHER",
    "CLASS",
    "COURSE",
  ];
  const searchConditions = search
    ? [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        ...(notificationTypes.includes(search.toUpperCase())
          ? [{ type: { equals: search.toUpperCase() } }]
          : []),
      ]
    : [];
  const searchFilter = search
    ? { OR: searchConditions }
    : {};

  if (role === "ADMIN") {
    const data = await prisma.notification.findMany({
      where: searchFilter,
      skip,
      take: limit,
      orderBy: { [sort]: order },
    });

    const total = await prisma.notification.count({ where: searchFilter });

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

  const where = {
    AND: [{ OR: conditions }, searchFilter],
  };

  const data = await prisma.notification.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sort]: order },
  });

  const total = await prisma.notification.count({
    where,
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
};
