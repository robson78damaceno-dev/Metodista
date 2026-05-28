import { cookies, headers } from "next/headers";
import { hmacSha256, secureToken, timingSafeEqual } from "@/lib/crypto";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";
import { env } from "@/lib/env";

export { CSRF_COOKIE } from "@/lib/csrf-constants";

function signCsrfToken(token: string) {
  return `${token}.${hmacSha256(`csrf:${token}`, env.CSRF_SECRET)}`;
}

function verifySignedCsrfToken(signed: string) {
  const [token, signature] = signed.split(".");
  if (!token || !signature) return false;
  const expected = hmacSha256(`csrf:${token}`, env.CSRF_SECRET);
  return timingSafeEqual(signature, expected);
}

export async function createCsrfToken() {
  const headerList = await headers();
  const fromMiddleware = headerList.get(CSRF_HEADER);
  if (fromMiddleware) return fromMiddleware;

  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_COOKIE)?.value;
  if (token) return token;

  return createSignedCsrfToken();
}

export async function assertCsrfToken(token: string) {
  if (!verifySignedCsrfToken(token)) {
    throw new Error("Sessão de segurança expirada. Recarregue a página e tente novamente.");
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (cookieToken && !timingSafeEqual(cookieToken, token)) {
    throw new Error("Sessão de segurança expirada. Recarregue a página e tente novamente.");
  }
}

export function createSignedCsrfToken() {
  return signCsrfToken(secureToken(24));
}
