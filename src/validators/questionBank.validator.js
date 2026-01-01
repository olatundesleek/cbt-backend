import Joi from "joi";

// Question Bank Validators
export const createQuestionBankSchema = Joi.object({
  questionBankName: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  courseId: Joi.number().integer().required(),
});

export const updateQuestionBankSchema = Joi.object({
  questionBankName: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  courseId: Joi.number().integer().optional(),
}).min(1); // At least one field must be provided

export const getQuestionBanksSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string()
    .valid("questionBankName", "createdAt", "courseId")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});
