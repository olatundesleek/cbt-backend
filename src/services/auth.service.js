import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import { signToken } from "../utils/jwt.js";

export async function register({
  firstname,
  lastname,
  username,
  password,
  role,
  classId,
}) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("username exists");
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      firstname,
      lastname,
      username,
      password: hash,
      role,
      classId,
    },
  });

  return {
    user: {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      role: user.role,
      classId: user.classId,
    },
  };
}
export async function login({ username, password }) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const error = new Error("unable to login");
    error.status = 401;
    error.details = "invalid credentials";
    throw error;
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const error = new Error("unable to login");
    error.details = "invalid credentials";
    error.status = 401;
    throw error;
  }
  const token = signToken({
    id: user.id,
    role: user.role,
    username: user.username,
  });
  return {
    user: {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      role: user.role,
    },
    token,
  };
}

export async function changeUserPassword(id, newPassword) {
  try {
    const userId = parseInt(id, 10);
    console.log("The id is " + userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        username: true,
        role: true,
      },
    });

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Hash the new password
    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    return {
      user,
    };
  } catch (error) {
    console.error("Error changing user password:", error);
    throw error;
  }
}

export async function deleteUser(currentUser, id) {
  try {
    const userId = parseInt(id, 10);

    console.log("this is the current user" + currentUser);
    console.log("this is the  user to be deleted" + id);

    console.log(typeof currentUser);
    console.log(typeof id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        username: true,
        role: true,
      },
    });

    if (!user) {
      const error = new Error("unable to delete user");
      error.status = 404;
      error.details = "User not found";
      throw error;
    }

    //admin cannot delete current account for safety
    if (currentUser === id) {
      const error = new Error("unable to delete user");
      error.status = 500;
      error.details = "You cannot Delete your current account";
      throw error;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return {
      user,
    };
  } catch (error) {
    throw error;
  }
}
