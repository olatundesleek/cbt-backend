import express from "express";
import * as classController from "../controllers/class.controller.js";
import {
  createClassSchema,
  updateClassSchema,
  deleteClassSchema,
} from "../validators/class.validator.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { validateParams } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
const router = express.Router();

router.post(
  "/",
  validateBody(createClassSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  classController.createClass
);

router.patch(
  "/:classId",
  validateBody(updateClassSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  classController.updateClass
);

router.get("/", authenticate, classController.getClass);

router.delete(
  "/:classId",
  validateParams(deleteClassSchema),
  authenticate,
  authorizeRoles("ADMIN"),
  classController.deleteClass
);

// assign-student moved to student routes

export default router;
