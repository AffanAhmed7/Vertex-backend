import { Router, type Request, type Response } from 'express';

const router = Router();

/**
 * Health check endpoint
 * @route GET /health
 */
router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? 'development',
    });
});

import userRoutes from './routes/user.js';
import productRoutes from './routes/product.js';
import reviewRoutes from './routes/review.js';

/**
 * API root endpoint
 * @route GET /api
 */
router.get('/api', (_req: Request, res: Response) => {
    res.status(200).json({
        message: 'E-Commerce API',
        version: process.env.API_VERSION ?? 'v1',
        documentation: '/api/docs',
    });
});

// Products
router.use('/api/products', productRoutes);

// Admin User Management
router.use('/api/admin/users', userRoutes);

// Reviews
router.use('/api', reviewRoutes);

export default router;
