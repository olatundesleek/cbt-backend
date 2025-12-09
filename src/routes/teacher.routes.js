import express from "express";
import * as teacherController from "../controllers/teacher.controller.js";
import {
  classSchema,
  getTeachersListSchema,
  assignClassTeacherSchema,
} from "../validators/teacher.validator.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// List teachers (ADMIN -> all teachers, TEACHER)
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  validateQuery(getTeachersListSchema),
  teacherController.getTeachers
);

// endpoint to assign class teacher
router.patch(
  "/:classId/assign-class-teacher",
  validateParams(classSchema),
  validateBody(assignClassTeacherSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  teacherController.assignClassTeacher
);

export default router;
