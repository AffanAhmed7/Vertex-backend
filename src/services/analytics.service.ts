import { prisma } from '../lib/prisma.js';
import { redisConnection } from '../lib/redis.js';

const CACHE_TTL = 300; // 5 minutes

export const AnalyticsService = {
    /**
     * Get overview analytics (Totals)
     */
    async getOverview() {
        const cacheKey = 'analytics:overview';
        const cachedData = await redisConnection.get(cacheKey);

        if (cachedData) {
            return JSON.parse(cachedData);
        }

        const [revenueData, totalOrders, totalUsers] = await Promise.all([
            prisma.order.aggregate({
                _sum: { total: true },
                where: { status: { not: 'REFUNDED' } }
            }),
            prisma.order.count(),
            prisma.user.count({ where: { role: 'CUSTOMER' } })
        ]);

        const data = {
            totalRevenue: Number(revenueData._sum.total || 0),
            totalOrders,
            totalUsers
        };

        await redisConnection.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
        return data;
    },

    /**
     * Get sales snapshots for charts
     */
    async getSalesHistory(days = 30) {
        return prisma.dailySalesSnapshot.findMany({
            take: days,
            orderBy: { date: 'desc' }
        });
    },

    /**
     * Get top selling products
     */
    async getTopProducts(limit = 5) {
        const topProducts = await prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: limit
        });

        // Hydrate with names
        const hydrated = await Promise.all(topProducts.map(async (item: { productId: string; _sum: { quantity: number | null } }) => {
            const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { name: true, sku: true }
            });
            return {
                ...item,
                productName: product?.name || 'Unknown',
                sku: product?.sku || 'N/A',
                quantity: item._sum.quantity
            };
        }));

        return hydrated;
    },

    /**
     * Get products with low stock
     */
    async getLowStock(threshold = 5) {
        return prisma.product.findMany({
            where: { stock: { lt: threshold }, isActive: true },
            select: { id: true, name: true, stock: true, sku: true },
            orderBy: { stock: 'asc' }
        });
    },

    /**
     * Run daily snapshot aggregation (Idempotent)
     */
    async runDailySnapshot(targetDate: Date) {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Aggregate data for this date
        const [revenueData, totalOrders, newUsers] = await Promise.all([
            prisma.order.aggregate({
                _sum: { total: true },
                where: {
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    status: { not: 'REFUNDED' }
                }
            }),
            prisma.order.count({
                where: { createdAt: { gte: startOfDay, lte: endOfDay } }
            }),
            prisma.user.count({
                where: {
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    role: 'CUSTOMER'
                }
            })
        ]);

        const totalRevenue = Number(revenueData._sum.total || 0);

        // Upsert to snapshot table (date is unique)
        return prisma.dailySalesSnapshot.upsert({
            where: { date: startOfDay },
            update: { totalRevenue, totalOrders, newUsers },
            create: { date: startOfDay, totalRevenue, totalOrders, newUsers }
        });
    },

    /**
     * Clear analytics cache
     */
    async clearCache() {
        await redisConnection.del('analytics:overview');
    }
};
