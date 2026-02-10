import { Queue, JobsOptions } from 'bullmq';
import { redisConnection } from './redis.js';

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

// Default job options
const defaultOptions: JobsOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
};

// Initialize Queues
export const emailQueue = new Queue('emailQueue', { connection: redisConnection });
export const analyticsQueue = new Queue('analyticsQueue', { connection: redisConnection });
export const imageQueue = new Queue('imageQueue', { connection: redisConnection });
export const webhookQueue = new Queue('webhookQueue', { connection: redisConnection });

/**
 * Producer Helpers
 */
export const addEmailJob = (data: EmailJobData) =>
    emailQueue.add('sendEmail', data, defaultOptions);

export const addAnalyticsJob = (data: AnalyticsJobData) =>
    analyticsQueue.add('processAnalytics', data, defaultOptions);

export const addImageJob = (data: ImageJobData) =>
    imageQueue.add('optimizeImages', data, defaultOptions);

export const addWebhookJob = (data: WebhookJobData) =>
    webhookQueue.add('triggerWebhook', data, defaultOptions);
