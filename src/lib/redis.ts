import { logger } from '../utils/logger.js';

/**
 * DEPRECATED: Redis infrastructure has been removed in favor of In-Memory logic.
 * This file is kept as a dummy to prevent import breaks during the transition.
 */
export const redisConnection = {
    get: async () => null,
    set: async () => {},
    setex: async () => {},
    del: async () => {},
    on: () => {},
    call: async () => {},
} as any;

logger.info('System operating in Zero-Redis mode (In-Memory)');

export default redisConnection;
