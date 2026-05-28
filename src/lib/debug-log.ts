import "server-only";

import { getUpstashConfig } from "@/lib/redis";
import { shouldUseMemoryRedis } from "@/lib/memory-redis";

const PREFIX = "[concilio]";

function safeMeta(meta?: Record<string, unknown>) {
  return meta ?? {};
}

export function logStorageContext(scope: string) {
  const upstash = getUpstashConfig();
  const upstashHost = upstash?.url ? new URL(upstash.url).hostname : null;

  console.info(`${PREFIX} storage:${scope}`, {
    vercel: Boolean(process.env.VERCEL),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
    appUrl: process.env.APP_URL ?? null,
    useDevMemoryStore: process.env.USE_DEV_MEMORY_STORE ?? null,
    shouldUseMemoryRedis: shouldUseMemoryRedis(),
    upstashConfigured: Boolean(upstash),
    upstashHost,
    upstashTokenLength: upstash?.token?.length ?? 0
  });
}

export function debugLog(message: string, meta?: Record<string, unknown>) {
  console.info(`${PREFIX} ${message}`, safeMeta(meta));
}

export function debugError(message: string, error: unknown, meta?: Record<string, unknown>) {
  const base =
    error instanceof Error
      ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
      : { error: String(error) };

  console.error(`${PREFIX} ${message}`, { ...base, ...safeMeta(meta) });
}
