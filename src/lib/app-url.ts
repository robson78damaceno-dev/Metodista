import "server-only";

function cleanEnv(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, "");
  return `https://${value.replace(/\/+$/, "")}`;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * URL pública para links em e-mails (/entrar/...).
 * Na Vercel, se APP_URL apontar para outro projeto/domínio, usa o domínio deste deploy.
 */
export function getPublicAppUrl(configuredAppUrl: string) {
  const configured = normalizeUrl(configuredAppUrl);

  if (!process.env.VERCEL) {
    return configured;
  }

  const production =
    cleanEnv(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    (cleanEnv(process.env.VERCEL_URL) ? `https://${cleanEnv(process.env.VERCEL_URL)}` : undefined);

  if (!production) {
    return configured;
  }

  const productionNormalized = normalizeUrl(production);
  const configuredHost = hostname(configured);
  const productionHost = hostname(productionNormalized);

  if (!configuredHost || !productionHost || configuredHost === productionHost) {
    return configured;
  }

  console.warn(
    `[app-url] APP_URL (${configuredHost}) não é o domínio deste deploy (${productionHost}). ` +
      `Links de votação usarão ${productionNormalized}. Ajuste APP_URL em Settings → Environment Variables.`
  );

  return productionNormalized;
}
