import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { AnalyticsJobData } from '../lib/queues.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { logger } from '../utils/logger.js';

export const analyticsWorker = new Worker(
    'analyticsQueue',
    async (job: Job<AnalyticsJobData>) => {
        const { type, data } = job.data;

        logger.info({
            jobId: job.id,
            type,
            queue: 'analyticsQueue'
        }, 'Processing analytics job');

        try {
            if (type === 'DAILY_SNAPSHOT') {
                const targetDate = data?.date ? new Date(data.date) : new Date();
                logger.info({ targetDate: targetDate.toDateString() }, 'Running daily snapshot');
                await AnalyticsService.runDailySnapshot(targetDate);
            } else if (type === 'ORDER_CREATED') {
                logger.debug({ orderId: data.orderId }, 'Processing order event for analytics');
            }

            return { success: true };
        } catch (error) {
            logger.error({
                err: error,
                jobId: job.id,
                type
            }, 'Failed to process analytics job');
            throw error;
        }
    },
    { connection: redisConnection }
);

analyticsWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: 'analyticsQueue' }, 'Analytics job completed');
});

analyticsWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err, queue: 'analyticsQueue' }, 'Analytics job failed');
});
