import { z } from 'zod';

export const updateProfileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    avatar: z.string().nullable().optional(),
    twoFactorEnabled: z.boolean().optional(),
    securityQuestion: z.string().optional(),
    securityAnswer: z.string().optional(),
});

