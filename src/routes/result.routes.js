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

// Get single session result, this is for admin use only
router.get(
  "/test:sessionId",
  authenticate,
  authorizeRoles("ADMIN"),
  validateParams(getSessionResultSchema),
  resultController.getResult
);

// Get all results for a test, this is for admin and teachers
router.get(
  "/test/:testId",
  authenticate,
  authorizeRoles("ADMIN", "TEACHER"),
  validateParams(getTestResultsSchema),
  // validateQuery(getTestResultsSchema),
  resultController.getTestResults
);

// Get all results, this is for admin and teachers

router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "TEACHER"),
  validateParams(getAllResultsSchema),
  resultController.getAllResults
);

// download all result filtered (teacher/admin)
router.get(
  "/download",
  authenticate,
  authorizeRoles("ADMIN", "TEACHER"),
  validateParams(getAllResultsSchema),
  resultController.downloadResults
);

// Get student's course results
router.get(
  "/student/courses",
  authenticate,
  authorizeRoles("STUDENT"),
  // validateQuery(getStudentCourseResultsSchema),
  resultController.getStudentCourseResults
);

// Download student's course results
router.get(
  "/student/courses/download",
  authenticate,
  authorizeRoles("STUDENT"),

  resultController.downloadStudentCourseResults
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
