import express from "express";
import * as profileController from "../controllers/profile.controller.js";
import {
  updateProfileSchema,
  updatePasswordSchema,
} from "../validators/profile.validator.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get logged in user's profile
router.get("/", authenticate, profileController.getProfile);

// Update profile details (name, username)
router.patch(
  "/",
  validateBody(updateProfileSchema),
  authenticate,
  profileController.updateProfile
);

// Update password
router.patch(
  "/password",
  validateBody(updatePasswordSchema),
  authenticate,
  profileController.updatePassword
);

export default router;
