import { z } from 'zod';
export const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    MONGODB_URI: z.string().min(1),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
        .default('info'),
    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
    JWT_PRIVATE_KEY: z.string().min(1),
    JWT_PUBLIC_KEY: z.string().min(1),
    JWT_KEY_ID: z.string().min(1).default('k1'),
    JWT_PREVIOUS_PUBLIC_KEY: z.string().optional(),
    JWT_PREVIOUS_KEY_ID: z.string().optional(),
    JWT_ISSUER: z.string().min(1).default('agrotrust-api'),
    JWT_AUDIENCE: z.string().min(1).default('agrotrust-clients'),
    AUTH_PEPPER: z.string().min(32),
    TOTP_ENCRYPTION_KEY: z.string().min(32),
    ARGON2_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
});
export function validateEnv(config) {
    const result = envSchema.safeParse(config);
    if (!result.success) {
        const details = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ');
        throw new Error(`Invalid environment configuration: ${details}`);
    }
    return result.data;
}
//# sourceMappingURL=env.schema.js.map