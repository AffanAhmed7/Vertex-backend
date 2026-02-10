import { Router } from 'express';
import { CategoryController } from '../controllers/category.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';
import { adminLimiter } from '../middleware/security.js';

const router = Router();

/**
 * Public routes
 */
router.get('/', CategoryController.getCategories);
router.get('/:id', CategoryController.getCategory);

/**
 * Admin routes
 */
router.use('/admin', adminLimiter);
router.post('/admin', authenticate, authorize(Role.ADMIN), CategoryController.createCategory);
router.put('/admin/:id', authenticate, authorize(Role.ADMIN), CategoryController.updateCategory);
router.delete('/admin/:id', authenticate, authorize(Role.ADMIN), CategoryController.deleteCategory);

export default router;
