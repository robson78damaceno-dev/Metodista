import crypto from "crypto";
import { getAuthSecret, getCodeHashSecret } from "@/lib/runtime-secrets";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 9;

export function normalizeVotingCode(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function formatVotingCode(raw: string) {
  const normalized = normalizeVotingCode(raw).slice(0, CODE_LENGTH);
  return normalized.match(/.{1,3}/g)?.join("-") ?? normalized;
}

export function generateVotingCode() {
  let code = "";
  while (code.length < CODE_LENGTH) {
    const byte = crypto.randomBytes(1)[0];
    if (byte < Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length) {
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return formatVotingCode(code);
}

export function hashVotingCode(code: string) {
  const secret = getCodeHashSecret();
  if (!secret) {
    throw new Error("CODE_HASH_SECRET não configurado no servidor.");
  }
  return hmacSha256(normalizeVotingCode(code), secret);
}

export function hmacSha256(value: string, secret?: string) {
  const resolved = secret ?? getAuthSecret();
  if (!resolved) {
    throw new Error("AUTH_SECRET não configurado no servidor.");
  }
  return crypto.createHmac("sha256", resolved).update(value).digest("hex");
}

export function secureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function timingSafeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}
