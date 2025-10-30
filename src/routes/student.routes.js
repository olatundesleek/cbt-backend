import express from "express";
import * as studentController from "../controllers/student.controller.js";
import {
  assignClassSchema,
  getStudentSchema,
} from "../validators/student.validator.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// List students (ADMIN -> all students, TEACHER -> students in teacher's classes)
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "TEACHER"),
  studentController.getStudents
);

// Get single student (ADMIN, TEACHER if student in their class, or the student themself)
router.get(
  "/:username",
  validateParams(getStudentSchema),
  authenticate,
  studentController.getStudentByUsername
);

// Assign a student to a class (ADMIN or TEACHER)
router.post(
  "/:username/assign-class",
  validateParams(getStudentSchema),
  validateBody(assignClassSchema),
  authenticate,
  authorizeRoles("ADMIN", "TEACHER"),
  studentController.assignClassToStudent
);

export default router;
