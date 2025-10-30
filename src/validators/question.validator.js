import Joi from "joi";

// Question validators
export const createQuestionSchema = Joi.alternatives().try(
  // Single question object
  Joi.object({
    text: Joi.string().min(10).max(500).required(),
    options: Joi.object().required(), // JSON object for options
    answer: Joi.string().required(),
    marks: Joi.number().integer().min(1).default(1),
    bankId: Joi.number().integer().required(),
  }),
  // Array of questions
  Joi.array()
    .items(
      Joi.object({
        text: Joi.string().min(10).max(500).required(),
        options: Joi.object().required(),
        answer: Joi.string().required(),
        marks: Joi.number().integer().min(1).default(1),
        bankId: Joi.number().integer().required(),
      })
    )
    .min(1)
    .max(100) // Allow between 1 and 100 questions per batch
);

export const updateQuestionSchema = Joi.object({
  text: Joi.string().min(10).max(500).optional(),
  options: Joi.object().optional(),
  answer: Joi.string().optional(),
  marks: Joi.number().integer().min(1).optional(),
}).min(1); // At least one field must be provided

export const getQuestionsSchema = Joi.object({
  bankId: Joi.number().integer().required(),
});

// Question Bank validators
export const createQuestionBankSchema = Joi.object({
  questionBankName: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).optional(),
  courseId: Joi.number().integer().optional(),
});

export const updateQuestionBankSchema = Joi.object({
  questionBankName: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  courseId: Joi.number().integer().optional(),
}).min(1); // At least one field must be provided

// CSV upload validation
export const uploadQuestionsSchema = Joi.object({
  bankId: Joi.number().integer().required()
}).unknown(true); // Allow other fields (multer adds file details)
