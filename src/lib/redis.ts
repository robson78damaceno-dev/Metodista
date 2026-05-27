import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { memoryRedis, shouldUseMemoryRedis } from "@/lib/memory-redis";

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

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

function createUpstashRedis(): AppRedis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN
    });
  }
  return globalForRedis.redis as unknown as AppRedis;
}

export const redis: AppRedis = shouldUseMemoryRedis() ? memoryRedis : createUpstashRedis();

if (shouldUseMemoryRedis() && env.NODE_ENV === "development") {
  console.info("[dev] Usando armazenamento em memória (configure Upstash no .env para persistir dados).");
}
