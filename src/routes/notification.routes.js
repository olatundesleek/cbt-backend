// routes/notification.routes.js
import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import {
  createNotificationSchema,
  updateNotificationSchema,
  deleteNotificationSchema,
} from "../validators/notification.validator.js";
import * as notification from "../controllers/notification.cotroller.js";

const router = express.Router();

// Admin can create notification
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  validateBody(createNotificationSchema),
  notification.createNotificationController
);

// Admin can update
router.patch(
  "/:notificationId",
  authenticate,
  authorizeRoles("ADMIN"),
  validateBody(updateNotificationSchema),
  notification.updateNotificationController
);

// Admin can delete
router.delete(
  "/:notificationId",
  authenticate,
  authorizeRoles("ADMIN"),
  validateParams(deleteNotificationSchema),
  notification.deleteNotificationController
);

// Any logged-in user can fetch their notifications
router.get("/", authenticate, notification.getNotificationsController);

export default router;
