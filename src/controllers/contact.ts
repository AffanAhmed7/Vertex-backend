import { type Request, type Response } from 'express';
import { addEmailJob } from '../lib/queues.js';
import { logger } from '../utils/logger.js';

/**
 * Handle Contact Form Submission
 */
export const submitContact = async (req: Request, res: Response) => {
    const { name, email, message } = req.body;

    // 1. Basic Validation
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All communication fields are required.' });
    }

    // Email format validation (Regex for high-level check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid return address (Email) provided.' });
    }

    try {
        // 2. Queue Email Job (In-Memory)
        await addEmailJob({
            to: 'affanahmedkhan34@gmail.com',
            subject: `New Correspondence from ${name}`,
            template: 'contact-us',
            context: { 
                name, 
                email, 
                message,
                timestamp: new Date().toLocaleString()
            }
        });

        logger.info({ sender: email }, 'Contact correspondence received and queued');

        return res.status(200).json({ 
            message: 'Message dispatched successfully. Our team will review your inquiry shortly.' 
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to process contact correspondence');
        return res.status(500).json({ message: 'Internal system error during dispatch. Please try again later.' });
    }
};
