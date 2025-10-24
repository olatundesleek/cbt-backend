import prisma from "../config/prisma.js";
import { verifyToken } from "../utils/jwt.js";

export async function authenticate(req, res, next) {
  try {
    const token = req.cookies.reqtoken;
    console.log("Authenticating with token:", token);
    if (!token) return res.status(401).json({ error: "No token" });

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch (e) {
    console.log("Token from cookie:", req.cookies.reqtoken);
    return res.status(401).json({ error: "Invalid token" });
  }
}
