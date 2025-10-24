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
export async function login(req, res) {
  try {
    const out = await authService.login(req.body);
    console.log("Setting cookie with token:", out.token);
    res.cookie("reqtoken", out.token, {
      httpOnly: true,
      secure: isProduction, // Only secure in production (requires HTTPS)
      sameSite: isProduction ? "none" : "lax", // "none" for cross-site in prod, "lax" to avoid rejection in dev
      path: "/", // Ensure it's sent on all routes
    });

    success(res, "User logged in successfully", out.user);
  } catch (err) {
    error(res, err.message, 400);
  }
}
