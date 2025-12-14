import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import * as sessionController from "../controllers/testSession.controller.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.middleware.js";
import {
  submitAnswersSchema,
  fetchQuestionSchema,
  finishTestSessionSchema,
  endAllSessionsSchema,
  startSessionSchema,
} from "../validators/session.validator.js";
const router = express.Router();
router.post(
  "/start/:testId",
  authenticate,
  authorizeRoles("STUDENT"),
  validateParams(startSessionSchema),
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
  validateBody(submitAnswersSchema),
  sessionController.submitAnswerOnly
);

// submit and get next
router.post(
  "/questions-next/answer",
  authenticate,
  authorizeRoles("STUDENT"),
  validateBody(submitAnswersSchema),
  sessionController.submitAndNext
);

// submit and get previous
router.post(
  "/questions-previous/answer",
  authenticate,
  authorizeRoles("STUDENT"),
  validateBody(submitAnswersSchema),
  sessionController.submitAndPrevious
);

// finish session manually
router.post(
  "/:sessionId/finish",
  authenticate,
  authorizeRoles("STUDENT"),
  validateParams(finishTestSessionSchema),
  sessionController.finishTest
);

// end all sessions for all tests, used for cleanup (e.g., on server restart)
router.post(
  "/end-all-sessions",
  authenticate,
  authorizeRoles("ADMIN"),
  validateBody(endAllSessionsSchema),
  sessionController.endAllSessions
);

export default router;
