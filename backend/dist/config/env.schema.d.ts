import { z } from 'zod';
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        test: "test";
        production: "production";
    }>>;
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    MONGODB_URI: z.ZodString;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<{
        error: "error";
        fatal: "fatal";
        warn: "warn";
        info: "info";
        debug: "debug";
        trace: "trace";
        silent: "silent";
    }>>;
    THROTTLE_TTL_MS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    THROTTLE_LIMIT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    JWT_PRIVATE_KEY: z.ZodString;
    JWT_PUBLIC_KEY: z.ZodString;
    JWT_KEY_ID: z.ZodDefault<z.ZodString>;
    JWT_PREVIOUS_PUBLIC_KEY: z.ZodOptional<z.ZodString>;
    JWT_PREVIOUS_KEY_ID: z.ZodOptional<z.ZodString>;
    JWT_ISSUER: z.ZodDefault<z.ZodString>;
    JWT_AUDIENCE: z.ZodDefault<z.ZodString>;
    AUTH_PEPPER: z.ZodString;
    ARGON2_MAX_CONCURRENCY: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type Env = z.infer<typeof envSchema>;
export declare function validateEnv(config: Record<string, unknown>): Env;
