import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import * as sessionController from "../controllers/testSession.controller.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import {
  submitAnswerSchema,
  fetchQuestionSchema,
} from "../validators/session.validator.js";
const router = express.Router();
router.post(
  "/start/:testId",
  authenticate,
  authorizeRoles("STUDENT"),
  sessionController.startTest
);
// fetch questions by number (returns two questions starting at requested number)
router.get(
  "/:sessionId/questions/:questionNumber",
  authenticate,
  authorizeRoles("STUDENT"),
  validateParams(fetchQuestionSchema),
  sessionController.fetchQuestion
);

// submit only (record answer but do NOT return next question)
router.post(
  "/:sessionId/questions/:questionId/submit",
  authenticate,
  authorizeRoles("STUDENT"),
  validateBody(submitAnswerSchema),
  sessionController.submitAnswerOnly
);

// submit and get next
router.post(
  "/:sessionId/questions/:questionId/answer",
  authenticate,
  authorizeRoles("STUDENT"),
  validateBody(submitAnswerSchema),
  sessionController.submitAndNext
);

// finish session manually
router.post(
  "/:sessionId/finish",
  authenticate,
  authorizeRoles("STUDENT"),
  sessionController.finishTest
);
export default router;
