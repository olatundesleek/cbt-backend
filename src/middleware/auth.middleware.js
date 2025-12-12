import prisma from "../config/prisma.js";
import { verifyToken } from "../utils/jwt.js";

export async function authenticate(req, res, next) {
  try {
    // Check for token in cookies first
    let token = req.cookies.reqtoken;

    // If no token in cookies, check Authorization header (for downloads and other requests)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    console.log("Authenticating with token:", token);
    if (!token) return res.status(401).send("No token");

    const payload = verifyToken(token);
    console.log("Token payload:", payload);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).send("User not found");
    req.user = user;

    next();
  } catch (e) {
    return res.status(401).send("Invalid token");
  }
}
