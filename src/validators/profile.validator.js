import Joi from "joi";

export const updateProfileSchema = Joi.object({
  // firstname: Joi.string().min(2).max(100).optional(),
  // lastname: Joi.string().min(2).max(100).optional(),
  // username: Joi.string().optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().optional(),
}).min(1); // At least one field must be provided

export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({ "any.only": "Passwords must match" }),
});
