import Joi from "joi";

// Validation for getting a single session result
export const getSessionResultSchema = Joi.object({
  sessionId: Joi.number().integer().positive().required().messages({
    "number.base": "Session ID must be a number",
    "number.positive": "Session ID must be positive",
    "any.required": "Session ID is required",
  }),
});

// Validation for getting test results
export const getTestResultsSchema = Joi.object({
  testId: Joi.number().integer().positive().required().messages({
    "number.base": "Test ID must be a number",
    "number.positive": "Test ID must be positive",
    "any.required": "Test ID is required",
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
  }),
  sort: Joi.string()
    .valid("score", "date", "student")
    .default("date")
    .messages({
      "any.only": "Sort must be one of: score, date, student",
    }),
  order: Joi.string().valid("asc", "desc").default("desc").messages({
    "any.only": "Order must be either asc or desc",
  }),
});

// Validation for getting all results
export const getAllResultsSchema = Joi.object({
  testId: Joi.number().integer().positive(),
  courseId: Joi.number().integer().positive(),
  classId: Joi.number().integer().positive(),
  studentId: Joi.number().integer().positive(),
  testType: Joi.string().valid("Exam", "Test", "Quiz", "Assignment"),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref("startDate")),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string()
    .valid("score", "date", "student", "course")
    .default("date"),
  order: Joi.string().valid("asc", "desc").default("desc"),
  search: Joi.string().trim().min(2).max(50),
}).messages({
  "date.min": "End date must be after start date",
});

// Validation for getting student's course results
export const getStudentCourseResultsSchema = Joi.object({
  courseId: Joi.number().integer().positive(), // Optional - filter by specific course
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref("startDate")),
  limit: Joi.number().integer().min(1).max(100).default(10),
  testType: Joi.string().valid("TEST", "EXAM", "ALL").default("ALL"),
}).messages({
  "date.min": "End date must be after start date",
  "any.only": "Test type must be one of: TEST, EXAM, ALL",
});

// Validation for toggling result visibility
export const toggleResultReleaseSchema = Joi.object({
  showResult: Joi.boolean().required().messages({
    "boolean.base": "Show result must be a boolean",
    "any.required": "Show result is required",
  }),
});

export const toggleResultReleaseParamSchema = Joi.object({
  testId: Joi.number().integer().positive().required().messages({
    "number.base": "Test ID must be a number",
    "number.positive": "Test ID must be positive",
    "any.required": "Test ID is required",
  }),
});
