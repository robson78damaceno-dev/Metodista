export function sanitizeText(input?: string | null) {
  if (!input) return undefined;
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeFeedback(input?: string | null) {
  const value = sanitizeText(input);
  return value ? value.slice(0, 800) : undefined;
}
