import { rateLimit } from 'express-rate-limit';

/**
 * Global Rate Limiter (Moderate)
 * 100 requests per 15 minutes
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10000, // Effectively disabled for dev
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too Many Requests', message: 'Please try again later' },
});

/**
 * Auth Rate Limiter (Strict)
 * 5 requests per 15 minutes for login/register
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000, // Effectively disabled for dev
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too Many Requests', message: 'Too many authentication attempts. Please try again after 15 minutes' },
    skipSuccessfulRequests: true, // Only limit failed attempts if possible (though limit 5 is still small)
});

/**
 * Admin Rate Limiter (Very Strict)
 * 30 requests per minute
 */
export const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too Many Requests', message: 'Administrative rate limit exceeded' },
});
