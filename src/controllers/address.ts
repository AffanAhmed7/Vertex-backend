import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createAddressSchema, updateAddressSchema } from '../schemas/address.schema.js';
import { logger } from '../utils/logger.js';

export const AddressController = {
    /**
     * Get all addresses for the authenticated user
     */
    async getAddresses(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const addresses = await prisma.address.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });

            return res.status(200).json({ success: true, data: addresses });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId }, 'Get addresses error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Create a new address
     */
    async createAddress(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const result = createAddressSchema.safeParse(req.body);

            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const data = result.data;

            // If this is the first address or marked as default, unset other defaults
            if (data.isDefault) {
                await prisma.address.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                });
            } else {
                // Check if it's the first address, make it default if so
                const count = await prisma.address.count({ where: { userId } });
                if (count === 0) {
                    data.isDefault = true;
                }
            }

            const address = await prisma.address.create({
                data: {
                    ...data,
                    userId,
                },
            });

            return res.status(201).json({ success: true, data: address });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId }, 'Create address error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Update an address
     */
    async updateAddress(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const id = req.params['id'] as string;
            const result = updateAddressSchema.safeParse(req.body);

            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const address = await prisma.address.findUnique({ where: { id } });
            if (!address || address.userId !== userId) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Address not found' });
            }

            const data = result.data;

            if (data.isDefault) {
                await prisma.address.updateMany({
                    where: { userId, isDefault: true, NOT: { id } },
                    data: { isDefault: false },
                });
            }

            const updatedAddress = await prisma.address.update({
                where: { id },
                data,
            });

            return res.status(200).json({ success: true, data: updatedAddress });
        } catch (error) {
            logger.error({ err: error, addressId: req.params['id'], userId: req.user?.userId }, 'Update address error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Delete an address
     */
    async deleteAddress(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const id = req.params['id'] as string;

            const address = await prisma.address.findUnique({ where: { id } });
            if (!address || address.userId !== userId) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Address not found' });
            }

            await prisma.address.delete({ where: { id } });

            // If we deleted the default address, make the most recent one default
            if (address.isDefault) {
                const nextAddress = await prisma.address.findFirst({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                });
                if (nextAddress) {
                    await prisma.address.update({
                        where: { id: nextAddress.id },
                        data: { isDefault: true },
                    });
                }
            }

            return res.status(200).json({ success: true, message: 'Address deleted successfully' });
        } catch (error) {
            logger.error({ err: error, addressId: req.params['id'], userId: req.user?.userId }, 'Delete address error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Set an address as default
     */
    async setDefault(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const id = req.params['id'] as string;

            const address = await prisma.address.findUnique({ where: { id } });
            if (!address || address.userId !== userId) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Address not found' });
            }

            await prisma.$transaction([
                prisma.address.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                }),
                prisma.address.update({
                    where: { id },
                    data: { isDefault: true },
                }),
            ]);

            return res.status(200).json({ success: true, message: 'Default address updated' });
        } catch (error) {
            logger.error({ err: error, addressId: req.params['id'], userId: req.user?.userId }, 'Set default address error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
};
