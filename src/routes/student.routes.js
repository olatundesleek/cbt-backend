import express from "express";
import * as studentController from "../controllers/student.controller.js";
import {
  assignClassSchema,
  getStudentSchema,
  updateStudentPasswordSchema,
  assignStudentSchema,
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

// Assign a student to a class (ADMIN )
router.post(
  "/:studentId/assign-class",
  validateParams(assignStudentSchema),
  validateBody(assignClassSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  studentController.assignClassToStudent
);

// route for admin to change a user's password
router.patch(
  "change-user-password/:username",
  authenticate,
  validateBody(updateStudentPasswordSchema),
  authorizeRoles("ADMIN"),
  studentController.changeUserPassword
);

export default router;
