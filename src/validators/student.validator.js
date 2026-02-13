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

export const getStudentsListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  sort: Joi.string()
    .valid("firstname", "lastname", "createdAt")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});
