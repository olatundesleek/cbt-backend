import express from "express";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import * as questionController from "../controllers/question.controller.js";
import {
  createQuestionSchema,
  updateQuestionSchema,
  getQuestionsSchema,
} from "../validators/question.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { excelUpload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Create a new question (teachers and admin)
router.post(
  "/",
  validateBody(createQuestionSchema),
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionController.createQuestion
);

// Get a question by ID
router.get(
  "/:questionId",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionController.getQuestionById
);

// Update a question
router.patch(
  "/:questionId",
  validateBody(updateQuestionSchema),
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionController.updateQuestion
);

// Delete a question
router.delete(
  "/:questionId",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionController.deleteQuestion
);

// Upload questions via Excel workbook
router.post(
  "/upload",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  excelUpload.single("questions"), // 'questions' is the field name
  questionController.uploadQuestions
);

// Download Excel template for question upload
router.get(
  "/upload/template",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionController.getUploadTemplate
);

export default router;
