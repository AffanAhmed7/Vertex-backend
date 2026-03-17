import 'dotenv/config';
import { createServer } from 'http';
import { config } from './config/env.js';
import { createApp } from './app.js';
import { initSocket } from './lib/socket.js';
import { testConnection } from './lib/prisma.js';

import { logger } from './utils/logger.js';

const { PORT, HOST, NODE_ENV } = config;
const app = createApp();
const server = createServer(app);

// Initialize Socket.io
initSocket(server);

// Test database connection before starting server
async function startServer() {
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        logger.error('Failed to connect to database. Exiting...');
        process.exit(1);
    }
    
    logger.info('Database connection successful');

    // Background workers (optional)
    // Some worker deps (e.g. native modules) may not be available in all envs.
    // We load them dynamically so the API can still boot.
    if (process.env.ENABLE_WORKERS !== 'false') {
        const workerImports: Array<[name: string, path: string]> = [
            ['email', './workers/email.worker.js'],
            ['analytics', './workers/analytics.worker.js'],
            ['others', './workers/others.worker.js'],
        ];

        for (const [name, path] of workerImports) {
            try {
                await import(path);
                logger.info({ worker: name }, 'Worker loaded');
            } catch (err) {
                logger.warn({ err, worker: name }, 'Worker failed to load; continuing without it');
            }
        }
    } else {
        logger.info('Workers disabled via ENABLE_WORKERS=false');
    }
    
    // Start server
    server.listen(PORT, HOST, () => {
        logger.info({
            event: 'SERVER_STARTUP',
            environment: NODE_ENV,
            port: PORT,
            host: HOST
        }, 'E-Commerce Backend API started successfully');
    });
}

startServer().catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
    logger.info({ signal }, `${signal} received. Shutting down gracefully...`);
    
    server.close(async () => {
        logger.info('Server closed.');
        
        // Disconnect from database
        try {
            const { prisma } = await import('./lib/prisma.js');
            await prisma.$disconnect();
            logger.info('Database disconnected.');
        } catch (err) {
            logger.error({ err }, 'Error disconnecting from database');
        }
        
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Fatal error handling
process.on('unhandledRejection', (reason: any) => {
    logger.fatal({ err: reason }, 'Unhandled Promise Rejection');
    shutdown('FATAL_REJECTION');
});

process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'Uncaught Exception');
    shutdown('FATAL_EXCEPTION');
});

export default server;
