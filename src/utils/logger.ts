import pino from 'pino';
import { config } from '../config/env.js';

const isDevelopment = config.NODE_ENV === 'development';

export const logger = pino({
    level: config.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    transport: isDevelopment ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss',
        },
    } : undefined,
    redact: {
        paths: ['password', 'token', 'refreshToken', 'accessToken', 'headers.authorization'],
        censor: '[REDACTED]',
    },
});
