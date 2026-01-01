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
  getQuestionBanksSchema,
} from "../validators/questionBank.validator.js";
import { getQuestionsSchema } from "../validators/question.validator.js";

import {
  createImageSchema,
  updateImageSchema,
  deleteImageSchema,
  createComprehensionSchema,
  updateComprehensionSchema,
  deleteComprehensionSchema,
  getBankResourcesSchema,
} from "../validators/questionBankResources.validator.js";
import { upload } from "../utils/mutler.js";

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

router.post(
  "/:bankId/images",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  upload.array("bankImages", 10),
  validateBody(createImageSchema),
  questionBankController.uploadBankImages
);

// Update single image (optional new file)
router.patch(
  "/images/:id",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  upload.single("bankImages"), // optional file replacement
  validateBody(updateImageSchema),
  validateParams(deleteImageSchema),
  questionBankController.updateBankImage
);

// Delete single image
router.delete(
  "/images/:id",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateParams(deleteImageSchema),
  questionBankController.deleteBankImage
);

router.post(
  "/:bankId/comprehensions",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateBody(createComprehensionSchema),
  questionBankController.createComprehension
);

router.patch(
  "/comprehensions/:id",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateBody(updateComprehensionSchema),
  validateParams(deleteComprehensionSchema),
  questionBankController.updateComprehension
);

router.delete(
  "/comprehensions/:id",
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  validateParams(deleteComprehensionSchema),
  questionBankController.deleteComprehension
);

// // fetch all comprehensions for a question bank
// router.get(
//   "/:bankId/comprehensions",
//   validateParams(getQuestionsSchema),
//   authenticate,
//   authorizeRoles("TEACHER", "ADMIN"),
//   questionBankController.getComprehensionsInBank
// );

// // get single comprehension by id
// router.get(
//   "/comprehensions/:id",
//   validateParams(deleteComprehensionSchema),
//   authenticate,
//   authorizeRoles("TEACHER", "ADMIN"),
//   questionBankController.getComprehensionById
// );

// // fetch images for a question bank
// router.get(
//   "/:bankId/images",
//   validateParams(getQuestionsSchema),
//   authenticate,
//   authorizeRoles("TEACHER", "ADMIN"),
//   questionBankController.getImagesInBank
// );

// single endpoint to get all bank resources (comprehensions + images)
router.get(
  "/:bankId/resources",
  validateParams(getBankResourcesSchema),
  authenticate,
  authorizeRoles("TEACHER", "ADMIN"),
  questionBankController.getBankResources
);

export default router;
