import { Resend } from "resend";
import { env } from "@/lib/env";

export function isResendConfigured() {
  const key = env.RESEND_API_KEY;
  return Boolean(key && !key.includes("xxxxxxxx") && key !== "re_xxxxxxxxxxxxxxxxxxxxx");
}

const resend = isResendConfigured() ? new Resend(env.RESEND_API_KEY) : null;

export async function sendElectionResultsEmail(input: {
  electionTitle: string;
  recipients: [string, string];
  closedAt: string | null;
  rows: Array<{ candidate: string; yes: number; no: number; abstain: number }>;
  totalBallots: number;
}) {
  const rowsText = input.rows
    .map((row) => `- ${row.candidate}: ${row.yes} sim, ${row.no} não, ${row.abstain} abstenções`)
    .join("\n");
  const closedText = input.closedAt ? new Date(input.closedAt).toLocaleString("pt-BR") : "não informado";

  const text = [
    `Resultado final da votação: ${input.electionTitle}`,
    "",
    `Encerrada em: ${closedText}`,
    `Cédulas apuradas: ${input.totalBallots}`,
    "",
    "Apuração por candidato (Sim / Não / Abster):",
    rowsText
  ].join("\n");

  if (!resend) {
    console.info("[dev] Email de resultado (Resend não configurado):\n", text);
    return { delivered: false };
  }

  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.recipients,
    subject: `Resultado final - ${input.electionTitle}`,
    text
  });

  if (result.error) {
    console.error("[mailer] Falha ao enviar resultado:", result.error);
    return { delivered: false };
  }

  return { delivered: true };
}

export async function sendVotingLinkEmail(input: { to: string; electionTitle: string; url: string }) {
  const text = [
    `Votação: ${input.electionTitle}`,
    "",
    "Use o link abaixo para acessar sua cédula de votação anônima. Este link é pessoal e funciona apenas uma vez:",
    "",
    input.url,
    "",
    "Se você não solicitou este acesso, ignore este e-mail."
  ].join("\n");

  if (!resend) {
    console.info("[dev] Link de votação (Resend não configurado). Destino:", input.to, "\n", text);
    return { delivered: false };
  }

  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: `Seu link de votação - ${input.electionTitle}`,
    text
  });

  if (result.error) {
    console.error("[mailer] Falha ao enviar link de votação:", result.error);
    return { delivered: false, error: result.error.message };
  }

  return { delivered: true };
}
