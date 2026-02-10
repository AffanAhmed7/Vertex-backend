import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';
import { adminLimiter } from '../middleware/security.js';

const router = Router();

// All analytics routes are admin-only
router.use(authenticate);
router.use(authorize(Role.ADMIN));
router.use(adminLimiter);

router.get('/overview', AnalyticsController.getOverview);
router.get('/sales', AnalyticsController.getSalesHistory);
router.get('/top-products', AnalyticsController.getTopProducts);
router.get('/low-stock', AnalyticsController.getLowStock);

export default router;
