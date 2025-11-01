import express from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate);
// router.use(authorizeRoles("ADMIN", "TEACHER"));

router.get("/", dashboardController.getDashboardData);

export default router;
