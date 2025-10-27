import express from "express";
import { validateBody } from "../middleware/validate.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateBody(createQuestionSchema),
  questionController.createQuestion
);

export default router;
