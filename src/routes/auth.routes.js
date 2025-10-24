import express from "express";
import { register, login } from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";
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
export default router;
