import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export const errorMiddleware = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const isProduction = config.NODE_ENV === 'production';

    // Default error values
    let statusCode = err.statusCode || 500;
    let errorCode = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'An unexpected error occurred';
    let details = err.details || undefined;

    // Handle unconventional errors (like generic Error or Prisma errors)
    if (!(err instanceof AppError)) {
        if (err.name === 'ZodError') {
            statusCode = 400;
            errorCode = 'VALIDATION_ERROR';
            message = 'Validation failed';
            details = err.format();
        } else if (err.name === 'PrismaClientKnownRequestError') {
            // Map specific Prisma codes if needed
            statusCode = 400;
            errorCode = 'DATABASE_ERROR';
            message = 'A database error occurred';
        }
    }

    // Log the error
    if (statusCode >= 500) {
        logger.error({
            err,
            requestId: (req as any).id,
            userId: req.user?.userId,
            path: req.path,
            method: req.method,
        }, 'Unhandled Server Error');
    } else {
        logger.warn({
            msg: message,
            errorCode,
            path: req.path,
            requestId: (req as any).id,
        }, 'Operation Error');
    }

    // Response format
    return res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message: isProduction && statusCode >= 500 ? 'Internal Server Error' : message,
            ...(details ? { details } : {}),
            ...(isProduction ? {} : { stack: err.stack }),
        }
    });
};
