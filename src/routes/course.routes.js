import express from "express";
import * as courseController from "../controllers/course.controller.js";
import {
  createCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
  getCoursesSchema,
} from "../validators/course.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { validateParams } from "../middleware/validate.middleware.js";
import { validateQuery } from "../middleware/validate.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
const router = express.Router();
// router.post('/', authenticate,validateBody authorizeRoles('ADMIN'), courseController.createCourse);
// router.get('/', authenticate, courseController.getCourses);
// export default router;

router.post(
  "/",
  validateBody(createCourseSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  courseController.createCourse
);
router.get(
  "/",
  authenticate,
  validateQuery(getCoursesSchema),
  courseController.getCourses
);
// update
router.patch(
  "/:courseId",
  validateBody(updateCourseSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  courseController.updateCourse
);

// delete
router.delete(
  "/:courseId",
  validateParams(deleteCourseSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  courseController.deleteCourse
);
export default router;
