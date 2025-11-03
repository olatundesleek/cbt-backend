import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  validateBody,
  validateParams,
  // validateQuery,
} from "../middleware/validate.middleware.js";
import * as resultController from "../controllers/result.controller.js";
import {
  getSessionResultSchema,
  getTestResultsSchema,
  getAllResultsSchema,
  getStudentCourseResultsSchema,
  toggleResultReleaseSchema,
} from "../validators/result.validator.js";

const router = express.Router();

// Get single session result
router.get(
  "/:sessionId",
  authenticate,
  validateParams(getSessionResultSchema),
  resultController.getResult
);

// Get all results for a test
router.get(
  "/test/:testId",
  authenticate,
  validateParams(getTestResultsSchema),
  // validateQuery(getTestResultsSchema),
  resultController.getTestResults
);

// Get all results (admin/teacher)
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "TEACHER"),
  // validateQuery(getAllResultsSchema),
  resultController.getAllResults
);

// Get student's course results
router.get(
  "/student/courses",
  authenticate,
  authorizeRoles("STUDENT"),
  // validateQuery(getStudentCourseResultsSchema),
  resultController.getStudentCourseResults
);

// Toggle result visibility (admin only)
router.patch(
  "/test/:testId/release",
  authenticate,
  authorizeRoles("ADMIN"),
  validateParams(toggleResultReleaseSchema),
  validateBody(toggleResultReleaseSchema),
  resultController.toggleResultRelease
);

export default router;
