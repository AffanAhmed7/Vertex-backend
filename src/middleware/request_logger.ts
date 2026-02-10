import { pinoHttp } from 'pino-http';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const requestLogger = pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] || uuidv4(),
    customLogLevel: (res, err) => {
        if (!res || !res.statusCode) return 'info';
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            userId: req.raw.user?.userId,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
});
