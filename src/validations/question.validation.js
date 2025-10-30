import Joi from "joi";

export const uploadQuestionsSchema = Joi.object({
  bankId: Joi.number().required().messages({
    "number.base": "Bank ID must be a number",
    "any.required": "Bank ID is required",
  }),
});
