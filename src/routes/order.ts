import { Router } from 'express';
import { OrderController } from '../controllers/order.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';

const router = Router();

// User routes (without ID)
router.get('/', authenticate, OrderController.getOrders);
router.post('/', authenticate, OrderController.createOrder);

// Admin routes
router.get('/admin', authenticate, authorize(Role.ADMIN), OrderController.getAllOrders);
router.patch('/admin/:id/status', authenticate, authorize(Role.ADMIN), OrderController.updateStatus);

// User routes (with ID) - Must be last to prevent intercepting /admin
router.get('/:id', authenticate, OrderController.getOrder);

export default router;
