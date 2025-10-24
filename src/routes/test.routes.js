import express from 'express';
import * as testController from '../controllers/test.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
const router = express.Router();
router.post('/', authenticate, authorizeRoles('TEACHER'), testController.createTest);
router.get('/:id', authenticate, testController.getTest);
export default router;
