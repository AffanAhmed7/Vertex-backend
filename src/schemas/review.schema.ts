import { z } from 'zod';

export const createReviewSchema = z.object({
    rating: z.coerce.number().int().min(1, 'Minimum rating is 1').max(5, 'Maximum rating is 5'),
    comment: z.string().min(3, 'Comment must be at least 3 characters').max(1000, 'Comment too long'),
});
