import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import { signToken } from "../utils/jwt.js";

export async function register({
  firstname,
  lastname,
  username,
  password,
  role,
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
      classId: null,
    },
  });

  return {
    user: {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      role: user.role,
    },
  };
}
export async function login({ username, password }) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error("Invalid credentials");
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error("Invalid credentials");
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
