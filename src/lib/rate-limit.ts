import { headers } from "next/headers";
import { hmacSha256 } from "@/lib/crypto";
import { redis } from "@/lib/redis";

type RateLimitOptions = {
  action: string;
  identifier?: string;
  limit: number;
  windowSeconds: number;
};

export async function getRequestRateKey(prefix: string) {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerList.get("x-real-ip")?.trim();
  const value = forwardedFor || realIp || "unknown";
  return `${prefix}:${hmacSha256(value)}`;
}

export async function assertRateLimit({ action, identifier, limit, windowSeconds }: RateLimitOptions) {
  const key = hmacSha256(identifier ?? (await getRequestRateKey(action)));
  const bucketKey = `rate-limit:${action}:${key}`;
  const count = await redis.incr(bucketKey);
  if (count === 1) {
    await redis.expire(bucketKey, windowSeconds);
  }
  if (count > limit) {
    throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  }
}
