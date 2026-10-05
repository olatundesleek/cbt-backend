import * as authService from "../services/auth.service.js";
import { success, error } from "../utils/response.js";
import {
  getLogin,
  getAllLogins,
  normalizeUsername,
  removeLogin,
  logoutAll,
  resolveClientIp,
} from "../utils/loginManager.js";
import { getIo } from "../utils/socket.js";

const isProduction = process.env.NODE_ENV === "production";

export async function register(req, res) {
  try {
    const out = await authService.register(req.body);
    success(res, "User registered successfully", out, 201);
  } catch (err) {
    error(res, err.message, 400);
  }
}

export async function login(req, res, next) {
  try {
    const { username, password, systemId } = req.body;
    const out = await authService.login({
      username,
      password,
      systemId,
      requestInfo: {
        ip: resolveClientIp(req),
        userAgent: req.get("user-agent"),
      },
    });

    res.cookie("reqtoken", out.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });
    const data = { data: out.user, token: out.token };
    success(res, "User logged in successfully", data);
  } catch (err) {
    if (err.code === "ALREADY_LOGGED_IN") {
      return res.status(409).json({
        success: false,
        code: "ALREADY_LOGGED_IN",
        message: "You are already logged in on another system.",
        login: err.login,
      });
    }

    next(err);
  }
}

export async function logout(req, res) {
  try {
    const username = normalizeUsername(req.user.username);
    const loginId = req.tokenPayload?.loginId;
    const removed = removeLogin(username, loginId);

    res.clearCookie("reqtoken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });

    if (removed) {
      return success(res, "Logged out successfully");
    }

    return success(res, "Logged out successfully");
  } catch (err) {
    error(res, err.message, 400);
  }
}

export async function getSession(req, res) {
  const login = req.login;
  if (!login) {
    return res.status(401).json({ success: false, message: "No active login session" });
  }

  return res.json({
    authenticated: true,
    login: {
      username: login.username,
      loginId: login.loginId,
      device: login.device,
      browser: login.browser,
      ip: login.ip,
      loginTime: login.loginTime,
      lastActivity: login.lastActivity,
      connected: !!login.socketId,
    },
  });
}

export async function getAllLoginSessions(req, res) {
  const sessions = getAllLogins().map((login) => ({
    username: login.username,
    loginId: login.loginId,
    device: login.device,
    browser: login.browser,
    ip: login.ip,
    loginTime: login.loginTime,
    lastActivity: login.lastActivity,
  }));

  return res.json({ sessions });
}

export async function getLoginSessionByUsername(req, res) {
  const username = normalizeUsername(req.params.username);
  const login = getLogin(username);

  if (!login) {
    return res.status(404).json({ success: false, message: "No active login session found." });
  }

  return res.json({
    username: login.username,
    loginId: login.loginId,
    device: login.device,
    browser: login.browser,
    ip: login.ip,
    loginTime: login.loginTime,
    lastActivity: login.lastActivity,
  });
}

export async function forceLogoutUser(req, res) {
  const username = normalizeUsername(req.params.username);
  const login = getLogin(username);

  if (!login) {
    return res.status(404).json({ success: false, message: "No active login session found." });
  }

  const socketId = login.socketId;
  removeLogin(username, login.loginId);

  if (socketId) {
    try {
      const io = getIo();
      io.to(socketId).emit("force_logout", {
        reason: "Your login session was terminated by an administrator.",
      });
    } catch (e) {
      
    }
  }

  return res.json({
    success: true,
    message: "User login session terminated.",
    username,
  });
}

export async function logoutAllUsers(req, res) {
  const sessions = getAllLogins();
  const socketIds = sessions
    .map((session) => session.socketId)
    .filter(Boolean);

  logoutAll();

  for (const socketId of socketIds) {
    try {
      const io = getIo();
      io.to(socketId).emit("force_logout", {
        reason: "Your login session was terminated by an administrator.",
      });
    } catch (e) {}
  }

  return res.json({
    success: true,
    message: "All active login sessions have been terminated.",
    count: sessions.length,
  });
}

export async function changeUsersPassword(req, res, next) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const data = await authService.changeUserPassword(userId, newPassword);
    return success(
      res,
      `${data.user.username} Password changed successfully`,
      data
    );
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    const currentUser = req.user.id;

    const data = await authService.deleteUser(currentUser, userId);
    return success(
      res,
      `user ${data.user.username} deleted successfully`,
      data
    );
  } catch (err) {
    next(err);
  }
}
