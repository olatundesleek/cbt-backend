import Joi from "joi";

//  Single Question Schema
const singleQuestionSchema = Joi.object({
  text: Joi.string().min(10).max(500).required(),

  options: Joi.array().items(Joi.string().min(1)).min(2).required().messages({
    "array.base": "Options must be an array of strings",
    "array.min": "At least two options are required",
  }),

  answer: Joi.string()
    .required()
    .custom((value, helpers) => {
      const { options } = helpers.state.ancestors[0];
      if (!options.includes(value)) {
        return helpers.error("any.invalid", {
          message: "Answer must match one of the options",
        });
      }
      return value;
    }),

  questionImage: Joi.string().uri().optional().allow(null, ""),
  comprehensionId: Joi.number().integer().positive().optional().allow(null, ""),

  marks: Joi.number().integer().min(1).default(1),
  bankId: Joi.number().integer().required(),
});

//  Allow single or multiple questions
export const createQuestionSchema = Joi.alternatives().try(
  singleQuestionSchema,
  Joi.array().items(singleQuestionSchema).min(1).max(100)
);

//  Update Question Schema
export const updateQuestionSchema = Joi.object({
  text: Joi.string().min(10).max(500).optional(),

  options: Joi.array().items(Joi.string().min(1)).min(2).optional().messages({
    "array.base": "Options must be an array of strings",
    "array.min": "At least two options are required",
  }),

  answer: Joi.string().optional(),

  marks: Joi.number().integer().min(1).optional(),
}).min(1); // At least one field must be provided

//  Get Questions Schema
export const getQuestionsSchema = Joi.object({
  bankId: Joi.number().integer().required(),
});

export const getQuestionBanksSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string()
    .valid("questionBankName", "createdAt", "courseId")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});

//  Question Bank Validators
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

// CSV upload validation
export const uploadQuestionsSchema = Joi.object({
  bankId: Joi.number().integer().required(),
}).unknown(true); // Allow other fields (multer adds file details)
