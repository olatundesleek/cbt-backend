import express from "express";
import {
  register,
  login,
  logout,
  changeUsersPassword,
} from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  updateUsersPasswordSchema,
} from "../validators/auth.validator.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/register",
  validateBody(registerSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  register
);

router.post("/login", validateBody(loginSchema), login);

// Clear auth cookie on logout
router.post("/logout", authenticate, logout);

// route for admin to change a user's password
router.patch(
  "/change-user-password/:username",
  authenticate,
  validateBody(updateUsersPasswordSchema),
  authorizeRoles("ADMIN"),
  changeUsersPassword
);

export default router;
