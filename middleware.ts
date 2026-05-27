import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Redis } from "@upstash/redis";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";
import { hmacSha256Edge, secureTokenEdge } from "@/lib/csrf-edge";
import { shouldUseMemoryRedis } from "@/lib/memory-redis";

const ADMIN_COOKIE = "concilio_admin";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
  setSecurityHeaders(response);
  await ensureCsrfCookie(request, response, requestHeaders);

  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    request.nextUrl.pathname !== "/admin/login" &&
    request.nextUrl.pathname !== "/admin/sair"
  ) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const valid = await isValidAdminToken(token);
    if (!valid) {
      const loginUrl = new URL("/admin/login", request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      setSecurityHeaders(redirectResponse);
      await ensureCsrfCookie(request, redirectResponse, new Headers(request.headers));
      return redirectResponse;
    }
  }

  return response;
}

async function ensureCsrfCookie(request: NextRequest, response: NextResponse, requestHeaders: Headers) {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (existing) {
    requestHeaders.set(CSRF_HEADER, existing);
    return;
  }

  const token = secureTokenEdge(32);
  requestHeaders.set(CSRF_HEADER, token);
  const csrfSecret = process.env.CSRF_SECRET;
  if (!csrfSecret) return;

  if (!shouldUseMemoryRedis()) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && redisToken) {
      const tokenHash = await hmacSha256Edge(token, csrfSecret);
      const redis = new Redis({ url, token: redisToken });
      await redis.set(`csrf:${tokenHash}`, "1", { ex: 45 * 60 });
    }
  }

  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 45 * 60
  });
}

async function isValidAdminToken(token?: string) {
  if (!token || !process.env.AUTH_SECRET) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
    return true;
  } catch {
    return false;
  }
}

function setSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
