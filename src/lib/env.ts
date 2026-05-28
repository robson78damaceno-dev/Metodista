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

export type AppEnv = z.infer<typeof envSchema>;

const BUILD_STUBS = {
  UPSTASH_REDIS_REST_URL: "https://build-placeholder.invalid",
  UPSTASH_REDIS_REST_TOKEN: "build-placeholder-token",
  RESEND_API_KEY: "re_build_placeholder_key",
  EMAIL_FROM: "build@placeholder.dev",
  APP_URL: "https://build-placeholder.vercel.app",
  AUTH_SECRET: "build-placeholder-auth-secret-32chars",
  CODE_HASH_SECRET: "build-placeholder-code-secret-32ch",
  CSRF_SECRET: "build-placeholder-csrf-secret-32chars",
  NODE_ENV: "production" as const
};

function readEnvFromProcess() {
  return {
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
  };
}

function mergeDefined(base: Record<string, unknown>, overrides: Record<string, unknown>) {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function hasRequiredProductionEnv() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim());
}

function resolveEnvInput() {
  const fromProcess = readEnvFromProcess();
  if (hasRequiredProductionEnv()) {
    return fromProcess;
  }

  const isNextBuild =
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build";
  if (isNextBuild) {
    console.warn(
      "[build] Variáveis de ambiente ausentes — usando placeholders só para compilar. " +
        "Configure todas em Vercel → Settings → Environment Variables (Production) e faça Redeploy."
    );
    return mergeDefined(BUILD_STUBS, fromProcess);
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Variáveis de ambiente não configuradas na Vercel. " +
        "Vá em Settings → Environment Variables, adicione UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, " +
        "RESEND_API_KEY, EMAIL_FROM, AUTH_SECRET, CODE_HASH_SECRET, CSRF_SECRET (e SEED_ADMIN_*), " +
        "marque Production e faça Redeploy. Veja docs/VERCEL_VARIAVEIS.md"
    );
  }

  return fromProcess;
}

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(resolveEnvInput());
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes (${missing}). ` +
        "Configure todas no painel da Vercel (Settings → Environment Variables → Production). " +
        "Veja docs/VERCEL_VARIAVEIS.md"
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export const env = new Proxy({} as AppEnv, {
  get(_target, prop) {
    const value = getEnv()[prop as keyof AppEnv];
    return value;
  }
});

export function requireSeedAdminCredentials() {
  const { SEED_ADMIN_LOGIN: login, SEED_ADMIN_PASSWORD: password } = getEnv();
  if (!login || !password) {
    throw new Error(
      "Conta admin ainda não existe no Redis. Defina SEED_ADMIN_LOGIN e SEED_ADMIN_PASSWORD " +
        "nas variáveis de ambiente da Vercel e faça um redeploy."
    );
  }
  return { login, password };
}
