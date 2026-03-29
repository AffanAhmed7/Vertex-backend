import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { ImageJobData, WebhookJobData } from '../lib/queues.js';
import axios from 'axios';
import { logger } from '../utils/logger.js';

import sharp from 'sharp';

// Image Worker
export const imageWorker = new Worker(
    'imageQueue',
    async (job: Job<ImageJobData>) => {
        const { productId, imageUrls } = job.data;
        logger.info({ productId, imageCount: imageUrls.length }, '[ImageWorker] Optimizing images');

        for (const url of imageUrls) {
            try {
                logger.info({ url }, '[ImageWorker] Processing image');

                // 1. Download image
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);

                // 2. Optimize with sharp
                const optimizedBuffer = await sharp(buffer)
                    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 95, mozjpeg: true })
                    .toBuffer();

                logger.info({ url, originalSize: buffer.length, optimizedSize: optimizedBuffer.length }, '[ImageWorker] Image optimized');

                // 3. In a real app, upload to S3 here.
                // For now, we'll just log success as we don't have S3 credentials configured.
                // await uploadToS3(optimizedBuffer, `products/${productId}/${path.basename(url)}`);

            } catch (err) {
                logger.error({ err, url, productId }, '[ImageWorker] Failed to optimize image');
            }
        }

        logger.info({ productId }, '[ImageWorker] Optimization complete');
        return { success: true };
    },
    { connection: redisConnection }
);

// Webhook Worker
export const webhookWorker = new Worker(
    'webhookQueue',
    async (job: Job<WebhookJobData>) => {
        const { url, payload } = job.data;
        logger.info({ url }, '[WebhookWorker] Triggering webhook');

        try {
            await axios.post(url, payload, { timeout: 5000 });
            logger.info({ url }, '[WebhookWorker] Webhook sent successfully');
        } catch (err: any) {
            logger.error({ err, url }, '[WebhookWorker] Failed to send webhook');
            throw err; // Re-throw to trigger BullMQ retry
        }

        return { success: true };
    },
    { connection: redisConnection }
);
