import express from "express";
import * as auth from "../controllers/auth.controller.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import * as authController from "../controllers/auth.controller.js";
import {
  registerSchema,
  loginSchema,
  updateUsersPasswordSchema,
  deleteUserSchema,
} from "../validators/auth.validator.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/register",
  validateBody(registerSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  auth.register
);

router.post("/login", validateBody(loginSchema), auth.login);
router.get("/session", authenticate, auth.getSession);

// Clear auth cookie on logout
router.post("/logout", authenticate, auth.logout);

// delete a user account

router.delete(
  "/delete-user/:userId",
  validateParams(deleteUserSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  auth.deleteUser
);

// route for admin to change a user's password
router.patch(
  "/change-user-password/:userId",
  authenticate,
  validateBody(updateUsersPasswordSchema),
  authorizeRoles("ADMIN"),
  auth.changeUsersPassword
);

router.get(
  "/login-sessions",
  authenticate,
  authorizeRoles("ADMIN"),
  authController.getAllLoginSessions
);
router.get(
  "/login-sessions/:username",
  authenticate,
  authorizeRoles("ADMIN"),
  authController.getLoginSessionByUsername
);
router.post(
  "/login-sessions/:username/logout",
  authenticate,
  authorizeRoles("ADMIN"),
  authController.forceLogoutUser
);
router.post(
  "/login-sessions/logout-all",
  authenticate,
  authorizeRoles("ADMIN"),
  authController.logoutAllUsers
);

export default router;
