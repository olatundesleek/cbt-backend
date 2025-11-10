import Joi from "joi";
export const registerSchema = Joi.object({
  firstname: Joi.string().min(2).max(100).required(),
  lastname: Joi.string().min(2).max(100).required(),
  username: Joi.string().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("ADMIN", "TEACHER", "STUDENT").required(),
});
export const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});
