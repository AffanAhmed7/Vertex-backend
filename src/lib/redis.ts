import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const redisUrl = config.REDIS_URL || 'redis://localhost:6379';

/**
 * Global Redis connection for BullMQ and Caching
 */
export const redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Critical for BullMQ
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redisConnection.on('error', (error) => {
    if ((error as any).code === 'ECONNREFUSED') {
        logger.error({ err: error }, '\n❌ REDIS ERROR: Connection Refused.\n👉 Is Redis running? Open a terminal and run `redis-server`\n👉 Download: https://github.com/tporadowski/redis/releases\n');
    } else {
        logger.error({ err: error }, 'Redis connection error');
    }
});

redisConnection.on('connect', () => {
    logger.info('Successfully connected to Redis');
});

export default redisConnection;
