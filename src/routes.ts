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

// Admin User Management
router.use('/api/admin/users', userRoutes);

export default router;
