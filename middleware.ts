import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth-constants";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";

function cleanEnv(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

function secureTokenEdge(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmacSha256Edge(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signCsrfEdge(token: string, secret: string) {
  const signature = await hmacSha256Edge(`csrf:${token}`, secret);
  return `${token}.${signature}`;
}

export async function middleware(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error("[middleware] falha:", error);
    const fallback = NextResponse.next();
    setSecurityHeaders(fallback);
    return fallback;
  }
}

async function ensureCsrfCookie(
  request: NextRequest,
  response: NextResponse,
  requestHeaders: Headers
) {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (existing) {
    requestHeaders.set(CSRF_HEADER, existing);
    return;
  }

  const csrfSecret = cleanEnv(process.env.CSRF_SECRET);
  if (!csrfSecret || csrfSecret.length < 24) return;

  const token = secureTokenEdge(32);
  const signed = await signCsrfEdge(token, csrfSecret);
  requestHeaders.set(CSRF_HEADER, signed);

  const isHttps = request.nextUrl.protocol === "https:";
  response.cookies.set(CSRF_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 45 * 60
  });
}

async function isValidAdminToken(token?: string) {
  const authSecret = cleanEnv(process.env.AUTH_SECRET);
  if (!token || !authSecret) return false;
  try {
    const { jwtVerify } = await import("jose");
    await jwtVerify(token, new TextEncoder().encode(authSecret));
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|logo-metodista.png|admin/sair).*)"]
};
