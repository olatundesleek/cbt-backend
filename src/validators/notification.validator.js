// validators/notification.validator.js
import Joi from "joi";

export const createNotificationSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  message: Joi.string().min(2).max(1000).required(),
  type: Joi.string()
    .valid("GENERAL", "STUDENT", "TEACHER", "CLASS", "COURSE")
    .required(),
  classId: Joi.number().when("type", {
    is: "CLASS",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  courseId: Joi.number().when("type", {
    is: "COURSE",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

export const updateNotificationSchema = Joi.object({
  title: Joi.string().min(2).max(200).optional(),
  message: Joi.string().min(2).max(1000).optional(),
  type: Joi.string()
    .valid("GENERAL", "STUDENT", "TEACHER", "CLASS", "COURSE")
    .optional(),
  classId: Joi.number().optional(),
  courseId: Joi.number().optional(),
});

export const deleteNotificationSchema = Joi.object({
  notificationId: Joi.number().required(),
});

export const getNotificationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  sort: Joi.string().valid("title", "createdAt", "type").default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});
