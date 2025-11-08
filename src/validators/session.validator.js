import Joi from "joi";
export const startSessionSchema = Joi.object({
  testId: Joi.number().integer().positive().required().messages({
    "number.base": "Test ID must be a number",
    "number.positive": "Test ID must be positive",
    "any.required": "Test ID is required",
  }),
});

export const fetchQuestionSchema = Joi.object({
  sessionId: Joi.number().integer().min(1).required().messages({
    "number.base": "Session ID must be a number",
    "number.min": "Session ID must be at least 1",
    "any.required": "Session ID is required",
  }),
  questionNumber: Joi.number().integer().min(1).required().messages({
    "number.base": "Question number must be a number",
    "number.min": "Question number must be at least 1",
    "any.required": "Question number is required",
  }),
});

export const submitAnswersSchema = Joi.object({
  sessionId: Joi.alternatives(Joi.number(), Joi.string()).required(),
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.number().required(),
        selectedOption: Joi.string().optional(),
      })
    )
    .min(1)
    .max(2)
    .required(),
});
