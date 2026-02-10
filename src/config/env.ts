import { z } from 'zod';

/**
 * Environment variable schema with Zod validation
 */
const envSchema = z.object({
    // Server
    NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),
    PORT: z.coerce.number().positive().default(5000),
    HOST: z.string().default('localhost'),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // JWT
    JWT_ACCESS_SECRET: z
        .string()
        .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z
        .string()
        .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

    // Payment Provider (optional - add when ready)
    PAYMENT_PROVIDER: z.enum(['jazzcash', 'easypaisa', '2checkout', 'paddle', 'demo']).default('demo'),
    PAYMENT_SECRET_KEY: z.string().optional(),
    PAYMENT_MERCHANT_ID: z.string().optional(),

    // Redis (optional)
    REDIS_URL: z.string().url().optional(),

    // SMTP
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional().default(2525),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional().default('noreply@example.com'),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables and export config
 * Throws an error if validation fails
 */
function validateEnv(): Env {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        // Using console.error here instead of logger because env validation
        // happens before logger initialization
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
}

export const config = validateEnv();

export default config;
