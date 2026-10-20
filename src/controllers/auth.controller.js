import crypto from "crypto";
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


const browserIdCookie = "cbt_browser_id";
const browserIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function register(req, res) {
  try {
    const out = await authService.register({
      isDemoUser: req.user.isDemoUser,
      ...req.body,
    });
    success(res, "User registered successfully", out, 201);
  } catch (err) {
    error(res, err.message, 400);
  }
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    let browserId = req.cookies?.[browserIdCookie];
    const hasValidBrowserId =
      typeof browserId === "string" && browserIdPattern.test(browserId);

    if (!hasValidBrowserId) browserId = crypto.randomUUID();

    const out = await authService.login({
      username,
      password,
      browserId,
      requestInfo: {
        ip: resolveClientIp(req),
        userAgent: req.get("user-agent"),
      },
    });

    res.cookie(browserIdCookie, browserId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    res.cookie("reqtoken", out.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 5 * 60 * 60 * 1000
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
    if (err.code === "ACCOUNT_DISABLED") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: err.message,
      });
    }

    next(err);
  }
}

export async function logout(req, res) {
  try {
    const username = normalizeUsername(req.user.username);
    const loginId = req.loginId;
    const removed = removeLogin(username, loginId);

    res.clearCookie("reqtoken", {
      httpOnly: true,
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
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = String(req.query.search || "").trim().toLowerCase();
  const filteredSessions = getAllLogins()
    .filter((login) =>
      !search ||
      [login.username, login.loginId, login.device, login.browser, login.ip]
        .some((value) => String(value || "").toLowerCase().includes(search))
    )
    .map((login) => ({
      username: login.username,
      loginId: login.loginId,
      device: login.device,
      browser: login.browser,
      ip: login.ip,
      loginTime: login.loginTime,
      lastActivity: login.lastActivity,
      socketId: login.socketId,
    }));
  const total = filteredSessions.length;
  const sessions = filteredSessions.slice((page - 1) * limit, page * limit);

  return res.json({
    sessions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
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
    socketId: login.socketId,
  });
}

export async function forceLogoutUser(req, res) {
  const username = normalizeUsername(req.params.username);
  const logins = getAllLogins().filter((activeLogin) => activeLogin.username === username);

  if (logins.length === 0) {
    return res.status(404).json({ success: false, message: "No active login session found." });
  }

  for (const login of logins) {
    removeLogin(username, login.loginId);
    if (!login.socketId) continue;
    try {
      const io = getIo();
      io.to(login.socketId).emit("force_logout", {
        reason: "Your login session was terminated by an administrator.",
      });
    } catch (e) {}
  }

  return res.json({
    success: true,
    message: "User login sessions terminated.",
    username,
    count: logins.length,
  });
}

export async function logoutAllUsers(req, res) {
  const sessions = logoutAll();
  const socketIds = sessions
    .map((session) => session.socketId)
    .filter(Boolean);

  for (const socketId of socketIds) {
    try {
      const io = getIo();
      io.to(socketId).emit("force_logout", {
        reason: "Your login session was terminated by an administrator.",
      });
    } catch (e) {console.error(`Failed to notify socket ${socketId}:`, e);}
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

export async function updateUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const data = await authService.updateUserStatus(
      userId,
      isActive,
      req.user.id
    );

    if (!isActive) {
      const username = normalizeUsername(data.user.username);
      const logins = getAllLogins().filter(
        (activeLogin) => activeLogin.username === username
      );
      removeLogin(username);
      for (const login of logins) {
        if (!login.socketId) continue;
        getIo().to(login.socketId).emit("force_logout", {
          reason: "Your account has been disabled by an administrator.",
        });
      }
    }

    return success(
      res,
      `User ${data.user.username} ${isActive ? "enabled" : "disabled"} successfully`,
      data
    );
  } catch (err) {
    next(err);
  }
}
