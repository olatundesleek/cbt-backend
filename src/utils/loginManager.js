import crypto from "crypto";

export const activeLogins = new Map();

const inactiveLoginTtlMs = 5 * 60 * 60 * 1000;

export function normalizeUsername(username) {
  return String(username ?? "").trim().toLowerCase();
}

export function clearInactiveLogins(now = Date.now()) {
  for (const [username, login] of activeLogins.entries()) {
    if (now - Date.parse(login.lastActivity) >= inactiveLoginTtlMs) {
      activeLogins.delete(username);
    }
  }
}

const inactiveLoginCleanup = setInterval(clearInactiveLogins, 60 * 60 * 1000);
inactiveLoginCleanup.unref();

export function detectBrowser(userAgent = "") {
  const ua = String(userAgent || "").toLowerCase();

  if (ua.includes("edg")) return "Edge";
  if (ua.includes("opr") || ua.includes("opera")) return "Opera";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("chrome") && !ua.includes("version/")) return "Chrome";
  if (ua.includes("safari")) return "Safari";
  return "Unknown";
}

export function detectDevice(userAgent = "") {
  const ua = String(userAgent || "").toLowerCase();

  if (/(ipad|tablet|playbook|silk)/.test(ua)) return "Tablet";
  if (/(android|iphone|ipod|mobile)/.test(ua)) return "Mobile";
  return "Desktop";
}

export function resolveClientIp(req = {}) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }

  const realIp = req.headers?.["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function createLoginRecord({
  username,
  loginId,
  browserId,
  device,
  browser,
  ip,
  socketId = null,
}) {
  const now = new Date();

  return {
    username: normalizeUsername(username),
    loginId,
    browserId: browserId ?? null,
    device: device ?? "Unknown",
    browser: browser ?? "Unknown",
    ip: ip ?? null,
    loginTime: now.toISOString(),
    lastActivity: now.toISOString(),
    socketId,
  };
}

export function getLogin(username) {
  clearInactiveLogins();
  return activeLogins.get(normalizeUsername(username));
}

export function getAllLogins() {
  clearInactiveLogins();
  return Array.from(activeLogins.values());
}

export function createLogin({
  username,
  loginId = crypto.randomUUID(),
  browserId,
  device,
  browser,
  ip,
  socketId = null,
}) {
  const key = normalizeUsername(username);
  const login = createLoginRecord({
    username: key,
    loginId,
    browserId,
    device,
    browser,
    ip,
    socketId,
  });

  activeLogins.set(key, login);
  return login;
}

export function isLoginValid(username, loginId) {
  const activeLogin = getLogin(username);
  if (!activeLogin) return false;
  return activeLogin.loginId === loginId;
}

export function updateActivity(username) {
  clearInactiveLogins();
  const activeLogin = getLogin(username);
  if (!activeLogin) return null;

  activeLogin.lastActivity = new Date().toISOString();
  return activeLogin;
}

export function attachSocket(username, loginId, socketId) {
  const activeLogin = getLogin(username);
  if (!activeLogin) return null;
  if (activeLogin.loginId !== loginId) return null;

  activeLogin.socketId = socketId;
  return activeLogin;
}

export function detachSocket(socketId) {
  for (const [username, activeLogin] of activeLogins.entries()) {
    if (activeLogin?.socketId === socketId) {
      activeLogin.socketId = null;
      return { username, activeLogin };
    }
  }

  return null;
}

export function removeLogin(username, loginId = null) {
  const key = normalizeUsername(username);
  const activeLogin = activeLogins.get(key);

  if (!activeLogin) return null;
  if (loginId && activeLogin.loginId !== loginId) return null;

  activeLogins.delete(key);
  return activeLogin;
}

export function forceLogout(username) {
  return removeLogin(username);
}

export function logoutAll() {
  const sessions = getAllLogins();
  activeLogins.clear();
  return sessions;
}

export default {
  activeLogins,
  normalizeUsername,
  getLogin,
  getAllLogins,
  createLogin,
  isLoginValid,
  updateActivity,
  attachSocket,
  detachSocket,
  removeLogin,
  forceLogout,
  logoutAll,
};
