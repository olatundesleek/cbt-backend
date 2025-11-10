import Joi from "joi";

export const getTeachersSchema = Joi.object({
  id: Joi.number().min(3).max(30).required(),
});

export const assignClassTeacherSchema = Joi.object({
  teacherId: Joi.number().integer().positive().required(),
});

export const classSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
});
