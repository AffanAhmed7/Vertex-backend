import { z } from 'zod';

export const createAddressSchema = z.object({
    type: z.enum(['SHIPPING', 'BILLING']).default('SHIPPING'),
    fullName: z.string().min(2, 'Full name is required'),
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    postalCode: z.string().min(3, 'Postal code is required'),
    country: z.string().min(2, 'Country is required'),
    isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();
