import "server-only";

export function cleanEnvValue(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getAuthSecret() {
  const secret = cleanEnvValue(process.env.AUTH_SECRET);
  if (!secret || secret.length < 24) return null;
  return secret;
}

export function getCsrfSecret() {
  const secret = cleanEnvValue(process.env.CSRF_SECRET);
  if (!secret || secret.length < 24) return null;
  return secret;
}

export function getCodeHashSecret() {
  const secret = cleanEnvValue(process.env.CODE_HASH_SECRET);
  if (!secret || secret.length < 24) return null;
  return secret;
}
