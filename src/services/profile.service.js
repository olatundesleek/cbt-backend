import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      username: true,
      role: true,
      class: true, // Include class details if student
      teacherOf: {
        select: {
          id: true,
          className: true,
        },
      }, // Classes taught if teacher
    },
  });

  if (!user) throw new Error("User not found");
  return user;
};

export const updateProfile = async (userId, updates) => {
  // If username is being updated, check it's not taken
  if (updates.username) {
    const existing = await prisma.user.findUnique({
      where: { username: updates.username },
    });
    if (existing && existing.id !== parseInt(userId)) {
      throw new Error("Username already taken");
    }
  }

  const updated = await prisma.user.update({
    where: { id: parseInt(userId) },
    data: updates,
    select: {
      id: true,
      firstname: true,
      lastname: true,
      username: true,
      role: true,
      class: true,
      teacherOf: {
        select: {
          id: true,
          className: true,
        },
      },
    },
  });

  return updated;
};

export const updatePassword = async (userId, currentPassword, newPassword) => {
  // Get user with current password hash
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
    select: { id: true, password: true },
  });

  if (!user) throw new Error("User not found");

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw new Error("Current password is incorrect");

  // Hash new password and update
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: parseInt(userId) },
    data: { password: hashedPassword },
  });
};
