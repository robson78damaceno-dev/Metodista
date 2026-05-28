import { Redis } from "@upstash/redis";
import { debugError, debugLog } from "@/lib/debug-log";
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

let loggedClientMode = false;

function getRedisClient(): AppRedis {
  if (shouldUseMemoryRedis()) {
    if (!loggedClientMode) {
      loggedClientMode = true;
      debugLog("redis: cliente em memória (dev)");
    }
    return memoryRedis;
  }

  const config = getUpstashConfig();
  if (!config) {
    debugError("redis: Upstash não configurado", new Error(UPSTASH_NOT_CONFIGURED_MESSAGE));
    throw new Error(UPSTASH_NOT_CONFIGURED_MESSAGE);
  }

  if (!loggedClientMode) {
    loggedClientMode = true;
    try {
      debugLog("redis: cliente Upstash", { host: new URL(config.url).hostname });
    } catch {
      debugLog("redis: cliente Upstash", { urlInvalid: true });
    }
  }

  return createUpstashRedis(config);
}

const LOGGED_REDIS_OPS = new Set(["set", "get", "sadd", "smembers", "expire"]);

export const redis: AppRedis = new Proxy({} as AppRedis, {
  get(_target, prop) {
    const client = getRedisClient();
    const value = client[prop as keyof AppRedis];
    if (typeof value !== "function") return value;

    const methodName = String(prop);
    const original = (value as (...args: unknown[]) => unknown).bind(client);

    if (!LOGGED_REDIS_OPS.has(methodName)) {
      return original;
    }

    return async (...args: unknown[]) => {
      const key = typeof args[0] === "string" ? args[0] : String(args[0]);
      try {
        const result = await original(...args);
        debugLog(`redis.${methodName}`, {
          key,
          ok: true,
          resultPreview:
            result == null
              ? null
              : Array.isArray(result)
                ? { type: "array", length: result.length }
                : typeof result === "object"
                  ? { type: "object" }
                  : result
        });
        return result;
      } catch (error) {
        debugError(`redis.${methodName}: falha`, error, { key });
        throw error;
      }
    };
  }
});

if (shouldUseMemoryRedis() && process.env.NODE_ENV === "development") {
  console.info("[dev] Usando armazenamento em memória (configure Upstash no .env para persistir dados).");
}
