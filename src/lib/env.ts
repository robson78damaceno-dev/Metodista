import "server-only";

import { z } from "zod";

const envSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(24),
  CODE_HASH_SECRET: z.string().min(24),
  CSRF_SECRET: z.string().min(24),
  SEED_ADMIN_LOGIN: z.string().trim().min(2).toLowerCase(),
  SEED_ADMIN_PASSWORD: z.string().min(6),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export const env = envSchema.parse({
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  APP_URL: process.env.APP_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  CODE_HASH_SECRET: process.env.CODE_HASH_SECRET,
  CSRF_SECRET: process.env.CSRF_SECRET,
  SEED_ADMIN_LOGIN: process.env.SEED_ADMIN_LOGIN ?? process.env.SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
  NODE_ENV: process.env.NODE_ENV
});
