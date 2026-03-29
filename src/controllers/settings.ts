import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

export const SettingsController = {
    /**
     * Get store settings
     */
    async getSettings(_req: Request, res: Response) {
        try {
            let settings = await (prisma as any).settings.findFirst();
            
            // Initialize if not exists
            if (!settings) {
                settings = await (prisma as any).settings.create({ data: {} });
            }
            
            return res.status(200).json({ success: true, data: settings });
        } catch (error) {
            logger.error({ err: error }, 'Get settings error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Update store settings
     */
    async updateSettings(req: Request, res: Response) {
        try {
            const current = await (prisma as any).settings.findFirst();
            if (!current) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Settings record not found' });
            }

            const updated = await (prisma as any).settings.update({
                where: { id: current.id },
                data: req.body
            });

            return res.status(200).json({ success: true, data: updated, message: 'Configuration tactical update complete.' });
        } catch (error) {
            logger.error({ err: error, body: req.body }, 'Update settings error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Factory Reset: Purge all store data
     */
    async factoryReset(_req: Request, res: Response) {
        try {
            logger.warn('Factory reset initiated by admin');

            // Order of deletion to respect FK constraints
            await prisma.$transaction([
                prisma.review.deleteMany(),
                prisma.orderItem.deleteMany(),
                prisma.order.deleteMany(),
                prisma.cartItem.deleteMany(),
                prisma.product.deleteMany(),
                prisma.category.deleteMany(),
                prisma.dailySalesSnapshot.deleteMany(),
                // Reset settings to default
                (prisma as any).settings.deleteMany(),
                (prisma as any).settings.create({ data: {} })
            ]);

            logger.info('Factory reset completed successfully');
            return res.status(200).json({ 
                success: true, 
                message: 'Platform successfully restored to factory defaults. All operational data purged.' 
            });
        } catch (error) {
            logger.error({ err: error }, 'Factory reset error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to execute system reset.' });
        }
    }
};
