import { Redis } from "@upstash/redis";
import { memoryRedis, shouldUseMemoryRedis } from "@/lib/memory-redis";
import { cleanEnvValue } from "@/lib/runtime-secrets";

type SetOptions = {
  ex?: number;
  nx?: boolean;
};

export type AppRedis = {
  set(key: string, value: unknown, options?: SetOptions): Promise<string | null>;
  get<T>(key: string): Promise<T | null>;
  sadd(key: string, member: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
  scard(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  incr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hgetall<T extends Record<string, string | number>>(key: string): Promise<T | null>;
  rpush(key: string, value: unknown): Promise<number>;
  lrange(key: string, start: number, end: number): Promise<unknown[]>;
  del(key: string): Promise<number>;
};

const UPSTASH_NOT_CONFIGURED_MESSAGE =
  "Upstash Redis não está configurado. Na Vercel, cadastre UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN com valores reais em console.upstash.com.";

function isPlaceholderUpstashUrl(url: string) {
  const lower = url.toLowerCase();
  return (
    lower.includes("your-instance.upstash.io") ||
    lower.includes("build-placeholder") ||
    lower.includes("substituir") ||
    lower.includes("cole_")
  );
}

export function getUpstashConfig() {
  const url = cleanEnvValue(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token || isPlaceholderUpstashUrl(url)) return null;
  return { url, token };
}

const globalForRedis = globalThis as unknown as {
  redis?: AppRedis;
};

function createUpstashRedis(config: { url: string; token: string }): AppRedis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis({
      url: config.url,
      token: config.token
    }) as unknown as AppRedis;
  }
  return globalForRedis.redis;
}

function getRedisClient(): AppRedis {
  if (shouldUseMemoryRedis()) {
    return memoryRedis;
  }

  const config = getUpstashConfig();
  if (!config) {
    throw new Error(UPSTASH_NOT_CONFIGURED_MESSAGE);
  }

  return createUpstashRedis(config);
}

export const redis: AppRedis = new Proxy({} as AppRedis, {
  get(_target, prop) {
    const client = getRedisClient();
    const value = client[prop as keyof AppRedis];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  }
});

if (shouldUseMemoryRedis() && process.env.NODE_ENV === "development") {
  console.info("[dev] Usando armazenamento em memória (configure Upstash no .env para persistir dados).");
}
