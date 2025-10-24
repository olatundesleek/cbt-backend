import express from "express";
import * as courseController from "../controllers/course.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
const router = express.Router();
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  courseController.createCourse
);
router.get("/", authenticate, courseController.getCourses);
export default router;
