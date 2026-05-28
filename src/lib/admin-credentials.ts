import "server-only";

import bcrypt from "bcryptjs";
import { redis } from "@/lib/redis";
import { cleanEnvValue } from "@/lib/runtime-secrets";

const ADMIN_CREDENTIALS_KEY = "admin:credentials";
const ADMIN_CREDENTIALS_VERSION_KEY = "admin:credentials:version";
const CREDENTIALS_SEED_VERSION = "admin-admin@@";
const BCRYPT_ROUNDS = 12;

export type AdminCredentialsRecord = {
  email: string;
  passwordHash: string;
  updatedAt: string;
};

function decodeCredentials(raw: unknown): AdminCredentialsRecord | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as AdminCredentialsRecord;
    if (!parsed.email || !parsed.passwordHash) return null;
    return {
      email: parsed.email.toLowerCase(),
      passwordHash: parsed.passwordHash,
      updatedAt: parsed.updatedAt ?? new Date().toISOString()
    };
  } catch {
    return null;
  }
}

async function readAdminCredentials() {
  return decodeCredentials(await redis.get<string>(ADMIN_CREDENTIALS_KEY));
}

async function ensureCredentialsSeedVersion() {
  const version = await redis.get<string>(ADMIN_CREDENTIALS_VERSION_KEY);
  if (version === CREDENTIALS_SEED_VERSION) return;
  await redis.del(ADMIN_CREDENTIALS_KEY);
  await redis.set(ADMIN_CREDENTIALS_VERSION_KEY, CREDENTIALS_SEED_VERSION);
}

export async function ensureAdminCredentials() {
  await ensureCredentialsSeedVersion();
  const existing = await readAdminCredentials();
  if (existing) return existing;

  const login = cleanEnvValue(process.env.SEED_ADMIN_LOGIN);
  const password = cleanEnvValue(process.env.SEED_ADMIN_PASSWORD);
  if (!login || !password) {
    throw new Error(
      "Conta admin não configurada. Defina SEED_ADMIN_LOGIN e SEED_ADMIN_PASSWORD na Vercel."
    );
  }
  const seeded: AdminCredentialsRecord = {
    email: login,
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    updatedAt: new Date().toISOString()
  };
  await redis.set(ADMIN_CREDENTIALS_KEY, JSON.stringify(seeded));
  return seeded;
}

export async function getAdminAccountEmail() {
  const creds = await ensureAdminCredentials();
  return creds.email;
}

export async function verifyAdminLogin(email: string, password: string) {
  const creds = await ensureAdminCredentials();
  if (email.trim().toLowerCase() !== creds.email) return false;
  return bcrypt.compare(password, creds.passwordHash);
}

export async function updateAdminCredentials(input: {
  currentPassword: string;
  email: string;
  newPassword?: string;
}) {
  const creds = await ensureAdminCredentials();
  const currentValid = await bcrypt.compare(input.currentPassword, creds.passwordHash);
  if (!currentValid) {
    throw new Error("Senha atual incorreta.");
  }

  const email = input.email.trim().toLowerCase();
  const passwordHash = input.newPassword
    ? await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS)
    : creds.passwordHash;

  const next: AdminCredentialsRecord = {
    email,
    passwordHash,
    updatedAt: new Date().toISOString()
  };

  await redis.set(ADMIN_CREDENTIALS_KEY, JSON.stringify(next));
  return next;
}
