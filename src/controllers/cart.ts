import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { addToCartSchema, updateCartItemSchema } from '../schemas/cart.schema.js';
import { logger } from '../utils/logger.js';

export const CartController = {
    /**
     * Get current user's cart
     */
    async getCart(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;

            const cartItems = await prisma.cartItem.findMany({
                where: { userId },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            sku: true,
                            stock: true,
                            isActive: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            return res.status(200).json({ success: true, data: cartItems });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId }, 'Get cart error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch cart' });
        }
    },

    /**
     * Add item to cart or update quantity if exists
     */
    async addItem(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const result = addToCartSchema.safeParse(req.body);

            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const { productId, quantity } = result.data;

            // Check if product exists and is active
            const product = await prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product || !product.isActive) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Product not found or inactive' });
            }

            // Check stock
            if (product.stock < quantity) {
                return res.status(400).json({ success: false, error: 'Bad Request', message: `Only ${product.stock} items in stock` });
            }

            // Upsert cart item
            const cartItem = await prisma.cartItem.upsert({
                where: {
                    userId_productId: { userId, productId },
                },
                update: {
                    quantity: { increment: quantity },
                },
                create: {
                    userId,
                    productId,
                    quantity,
                },
            });

            // Verify total quantity doesn't exceed stock after update
            if (cartItem.quantity > product.stock) {
                // Rollback or adjust? Let's just hard cap it for now or return error
                await prisma.cartItem.update({
                    where: { id: cartItem.id },
                    data: { quantity: product.stock },
                });
                return res.status(400).json({
                    success: false,
                    error: 'Bad Request',
                    message: `Cannot add more than available stock. Total in cart adjusted to ${product.stock}.`
                });
            }

            return res.status(200).json({ success: true, data: cartItem, message: 'Item added to cart' });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId, productId: req.body?.productId }, 'Add to cart error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to add item to cart' });
        }
    },

    /**
     * Update quantity of a cart item
     */
    async updateItem(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const { productId } = req.params;
            const result = updateCartItemSchema.safeParse(req.body);

            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const { quantity } = result.data;

            // Check if cart item exists
            const existingItem = await prisma.cartItem.findUnique({
                where: { userId_productId: { userId, productId: String(productId) } },
                include: { product: true },
            });

            if (!existingItem) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Item not in cart' });
            }

            // Check stock
            if (existingItem.product.stock < quantity) {
                return res.status(400).json({ success: false, error: 'Bad Request', message: `Only ${existingItem.product.stock} items in stock` });
            }

            const updatedItem = await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity },
            });

            return res.status(200).json({ success: true, data: updatedItem, message: 'Cart updated' });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId, productId: req.params?.productId }, 'Update cart error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to update cart' });
        }
    },

    /**
     * Remove item from cart
     */
    async removeItem(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const { productId } = req.params;

            const existingItem = await prisma.cartItem.findUnique({
                where: { userId_productId: { userId, productId: String(productId) } },
            });

            if (!existingItem) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Item not in cart' });
            }

            await prisma.cartItem.delete({
                where: { id: existingItem.id },
            });

            return res.status(200).json({ success: true, message: 'Item removed from cart' });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId, productId: req.params?.productId }, 'Remove from cart error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to remove item from cart' });
        }
    },
};
