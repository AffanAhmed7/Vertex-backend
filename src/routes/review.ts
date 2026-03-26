import { Router } from 'express';
import { ReviewController } from '../controllers/review.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';

const router = Router();

// Public routes (reviews for a product)
router.get('/products/:id/reviews', ReviewController.getProductReviews);

// Protected routes (customer submitting a review)
router.post('/products/:id/review', authenticate, ReviewController.createReview);
router.get('/reviews/me', authenticate, ReviewController.getMyReviews);

// Admin routes (deleting reviews)
router.delete('/admin/reviews/:id', authenticate, authorize(Role.ADMIN), ReviewController.deleteReview);

export default router;
