import express from 'express';
import * as profileController from '../controllers/profile.controller.js';
import {
  updateProfileSchema,
  updatePasswordSchema,
  adminUpdateProfileSchema,
} from '../validators/profile.validator.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { authenticate, checkDemoUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { upload } from '../utils/mutler.js';

const router = express.Router();

// Get logged in user's profile
router.get('/', authenticate, profileController.getProfile);

// Update profile details (name, username)
router.patch(
  '/',
  validateBody(updateProfileSchema),
  authenticate,
  checkDemoUser, // Middleware to check if the user is a demo user
  profileController.updateProfile,
);

// Update password
router.patch(
  '/password',
  validateBody(updatePasswordSchema),
  authenticate,
  checkDemoUser, // Middleware to check if the user is a demo user
  profileController.updatePassword,
);

// Admin update another user's profile
router.patch(
  '/admin/:userId',
  authenticate,
  authorizeRoles('ADMIN'),
  checkDemoUser, // Middleware to check if the user is a demo user
  upload.single('profilePicture'),
  validateBody(adminUpdateProfileSchema),
  profileController.adminUpdateProfile,
);

export default router;
