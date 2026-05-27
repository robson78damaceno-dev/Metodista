import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { env } from "@/lib/env";
import { hmacSha256, secureToken } from "@/lib/crypto";

export const BALLOT_COOKIE = "concilio_ballot";
const encoder = new TextEncoder();

export type BallotSession = {
  electionId: string;
  jti: string;
};

export async function createBallotToken(electionId: string) {
  const jti = secureToken(32);
  const token = await new SignJWT({
    electionId,
    jti
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("20m")
    .sign(encoder.encode(env.AUTH_SECRET));

  return { token, jti };
}

export async function setBallotCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(BALLOT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 20
  });
}

export async function clearBallotCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(BALLOT_COOKIE);
}

export async function getBallotSession(): Promise<BallotSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(BALLOT_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encoder.encode(env.AUTH_SECRET));
    if (typeof payload.electionId !== "string" || typeof payload.jti !== "string") {
      return null;
    }
    return {
      electionId: payload.electionId,
      jti: payload.jti
    };
  } catch {
    return null;
  }
}

export function hashBallotJti(jti: string) {
  return hmacSha256(`ballot:${jti}`, env.AUTH_SECRET);
}
