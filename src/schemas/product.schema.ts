import { z } from 'zod';

export const createProductSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    description: z.string().max(1000).optional(),
    price: z.coerce.number().positive('Price must be positive'),
    sku: z.string().min(3, 'SKU must be at least 3 characters').max(50),
    stock: z.coerce.number().int().min(0, 'Stock cannot be negative').default(0),
    categoryId: z.string().uuid('Invalid category ID'),
    isActive: z.boolean().default(true),
    images: z.array(z.string().url()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
