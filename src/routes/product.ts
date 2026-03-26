import { Router } from 'express';
import { ProductController } from '../controllers/product.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';
import { adminLimiter } from '../middleware/security.js';

const router = Router();

/**
 * Public routes
 */
router.get('/', ProductController.getProducts);

/**
 * Admin routes
 */
router.use('/admin', adminLimiter);
router.get('/admin', authenticate, authorize(Role.ADMIN), ProductController.getAdminProducts);
router.post('/admin/import', authenticate, authorize(Role.ADMIN), ProductController.importProducts);
router.post('/admin', authenticate, authorize(Role.ADMIN), ProductController.createProduct);
router.put('/admin/:id', authenticate, authorize(Role.ADMIN), ProductController.updateProduct);
router.delete('/admin/:id', authenticate, authorize(Role.ADMIN), ProductController.deleteProduct);

/**
 * Public routes with ID
 */
router.get('/:id', ProductController.getProduct);

export default router;
