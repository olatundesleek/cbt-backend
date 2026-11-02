import express from "express";
import * as backupRestore from "../controllers/backupRestore.controller.js";
import { restoreFromBackupFileSchema } from "../validators/backupRestore.validator.js";
import { authenticate, checkDemoUser } from '../middleware/auth.middleware.js';
import { authorizeRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/backup-restore/backup
 * @desc    Create a database backup
 * @access  Admin only
 */
router.post(
  "/backup",
  authenticate,
  authorizeRoles("ADMIN"),
  backupRestore.createBackup
);

/**
 * @route   GET /api/backup-restore/list
 * @desc    List all available backups
 * @access  Admin only
 */
router.get(
  "/list",
  authenticate,
  authorizeRoles("ADMIN"),
  backupRestore.listBackups
);

/**
 * @route   GET /api/backup-restore/download/:filename
 * @desc    Download a backup file
 * @access  Admin only
 */
router.get(
  "/download/:filename",
  authenticate,
  authorizeRoles("ADMIN"),
  backupRestore.downloadBackup
);

/**
 * @route   POST /api/backup-restore/restore
 * @desc    Restore database from uploaded backup file
 * @access  Admin only
 */
router.post(
  '/restore-from-file',
  authenticate,
  authorizeRoles('ADMIN'),
  checkDemoUser, // Middleware to check if the user is a demo user
  uploadSingle('backup'),
  backupRestore.restoreBackup,
);

/**
 * @route   POST /api/backup-restore/restore-from-file
 * @desc    Restore database from existing backup file in backups directory
 * @access  Admin only
 */
router.post(
  '/restore',
  authenticate,
  authorizeRoles('ADMIN'),
  checkDemoUser, // Middleware to check if the user is a demo user
  validateBody(restoreFromBackupFileSchema),
  backupRestore.restoreFromBackupFile,
);

/**
 * @route   DELETE /api/backup-restore/:filename
 * @desc    Delete a specific backup file
 * @access  Admin only
 */
router.delete(
  '/:filename',
  authenticate,
  authorizeRoles('ADMIN'),
  checkDemoUser, // Middleware to check if the user is a demo user
  backupRestore.deleteBackup,
);

export default router;
