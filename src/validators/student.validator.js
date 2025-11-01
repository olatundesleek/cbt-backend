import Joi from "joi";

export const getStudentSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
});

export const assignClassSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
});

export const updateStudentPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({ "any.only": "Passwords must match" }),
});
