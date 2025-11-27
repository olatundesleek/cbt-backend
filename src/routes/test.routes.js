import express from "express";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import * as testController from "../controllers/test.controller.js";
import {
  createTestSchema,
  updateTestSchema,
  testIdSchema,
  deleteTestSchema,
} from "../validators/test.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Create a new test (teachers and admin only)
router.post(
  "/",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateBody(createTestSchema),
  testController.createTest
);

// Get test by ID (handles both teacher and student access)
router.get(
  "/:testId",
  authenticate,
  validateParams(testIdSchema),
  testController.getTestById
);

// Update test (teachers who created it and admin only)
router.patch(
  "/:testId",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateParams(testIdSchema),
  validateBody(updateTestSchema),
  testController.updateTest
);

router.delete(
  "/:testId",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateParams(deleteTestSchema),
  testController.deleteTest
);

// Get tests (filtered based on user role)
router.get("/", authenticate, testController.getTests);

export default router;
