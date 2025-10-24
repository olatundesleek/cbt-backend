import Joi from 'joi';
export const startSessionSchema = Joi.object({});
export const fetchQuestionSchema = Joi.object({ questionNumber: Joi.number().integer().min(1).required() });
export const submitAnswerSchema = Joi.object({ selectedOption: Joi.any().required() });
