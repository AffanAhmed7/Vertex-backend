import nodemailer from 'nodemailer';
import mjml2html from 'mjml';
import handlebars from 'handlebars';
import { config } from '../config/env.js';

import { logger } from '../utils/logger.js';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = config;

// Create Transporter
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    auth: SMTP_USER && SMTP_PASS ? {
        user: SMTP_USER,
        pass: SMTP_PASS,
    } : undefined,
    secure: SMTP_PORT === 465, // Use SSL/TLS for port 465
});

/**
 * Mailer Utility
 */
export const Mailer = {
    /**
     * Send an email using MJML and Handlebars
     */
    async sendEmail(to: string, subject: string, mjmlTemplate: string, context: any) {
        try {
            // 1. Compile Handlebars tags in MJML
            const template = handlebars.compile(mjmlTemplate);
            const mjmlWithData = template(context);

            // 2. Convert MJML to HTML
            const { html, errors } = mjml2html(mjmlWithData);

            if (errors && errors.length > 0) {
                logger.warn({ errors, template: mjmlTemplate.substring(0, 100) }, 'MJML Compilation Warnings');
            }

            // 3. Send Email
            const info = await transporter.sendMail({
                from: EMAIL_FROM,
                to,
                subject,
                html,
            });

            logger.info({ messageId: info.messageId, to, subject }, 'Email sent successfully');
            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error({ err: error, to, subject }, 'Failed to send email');
            throw error;
        }
    }
};
