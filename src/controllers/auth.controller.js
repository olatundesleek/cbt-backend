import * as authService from "../services/auth.service.js";
import { success, error } from "../utils/response.js";
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
    const out = await authService.login(req.body);
    console.log("Setting cookie with token:", out.token);
    res.cookie("reqtoken", out.token, {
      httpOnly: true,
      secure: isProduction, // Only secure in production (requires HTTPS)
      sameSite: isProduction ? "none" : "lax", // "none" for cross-site in prod, "lax" to avoid rejection in dev
      path: "/", // Ensure it's sent on all routes
    });
    const data = { data: out.user, token: out.token };
    success(res, "User logged in successfully", data);
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  try {
    // Clear the auth cookie
    res.clearCookie("reqtoken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });
    success(res, "Logged out successfully");
  } catch (err) {
    error(res, err.message, 400);
  }
}

export async function changeUsersPassword(req, res, next) {
  try {
    const { username } = req.params;
    const { newPassword } = req.body;
    await authService.changeUserPassword(username, newPassword);
    return success(res, "Password changed successfully");
  } catch (err) {
    next(err);
  }
}
