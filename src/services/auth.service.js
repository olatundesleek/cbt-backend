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
