import "server-only";

import { z } from "zod";

function cleanEnv(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

function isPlaceholderValue(value: string | undefined) {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return (
    normalized.includes("substituir") ||
    normalized.includes("cole_") ||
    normalized.includes("copiar_") ||
    normalized.includes("your-instance.upstash.io") ||
    normalized === "your-upstash-token" ||
    normalized === "re_xxxxxxxxxxxxxxxxxxxxx"
  );
}

function parseEmailFrom(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function normalizeAppUrl(value: string | undefined) {
  const cleaned = cleanEnv(value);
  if (!cleaned) return undefined;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

const envSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z
    .string()
    .min(3)
    .refine((value) => z.string().email().safeParse(parseEmailFrom(value)).success, {
      message: "Use um e-mail válido ou o formato Nome <email@dominio.com>"
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
  NODE_ENV: z.enum(["development", "test", "production"]).default("production")
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
  const nodeEnv = cleanEnv(process.env.NODE_ENV);
  const safeNodeEnv =
    nodeEnv === "development" || nodeEnv === "test" || nodeEnv === "production" ? nodeEnv : "production";

  return {
    UPSTASH_REDIS_REST_URL: cleanEnv(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
    RESEND_API_KEY: cleanEnv(process.env.RESEND_API_KEY),
    EMAIL_FROM: cleanEnv(process.env.EMAIL_FROM),
    APP_URL: normalizeAppUrl(process.env.APP_URL),
    AUTH_SECRET: cleanEnv(process.env.AUTH_SECRET),
    CODE_HASH_SECRET: cleanEnv(process.env.CODE_HASH_SECRET),
    CSRF_SECRET: cleanEnv(process.env.CSRF_SECRET),
    SEED_ADMIN_LOGIN: cleanEnv(process.env.SEED_ADMIN_LOGIN ?? process.env.SEED_ADMIN_EMAIL),
    SEED_ADMIN_PASSWORD: cleanEnv(process.env.SEED_ADMIN_PASSWORD),
    NODE_ENV: safeNodeEnv
  };
}

function mergeDefined(base: Record<string, unknown>, overrides: Record<string, unknown>) {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    if (typeof value === "string" && isPlaceholderValue(value)) continue;
    result[key] = value;
  }
  return result;
}

function hasValidUpstashEnv(input: ReturnType<typeof readEnvFromProcess>) {
  return (
    Boolean(input.UPSTASH_REDIS_REST_URL) &&
    Boolean(input.UPSTASH_REDIS_REST_TOKEN) &&
    !isPlaceholderValue(input.UPSTASH_REDIS_REST_URL) &&
    !isPlaceholderValue(input.UPSTASH_REDIS_REST_TOKEN)
  );
}

function resolveEnvInput() {
  const fromProcess = readEnvFromProcess();
  if (hasValidUpstashEnv(fromProcess)) {
    return fromProcess;
  }

  const isNextBuild =
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build";
  if (isNextBuild) {
    console.warn(
      "[build] Upstash/variáveis inválidas ou placeholder — usando valores temporários só para compilar. " +
        "Confira docs/VERCEL_VARIAVEIS.md e faça Redeploy."
    );
    return mergeDefined(BUILD_STUBS, fromProcess);
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Variáveis de ambiente inválidas na Vercel. Não use textos como SUBSTITUIR_NO_UPSTASH ou COPIAR_LINHA_8_DO_ENV. " +
        "Use valores reais do Upstash, Resend e do seu .env. Veja docs/VERCEL_VARIAVEIS.md"
    );
  }

  return fromProcess;
}

let cachedEnv: AppEnv | null = null;

function formatEnvError(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(" | ");
}

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(resolveEnvInput());
  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente inválidas (${formatEnvError(parsed.error)}). ` +
        "Revise Settings → Environment Variables na Vercel. Veja docs/VERCEL_VARIAVEIS.md"
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
  if (!login || !password || isPlaceholderValue(login) || isPlaceholderValue(password)) {
    throw new Error(
      "Conta admin ainda não existe no Redis. Defina SEED_ADMIN_LOGIN e SEED_ADMIN_PASSWORD " +
        "nas variáveis de ambiente da Vercel e faça um redeploy."
    );
  }
  return { login, password };
}
