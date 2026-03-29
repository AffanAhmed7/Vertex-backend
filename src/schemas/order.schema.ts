import { z } from 'zod';
// Define local enum if prisma export is problematic during build
enum OrderStatus {
    CREATED = 'CREATED',
    PAID = 'PAID',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    REFUNDED = 'REFUNDED',
}

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
    password: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    token: z.string().min(1, 'Reset token is required'),
});

export const createOrderSchema = z.object({
    shippingName: z.string().min(1, 'Name is required').max(100),
    shippingPhone: z.string().min(5, 'Phone number is required').max(20),
    shippingAddress: z.string().min(2, 'Address is required').max(255),
    shippingCity: z.string().min(1, 'City is required').max(100),
    shippingZip: z.string().min(1, 'ZIP code is required').max(20),
    shippingCountry: z.string().min(1, 'Country is required').max(100).optional(),
});

export const updateOrderStatusSchema = z.object({
    status: z.nativeEnum(OrderStatus),
});
