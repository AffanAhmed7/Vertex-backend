import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createReviewSchema } from '../schemas/review.schema.js';
import { logger } from '../utils/logger.js';

export const ReviewController = {
    /**
     * Create a review for a product
     */
    async createReview(req: Request, res: Response) {
        try {
            const productId = req.params.id as string;
            const userId = req.user!.userId;

            const result = createReviewSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const { rating, comment } = result.data;

            // Check if product exists
            const product = await prisma.product.findUnique({ where: { id: productId } }) as any;
            if (!product) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Product not found' });
            }

            // Ensure user hasn't reviewed this product already
            const existingReview = await prisma.review.findUnique({
                where: { userId_productId: { userId, productId } },
            });

            if (existingReview) {
                return res.status(400).json({ success: false, error: 'Conflict', message: 'You have already reviewed this product' });
            }

            // Create review and update product stats in a transaction
            const review = await prisma.$transaction(async (tx: any) => {
                const newReview = await tx.review.create({
                    data: { userId, productId, rating, comment },
                });

                // Recalculate average rating
                const reviews = await tx.review.findMany({
                    where: { productId },
                    select: { rating: true },
                });

                const numReviews = reviews.length;
                const avgRating = reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / numReviews;

                await tx.product.update({
                    where: { id: productId },
                    data: { avgRating, numReviews },
                });

                return newReview;
            });

            return res.status(201).json({ success: true, data: review, message: 'Review submitted successfully' });
        } catch (error) {
            logger.error({ err: error, productId: req.params?.id, userId: req.user?.userId }, 'Create review error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to submit review' });
        }
    },

    /**
     * Get all reviews for a product
     */
    async getProductReviews(req: Request, res: Response) {
        try {
            const productId = req.params.id as string;

            const reviews = await prisma.review.findMany({
                where: { productId },
                include: {
                    user: {
                        select: {
                            email: true,
                            name: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            const product = await prisma.product.findUnique({
                where: { id: productId },
                select: { avgRating: true, numReviews: true },
            } as any) as any;

            return res.status(200).json({
                success: true,
                data: {
                    reviews,
                    averageRating: product?.avgRating || 0,
                    totalReviews: product?.numReviews || 0,
                },
            });
        } catch (error) {
            logger.error({ err: error, productId: req.params?.id }, 'Get reviews error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch reviews' });
        }
    },

    /**
     * Delete a review (Admin only)
     */
    async deleteReview(req: Request, res: Response) {
        try {
            const reviewId = req.params.id as string;

            const review = await prisma.review.findUnique({ where: { id: reviewId } });
            if (!review) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Review not found' });
            }

            const { productId } = review;

            await prisma.$transaction(async (tx: any) => {
                await tx.review.delete({ where: { id: reviewId } });

                const reviews = await tx.review.findMany({
                    where: { productId },
                    select: { rating: true },
                });

                const numReviews = reviews.length;
                const avgRating = numReviews > 0
                    ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / numReviews
                    : 0;

                await tx.product.update({
                    where: { id: productId },
                    data: { avgRating, numReviews },
                });
            });

            return res.status(200).json({ success: true, message: 'Review deleted successfully' });
        } catch (error) {
            logger.error({ err: error, reviewId: req.params?.id, userId: req.user?.userId }, 'Delete review error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to delete review' });
        }
    },

    /**
     * Get all reviews by the current user
     */
    async getMyReviews(req: Request, res: Response) {
        try {
            const userId = req.user!.userId;

            const reviews = await prisma.review.findMany({
                where: { userId },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            return res.status(200).json({ success: true, data: reviews });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId }, 'Get my reviews error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch your reviews' });
        }
    },
};
