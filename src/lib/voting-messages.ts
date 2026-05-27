export const ALREADY_VOTED_MESSAGE = "Você já votou nesta eleição.";

const HOME_ERROR_MESSAGES: Record<string, string> = {
  "ja-votou": ALREADY_VOTED_MESSAGE,
  "link-expirado": "Este link expirou ou já foi utilizado. Solicite um novo acesso com seu CPF.",
  "link-invalido": "Link de votação inválido.",
  "votacao-fechada": "A votação não está aberta no momento.",
  "sem-candidatos": "A votação ainda não possui candidatos ativos."
};

export function homeErrorMessage(code?: string | null) {
  if (!code) return null;
  return HOME_ERROR_MESSAGES[code] ?? null;
}
