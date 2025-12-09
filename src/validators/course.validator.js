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

export const getCoursesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string()
    .valid("title", "createdAt", "teacher")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});
