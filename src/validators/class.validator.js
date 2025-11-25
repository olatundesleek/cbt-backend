import Joi from "joi";

export const createClassSchema = Joi.object({
  className: Joi.string().min(2).max(100).required(),
  teacherId: Joi.number().required(),
  courses: Joi.array().items(Joi.number()).optional(),
});
export const getClassSchema = Joi.object({
  classId: Joi.number().required(),
});

export const updateClassSchema = Joi.object({
  className: Joi.string().min(2).max(100).optional(),
  teacherId: Joi.number().optional(),
  courses: Joi.array().items(Joi.number()).optional(),
});

export const deleteClassSchema = Joi.object({
  classId: Joi.number().required(),
});

export const assignStudentSchema = Joi.object({
  studentId: Joi.number().integer().positive().required(),
});
