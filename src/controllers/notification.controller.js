// controllers/notification.controller.js
import {
  createNotification,
  updateNotification,
  deleteNotification,
  getNotificationsForUser,
} from "../services/notification.service.js";
import { success } from "../utils/response.js";

export const createNotificationController = async (req, res, next) => {
  try {
    const notification = await createNotification(req.body, req.user.id);
    success(res, "Notification created successfully", notification, 201);
  } catch (err) {
    next(err);
  }
};

export const updateNotificationController = async (req, res, next) => {
  try {
    const updated = await updateNotification(
      parseInt(req.params.notificationId),
      req.body
    );
    success(res, "Notification updated successfully", updated);
  } catch (err) {
    next(err);
  }
};

export const deleteNotificationController = async (req, res, next) => {
  try {
    await deleteNotification(parseInt(req.params.notificationId));
    success(res, "Notification deleted successfully", null);
  } catch (err) {
    next(err);
  }
};

export const getNotificationsController = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "createdAt";
    const order = req.query.order || "desc";

    const notifications = await getNotificationsForUser(req.user, {
      page,
      limit,
      sort,
      order,
    });
    success(res, "Notifications fetched successfully", notifications);
  } catch (err) {
    next(err);
  }
};
