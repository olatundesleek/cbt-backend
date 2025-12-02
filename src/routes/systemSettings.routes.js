import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { updateSystemSettingsSchema } from "../validators/systemSettings.validator.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../controllers/systemSettings.controller.js";
import { upload } from "../utils/mutler.js";

const router = express.Router();

router.get("/", authenticate, authorizeRoles("ADMIN"), getSystemSettings);

router.patch(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "loginBanner", maxCount: 1 },
  ]),
  validateBody(updateSystemSettingsSchema),
  updateSystemSettings
);

export default router;
