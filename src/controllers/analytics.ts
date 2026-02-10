import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { logger } from '../utils/logger.js';

export const AnalyticsController = {
    /**
     * GET /api/admin/analytics/overview
     */
    async getOverview(_req: Request, res: Response) {
        try {
            const data = await AnalyticsService.getOverview();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            logger.error({ err: error }, 'Analytics overview error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * GET /api/admin/analytics/sales
     */
    async getSalesHistory(req: Request, res: Response) {
        try {
            const days = req.query.days ? parseInt(req.query.days as string) : 30;
            const data = await AnalyticsService.getSalesHistory(days);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            logger.error({ err: error, days: req.query.days }, 'Analytics sales history error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * GET /api/admin/analytics/top-products
     */
    async getTopProducts(req: Request, res: Response) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
            const data = await AnalyticsService.getTopProducts(limit);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            logger.error({ err: error, limit: req.query.limit }, 'Analytics top products error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * GET /api/admin/analytics/low-stock
     */
    async getLowStock(req: Request, res: Response) {
        try {
            const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 5;
            const data = await AnalyticsService.getLowStock(threshold);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            logger.error({ err: error, threshold: req.query.threshold }, 'Analytics low stock error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
};
