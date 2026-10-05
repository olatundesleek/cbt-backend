import prisma from "../config/prisma.js";
import { verifyToken } from "../utils/jwt.js";
import {
  getLogin,
  normalizeUsername,
  updateActivity,
  isLoginValid,
} from "../utils/loginManager.js";

export async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.reqtoken;

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return res.status(401).json({ success: false, message: "No token" });

    const payload = verifyToken(token);
    if (!payload?.username || !payload?.loginId) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const username = normalizeUsername(payload.username);
    const activeLogin = getLogin(username);
    if (!activeLogin || !isLoginValid(username, payload.loginId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    req.user = user;
    req.login = activeLogin;
    req.tokenPayload = payload;
    updateActivity(username);

    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
