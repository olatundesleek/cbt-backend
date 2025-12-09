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

export const getTeachersListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string()
    .valid("firstname", "lastname", "createdAt")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});
