import { cookies, headers } from "next/headers";
import { hmacSha256, secureToken, timingSafeEqual } from "@/lib/crypto";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";
import { env } from "@/lib/env";
import { redis } from "@/lib/redis";
import { shouldUseMemoryRedis } from "@/lib/memory-redis";

export { CSRF_COOKIE } from "@/lib/csrf-constants";

function signDevCsrfToken(token: string) {
  return `${token}.${hmacSha256(`csrf:${token}`, env.CSRF_SECRET)}`;
}

function verifyDevCsrfToken(signed: string) {
  const [token, signature] = signed.split(".");
  if (!token || !signature) return false;
  const expected = hmacSha256(`csrf:${token}`, env.CSRF_SECRET);
  return timingSafeEqual(signature, expected);
}

export async function createCsrfToken() {
  if (shouldUseMemoryRedis()) {
    return signDevCsrfToken(secureToken(24));
  }

  const headerList = await headers();
  const fromMiddleware = headerList.get(CSRF_HEADER);
  if (fromMiddleware) return fromMiddleware;

  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_COOKIE)?.value;
  if (!token) {
    throw new Error("Sessão de segurança não iniciada. Recarregue a página.");
  }
  return token;
}

export async function assertCsrfToken(token: string) {
  if (shouldUseMemoryRedis()) {
    if (!verifyDevCsrfToken(token)) {
      throw new Error("Sessão de segurança expirada. Recarregue a página e tente novamente.");
    }
    return;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;

  if (!cookieToken || !timingSafeEqual(cookieToken, token)) {
    throw new Error("Sessão de segurança expirada. Recarregue a página e tente novamente.");
  }

  const tokenHash = hashCsrfToken(token);
  const stored = await redis.get(`csrf:${tokenHash}`);
  if (!stored) {
    throw new Error("Sessão de segurança expirada. Recarregue a página e tente novamente.");
  }
}

export function hashCsrfToken(token: string) {
  return hmacSha256(token, env.CSRF_SECRET);
}
