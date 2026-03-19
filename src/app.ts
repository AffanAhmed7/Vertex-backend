import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import routes from './routes.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/category.js';
import productRoutes from './routes/product.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/order.js';
import reviewRoutes from './routes/review.js';
import addressRoutes from './routes/address.js';
import analyticsRoutes from './routes/analytics.js';
import { requestLogger } from './middleware/request_logger.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { NotFoundError } from './utils/errors.js';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
    const app = express();

    // Request tracking
    app.use(requestLogger);

    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com"],
            },
        },
        crossOriginOpenerPolicy: false,
        xssFilter: true,
        noSniff: true,
        hidePoweredBy: true,
    }));

    // Rate limiting - Disabled for development
    // app.use('/api', globalLimiter);

    // CORS configuration
    app.use(cors({
        origin: config.CORS_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging (development)
    if (config.NODE_ENV === 'development') {
        // Basic console logs are now handled by requestLogger
    }

    // Mount routes
    app.use(routes);
    app.use('/api/auth', authRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/addresses', addressRoutes);
    app.use('/api', reviewRoutes);
    app.use('/api/admin/analytics', analyticsRoutes);

    // Admin aliases for convenience if needed, though they are inside the routers
    app.use('/api/admin/categories', categoryRoutes);
    app.use('/api/admin/products', productRoutes);

    // 404 handler
    app.use((_req: Request, _res: Response, next: NextFunction) => {
        next(new NotFoundError());
    });

    // Global error handler
    app.use(errorMiddleware);

    return app;
}

export default createApp;
