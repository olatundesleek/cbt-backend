import Joi from "joi";
export const registerSchema = Joi.object({
  firstname: Joi.string().min(2).max(100).required(),
  lastname: Joi.string().min(2).max(100).required(),
  username: Joi.string().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("ADMIN", "TEACHER", "STUDENT").required(),
  classId: Joi.number().optional().allow(null),
});
export const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

export const updateUsersPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({ "any.only": "Passwords must match" }),
});

export const deleteUserSchema = Joi.object({
  userId: Joi.number().min(1).required(),
});
