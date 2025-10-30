import Joi from "joi";

export const createCourseSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  teacherId: Joi.number().integer().positive().optional(),
});

export const updateCourseSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  teacherId: Joi.number().integer().positive().optional(),
});

export const deleteCourseSchema = Joi.object({
  courseId: Joi.number().integer().positive().required(),
});
