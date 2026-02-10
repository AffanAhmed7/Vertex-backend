import { Router } from 'express';
import { UserController } from '../controllers/user.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';

const router = Router();

// All user management routes require admin authentication
router.use(authenticate, authorize(Role.ADMIN));

// Get all users
router.get('/', UserController.getUsers);

// Toggle user status (activate/deactivate)
router.patch('/:id/status', UserController.toggleStatus);

// Change user role
router.patch('/:id/role', UserController.changeRole);

export default router;

