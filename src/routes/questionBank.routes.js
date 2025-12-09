import express from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import * as questionBankController from "../controllers/questionBank.controller.js";
import {
  createQuestionBankSchema,
  updateQuestionBankSchema,
  getQuestionsSchema,
  getQuestionBanksSchema,
} from "../validators/question.validator.js";

const router = express.Router();

// Create a new question bank (teachers and admin)
router.post(
  "/",
  validateBody(createQuestionBankSchema),
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionBankController.createQuestionBank
);

// Get all question banks (filtered by role - teachers see their own, admin sees all)
router.get(
  "/",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateQuery(getQuestionBanksSchema),
  questionBankController.getQuestionBanks
);

// Get one question bank by ID
router.get(
  "/:bankId",
  validateParams(getQuestionsSchema),
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionBankController.getQuestionBankById
);

// Update a question bank
router.patch(
  "/:bankId",
  validateParams(getQuestionsSchema),
  validateBody(updateQuestionBankSchema),
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionBankController.updateQuestionBank
);

// Delete a question bank
router.delete(
  "/:bankId",
  validateParams(getQuestionsSchema),
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionBankController.deleteQuestionBank
);

// Get questions in a bank
router.get(
  "/:bankId/questions",
  validateParams(getQuestionsSchema),
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionBankController.getQuestionsInBank
);

export default router;
