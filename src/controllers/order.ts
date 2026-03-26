import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas/order.schema.js';
import { createAuditLog } from '../lib/audit.js';
import { sendAdminNotification, sendUserNotification } from '../lib/socket.js';
import { addEmailJob, addAnalyticsJob } from '../lib/queues.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { logger } from '../utils/logger.js';

// Define local enum to match Prisma schema if exports are problematic
enum OrderStatus {
    CREATED = 'CREATED',
    PAID = 'PAID',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    REFUNDED = 'REFUNDED',
}

export const OrderController = {
    /**
     * Create order from cart (Demo Payment)
     */
    async createOrder(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const validation = createOrderSchema.safeParse(req.body);

            if (!validation.success) {
                const errorMessages = validation.error.issues.map((i: any) => i.message).join(', ');
                return res.status(400).json({ success: false, error: 'Validation Error', message: errorMessages, details: validation.error.format() });
            }

            // Get cart items
            const cartItems = await prisma.cartItem.findMany({
                where: { userId },
                include: { product: true },
            });

            if (cartItems.length === 0) {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'Cart is empty' });
            }

            // Validate stock for all items
            for (const item of cartItems) {
                if (item.product.stock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad Request',
                        message: `Insufficient stock for product: ${item.product.name}`,
                    });
                }
            }

            // Calculate totals
            const subtotal = cartItems.reduce((acc: number, item: any) => {
                return acc + (Number(item.product.price) * item.quantity);
            }, 0);
            const tax = subtotal * 0.1; // 10% tax
            const total = subtotal + tax;

            // Extract shipping details from validated data
            const { shippingName, shippingPhone, shippingAddress, shippingCity, shippingZip } = validation.data;

            // Use a transaction
            const order = await prisma.$transaction(async (tx: any) => {
                // 1. Create order
                const newOrder = await tx.order.create({
                    data: {
                        userId,
                        subtotal,
                        tax,
                        total,
                        status: OrderStatus.PAID,
                        paymentIntentId: `demo_${Date.now()}`,
                        shippingName,
                        shippingPhone,
                        shippingAddress,
                        shippingCity,
                        shippingZip,
                        shippingCountry: validation.data.shippingCountry,
                        items: {
                            create: cartItems.map((item: any) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                priceAtPurchase: item.product.price,
                            })),
                        },
                    },
                    include: { items: true },
                });

                // 2. Update stock
                for (const item of cartItems) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } },
                    });
                }

                // 3. Clear cart
                await tx.cartItem.deleteMany({ where: { userId } });

                return newOrder;
            });

            // Emit notification to admins
            sendAdminNotification('newOrder', {
                orderId: order.id,
                amount: order.total,
                userId: req.user!.userId,
            });

            // Background jobs (non-critical, don't crash checkout if they fail)
            try {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { email: true, name: true },
                });

                if (user) {
                    await addEmailJob({
                        to: user.email,
                        subject: 'Order Confirmation',
                        template: 'order-confirmation',
                        context: {
                            name: user.name || user.email.split('@')[0],
                            orderId: order.id,
                            total: order.total.toString(),
                            orderUrl: `${req.protocol}://${req.get('host')}/orders/${order.id}`,
                        },
                    });
                }

                await addAnalyticsJob({
                    type: 'ORDER_CREATED',
                    data: { orderId: order.id, total: order.total },
                });

                // Invalidate analytics cache
                await AnalyticsService.clearCache();
            } catch (bgError) {
                logger.error({ err: bgError, orderId: order.id }, 'Non-critical background job failed after order creation');
            }

            return res.status(201).json({ success: true, data: order, message: 'Order placed successfully' });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId }, 'Create order error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to place order' });
        }
    },

    /**
     * Get all orders for user
     */
    async getOrders(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const orders = await prisma.order.findMany({
                where: { userId },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    image: true,
                                },
                            },
                        },
                    },
                    _count: { select: { items: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            return res.status(200).json({ success: true, data: orders });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId }, 'Get orders error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch orders' });
        }
    },

    /**
     * Get single order details
     */
    async getOrder(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;

            const order = await prisma.order.findUnique({
                where: { id: String(id) },
                include: {
                    items: {
                        include: { product: { select: { name: true, sku: true } } },
                    },
                },
            });

            if (!order) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Order not found' });
            }

            if (req.user!.role !== 'ADMIN' && order.userId !== userId) {
                return res.status(403).json({ success: false, error: 'Forbidden', message: 'Unauthorized access' });
            }

            return res.status(200).json({ success: true, data: order });
        } catch (error) {
            logger.error({ err: error, orderId: req.params?.id, userId: req.user?.userId }, 'Get order error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch order' });
        }
    },

    /**
     * Get all orders for admin panel
     */
    async getAllOrders(_req: Request, res: Response) {
        try {
            const orders = await prisma.order.findMany({
                include: {
                    user: { select: { name: true, email: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, image: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }) as any[];

            const formatted = orders.map((o: any) => ({
                id: o.id,
                customerName: o.user?.name || o.user?.email?.split('@')[0] || 'Unknown',
                customerEmail: o.user?.email || '',
                date: o.createdAt.toISOString(),
                total: Number(o.total),
                status: o.status === 'CREATED' ? 'Pending' :
                        o.status === 'PAID' ? 'Processing' :
                        o.status === 'SHIPPED' ? 'Shipped' :
                        o.status === 'DELIVERED' ? 'Delivered' : 'Cancelled',
                items: o.items.map((item: any) => ({
                    id: item.product?.id || item.productId,
                    name: item.product?.name || 'Unknown Product',
                    quantity: item.quantity,
                    price: Number(item.priceAtPurchase),
                })),
                shippingAddress: [o.shippingAddress, o.shippingCity, o.shippingZip].filter(Boolean).join(', ') || 'N/A',
                paymentStatus: o.status === 'REFUNDED' ? 'Refunded' : (o.paymentIntentId ? 'Paid' : 'Unpaid'),
            }));

            return res.status(200).json({ success: true, data: formatted });
        } catch (error) {
            logger.error({ err: error }, 'Get all orders error');
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },

    /**
     * Update order status (Admin)
     */
    async updateStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = updateOrderStatusSchema.safeParse(req.body);

            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const { status } = result.data;

            const order = await prisma.order.findUnique({ where: { id: String(id) } });
            if (!order) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Order not found' });
            }

            if (order.status === (OrderStatus.DELIVERED as any) && status !== (OrderStatus.REFUNDED as any)) {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'Cannot change status of delivered order except to REFUNDED' });
            }

            const updatedOrder = await prisma.order.update({
                where: { id: String(id) },
                data: { status: status as any },
            });

            // Audit Log
            await createAuditLog(req.user!.userId, 'UPDATE_STATUS', 'ORDER', updatedOrder.id, { status });

            // Invalidate analytics cache
            await AnalyticsService.clearCache();

            // Emit notification to user
            sendUserNotification(updatedOrder.userId, 'orderUpdated', {
                orderId: updatedOrder.id,
                status: updatedOrder.status,
            });

            return res.status(200).json({ success: true, data: updatedOrder, message: `Status updated to ${status}` });
        } catch (error) {
            logger.error({ err: error, orderId: req.params?.id, userId: req.user?.userId }, 'Update order status error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to update status' });
        }
    },
};
