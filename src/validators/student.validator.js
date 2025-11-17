import Joi from "joi";

export const getStudentSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
});

export const assignStudentSchema = Joi.object({
  studentId: Joi.number().integer().positive().required(),
});

export const assignClassSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
});
