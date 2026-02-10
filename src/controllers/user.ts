import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createAuditLog } from '../lib/audit.js';
import { logger } from '../utils/logger.js';

export const UserController = {
    /**
     * Get all users (Admin only)
     */
    async getUsers(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        emailVerified: true,
                        createdAt: true,
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.user.count(),
            ]);

            return res.status(200).json({
                success: true,
                data: users,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            logger.error({ err: error }, 'Get users error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Toggle user status (Admin only)
     */
    async toggleStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;

            // Ensure id is a string, not an array
            const userId = Array.isArray(id) ? id[0] : id;
            if (!userId || typeof userId !== 'string') {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid user ID' });
            }

            if (typeof isActive !== 'boolean') {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'isActive must be a boolean' });
            }

            const user = await prisma.user.update({
                where: { id: userId },
                data: { isActive },
            });

            // Audit Log
            await createAuditLog((req as any).user.id, 'UPDATE_STATUS', 'USER', user.id, { isActive });

            return res.status(200).json({ success: true, message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
        } catch (error) {
            const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            logger.error({ err: error, userId }, 'Toggle status error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Change user role (Admin only)
     */
    async changeRole(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { role } = req.body;

            // Ensure id is a string, not an array
            const userId = Array.isArray(id) ? id[0] : id;
            if (!userId || typeof userId !== 'string') {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid user ID' });
            }

            const validRoles = ['CUSTOMER', 'ADMIN'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid role' });
            }

            const user = await prisma.user.update({
                where: { id: userId },
                data: { role: role as any },
            });

            // Audit Log
            await createAuditLog((req as any).user.id, 'CHANGE_ROLE', 'USER', user.id, { role });

            return res.status(200).json({ success: true, message: 'User role updated successfully' });
        } catch (error) {
            const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            logger.error({ err: error, userId }, 'Change role error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
};
