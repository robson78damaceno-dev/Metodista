import "server-only";

import { z } from "zod";

function parseEmailFrom(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

const envSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z
    .string()
    .min(3)
    .refine((value) => z.string().email().safeParse(parseEmailFrom(value)).success, {
      message: 'Use um e-mail válido ou o formato Nome <email@dominio.com>'
    }),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(24),
  CODE_HASH_SECRET: z.string().min(24),
  CSRF_SECRET: z.string().min(24),
  SEED_ADMIN_LOGIN: z
    .string()
    .trim()
    .min(2)
    .transform((value) => value.toLowerCase())
    .optional(),
  SEED_ADMIN_PASSWORD: z.string().min(6).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

const parsed = envSchema.safeParse({
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

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(
    `Variáveis de ambiente inválidas ou ausentes (${missing}). ` +
      "Configure todas no painel da Vercel (Settings → Environment Variables). " +
      "Veja docs/DEPLOY_VERCEL.md"
  );
}

export const env = parsed.data;

export function requireSeedAdminCredentials() {
  const login = env.SEED_ADMIN_LOGIN;
  const password = env.SEED_ADMIN_PASSWORD;
  if (!login || !password) {
    throw new Error(
      "Conta admin ainda não existe no Redis. Defina SEED_ADMIN_LOGIN e SEED_ADMIN_PASSWORD " +
        "nas variáveis de ambiente da Vercel e faça um redeploy."
    );
  }
  return { login, password };
}
