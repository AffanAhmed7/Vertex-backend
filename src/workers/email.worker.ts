import { Worker, Job } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { redisConnection } from '../lib/redis.js';
import { EmailJobData } from '../lib/queues.js';
import { Mailer } from '../lib/mailer.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const emailWorker = new Worker(
    'emailQueue',
    async (job: Job<EmailJobData>) => {
        const { to, subject, template, context } = job.data;

        logger.info({
            jobId: job.id,
            to,
            template,
            queue: 'emailQueue'
        }, 'Processing email job');

        try {
            // 1. Read MJML template from file
            const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${template}.mjml`);
            const mjmlContent = await fs.readFile(templatePath, 'utf8');

            // 2. Send real email
            await Mailer.sendEmail(to, subject, mjmlContent, context);

            return { success: true };
        } catch (error) {
            logger.error({
                err: error,
                jobId: job.id,
                to,
                template
            }, 'Failed to send email');
            throw error; // Re-throw to trigger BullMQ retry
        }
    },
    { connection: redisConnection }
);

emailWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: 'emailQueue' }, 'Email job completed');
});

emailWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err, queue: 'emailQueue' }, 'Email job failed');
});
