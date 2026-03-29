import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import sharp from 'sharp';
import { Mailer } from './mailer.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Types for Job Payloads
export interface EmailJobData {
    to: string;
    subject: string;
    template: string;
    context: any;
}

export interface AnalyticsJobData {
    type: 'ORDER_CREATED' | 'DAILY_SNAPSHOT' | 'DAILY_SUMMARY' | 'MONTHLY_SUMMARY';
    data: any;
}

export interface ImageJobData {
    productId: string;
    imageUrls: string[];
}

export interface WebhookJobData {
    url: string;
    payload: any;
}



/**
 * Producer Helpers (Now immediate in-memory executors)
 */
export const addEmailJob = async (data: EmailJobData) => {
    const { to, subject, template, context } = data;
    logger.info({ to, template }, 'Processing email job (In-Memory)');
    try {
        const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${template}.mjml`);
        const mjmlContent = await fs.readFile(templatePath, 'utf8');
        await Mailer.sendEmail(to, subject, mjmlContent, context);
    } catch (error) {
        logger.error({ err: error, to }, 'Failed to send email in-memory');
    }
};

export const addAnalyticsJob = async (data: AnalyticsJobData) => {
    const { type, data: payload } = data;
    logger.info({ type }, 'Processing analytics job (In-Memory)');
    try {
        if (type === 'DAILY_SNAPSHOT') {
            const targetDate = payload?.date ? new Date(payload.date) : new Date();
            await AnalyticsService.runDailySnapshot(targetDate);
        } else if (type === 'ORDER_CREATED') {
            logger.debug({ orderId: payload.orderId }, 'Processing order event for analytics');
        }
    } catch (error) {
        logger.error({ err: error, type }, 'Failed to process analytics job in-memory');
    }
};

export const addImageJob = async (data: ImageJobData) => {
    const { productId, imageUrls } = data;
    logger.info({ productId, imageCount: imageUrls.length }, 'Optimizing images (In-Memory)');
    for (const url of imageUrls) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            const optimizedBuffer = await sharp(buffer)
                .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 95, mozjpeg: true })
                .toBuffer();
            logger.info({ url, originalSize: buffer.length, optimizedSize: optimizedBuffer.length }, 'Image optimized in-memory');
        } catch (err) {
            logger.error({ err, url, productId }, 'Failed to optimize image in-memory');
        }
    }
};

export const addWebhookJob = async (data: WebhookJobData) => {
    const { url, payload } = data;
    logger.info({ url }, 'Triggering webhook (In-Memory)');
    try {
        await axios.post(url, payload, { timeout: 5000 });
    } catch (err: any) {
        logger.error({ err, url }, 'Failed to send webhook in-memory');
    }
};
