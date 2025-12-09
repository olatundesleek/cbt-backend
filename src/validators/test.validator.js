import Joi from "joi";

export const createTestSchema = Joi.object({
  title: Joi.string().required().messages({
    "string.empty": "Test title is required",
    "any.required": "Test title is required",
  }),
  type: Joi.string().valid("TEST", "EXAM", "PRACTICE").required().messages({
    "any.only": "Test type must be either TEST, EXAM or PRACTICE",
    "any.required": "Test type is required",
  }),
  testState: Joi.string()
    .valid("active", "inactive", "scheduled", "completed")
    .required()
    .messages({
      "any.only":
        "Test state must be either 'active', 'inactive', 'scheduled', or 'completed'",
      "any.required": "Test state is required",
    }),
  startTime: Joi.date().iso().greater("now").messages({
    "date.greater": "Start time must be in the future",
  }),
  endTime: Joi.date().iso().greater(Joi.ref("startTime")).messages({
    "date.greater": "End time must be after start time",
  }),
  duration: Joi.number().min(1).max(180).messages({
    "number.min": "Duration must be at least 1 minute",
    "number.max": "Duration cannot exceed 180 minutes",
  }),
  courseId: Joi.number().required().messages({
    "number.base": "Course ID must be a number",
    "any.required": "Course ID is required",
  }),
  bankId: Joi.number().required().messages({
    "number.base": "Question bank ID must be a number",
    "any.required": "Question bank ID is required",
  }),
  attemptsAllowed: Joi.number()
    .required()
    .integer()
    .min(1)
    .default(1)
    .messages({
      "number.min": "At least 1 attempt is required",
    }),
  passMark: Joi.number().integer().min(0).max(100).required().messages({
    "number.min": "Pass mark cannot be less than 0",
    "number.max": "Pass mark cannot exceed 100",
    "any.required": "Pass mark is required",
  }),
});

export const updateTestSchema = Joi.object({
  title: Joi.string().messages({
    "string.empty": "Test title cannot be empty",
  }),
  type: Joi.string().valid("TEST", "EXAM", "PRACTICE").messages({
    "any.only": "Test type must be either TEST, EXAM or PRACTICE",
  }),
  testState: Joi.string()
    .valid("active", "inactive", "scheduled", "completed")
    .messages({
      "any.only":
        "Test state must be either 'active', 'inactive', 'scheduled', or 'completed'",
    }),
  startTime: Joi.date().iso(),
  endTime: Joi.date().iso().greater(Joi.ref("startTime")).messages({
    "date.greater": "End time must be after start time",
  }),
  duration: Joi.number().min(1).max(300).messages({
    "number.min": "Duration must be at least 1 minute",
    "number.max": "Duration cannot exceed 300 minutes",
  }),
  courseId: Joi.number().messages({
    "number.base": "Course ID must be a number",
  }),
  bankId: Joi.number().messages({
    "number.base": "Question bank ID must be a number",
  }),
  attemptsAllowed: Joi.number().integer().min(1).default(1).messages({
    "number.min": "At least 1 attempt is required",
  }),
  passMark: Joi.number().integer().min(0).max(100).messages({
    "number.min": "Pass mark cannot be less than 0",
    "number.max": "Pass mark cannot exceed 100",
  }),
});

export const testIdSchema = Joi.object({
  testId: Joi.number().required().messages({
    "number.base": "Test ID must be a number",
    "any.required": "Test ID is required",
  }),
});

export const deleteTestSchema = Joi.object({
  testId: Joi.number().required().messages({
    "number.base": "Test ID must be a number",
    "any.required": "Test ID is required",
  }),
});

export const getTestsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid("title", "createdAt", "type").default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});
