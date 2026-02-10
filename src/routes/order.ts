import { Router } from 'express';
import { OrderController } from '../controllers/order.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';

const router = Router();

// User routes
router.get('/', authenticate, OrderController.getOrders);
router.get('/:id', authenticate, OrderController.getOrder);
router.post('/', authenticate, OrderController.createOrder);

// Admin routes
router.patch('/admin/:id/status', authenticate, authorize(Role.ADMIN), OrderController.updateStatus);

export default router;
