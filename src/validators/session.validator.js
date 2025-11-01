import Joi from "joi";
export const startSessionSchema = Joi.object({
  testId: Joi.number().integer().positive().required().messages({
    "number.base": "Test ID must be a number",
    "number.positive": "Test ID must be positive",
    "any.required": "Test ID is required",
  }),
});

export const fetchQuestionSchema = Joi.object({
  questionNumber: Joi.number().integer().min(1).required().messages({
    "number.base": "Question number must be a number",
    "number.min": "Question number must be at least 1",
    "any.required": "Question number is required",
  }),
});

export const submitAnswerSchema = Joi.object({
  selectedOption: Joi.string().required().trim().messages({
    "string.empty": "Selected option cannot be empty",
    "any.required": "Selected option is required",
  }),
});
