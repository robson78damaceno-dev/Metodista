"use server";

import { redirect } from "next/navigation";
import { assertCsrfToken } from "@/lib/csrf";
import { hashCpf } from "@/lib/cpf-server";
import { clearBallotCookie, getBallotSession, hashBallotJti } from "@/lib/ballot";
import { getOpenElection, issueVotingLinkForCpf, submitVote } from "@/lib/election-store";
import { isResendConfigured, sendVotingLinkEmail } from "@/lib/mailer";
import { env } from "@/lib/env";
import { assertRateLimit, getRequestRateKey } from "@/lib/rate-limit";
import { sanitizeFeedback } from "@/lib/sanitize";
import type { ActionState } from "@/types/actions";
import { requestVotingLinkSchema, submitVoteSchema } from "@/validations/voting";
import { uuidSchema } from "@/validations/common";
import { z } from "zod";

const GENERIC_LINK_MESSAGE =
  "Se os dados estiverem corretos, você receberá o e-mail com o link de votação em instantes.";

import { ALREADY_VOTED_MESSAGE } from "@/lib/voting-messages";

type RequestLinkData = {
  devLink?: string;
  alreadyVoted?: boolean;
};

const candidateDecisionSchema = z.object({
  candidateId: uuidSchema,
  choice: z.enum(["YES", "NO", "ABSTAIN"]),
  feedback: z.string().optional()
});

export async function requestVotingLinkAction(
  _: ActionState<RequestLinkData>,
  formData: FormData
): Promise<ActionState<RequestLinkData>> {
  try {
    const parsed = requestVotingLinkSchema.parse(Object.fromEntries(formData));
    await assertCsrfToken(parsed.csrfToken);

    const cpfHash = hashCpf(parsed.cpf);
    await assertRateLimit({
      action: "request-voting-link",
      identifier: await getRequestRateKey("request-voting-link"),
      limit: 20,
      windowSeconds: 15 * 60
    });
    await assertRateLimit({
      action: "request-voting-link-cpf",
      identifier: cpfHash,
      limit: 5,
      windowSeconds: 15 * 60
    });

    const election = await getOpenElection();
    if (!election) {
      if (env.NODE_ENV === "development") {
        return {
          ok: false,
          message: "Nenhuma votação aberta. No painel admin (/admin), crie a eleição e clique em Abrir."
        };
      }
      return { ok: true, message: GENERIC_LINK_MESSAGE };
    }

    const issued = await issueVotingLinkForCpf(election.id, cpfHash);
    if (!issued.ok) {
      if (issued.reason === "already_voted") {
        return { ok: false, message: ALREADY_VOTED_MESSAGE, data: { alreadyVoted: true } };
      }
      return { ok: true, message: GENERIC_LINK_MESSAGE };
    }

    const mail = await sendVotingLinkEmail({
      to: parsed.email,
      electionTitle: election.title,
      url: issued.url
    });

    if (mail.delivered) {
      return { ok: true, message: GENERIC_LINK_MESSAGE };
    }

    if (!isResendConfigured()) {
      return {
        ok: true,
        message:
          "Resend não está configurado. Use o link abaixo para testar (em produção ele será enviado por e-mail).",
        data: { devLink: issued.url }
      };
    }

    return {
      ok: false,
      message: "Não foi possível enviar o e-mail agora. Verifique a configuração do Resend e tente novamente."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível processar sua solicitação."
    };
  }
}

export async function submitVoteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = submitVoteSchema.parse(Object.fromEntries(formData));
    await assertCsrfToken(parsed.csrfToken);
    const decisions = z.array(candidateDecisionSchema).parse(JSON.parse(parsed.decisions));

    const ballot = await getBallotSession();
    if (!ballot) {
      return { ok: false, message: "Sua sessão anônima expirou. Abra novamente o link enviado por e-mail." };
    }

    await assertRateLimit({
      action: "submit-vote",
      identifier: ballot.jti,
      limit: 3,
      windowSeconds: 20 * 60
    });

    const tokenHash = hashBallotJti(ballot.jti);
    const sanitizedDecisions = decisions.map((decision) => ({
      candidateId: decision.candidateId,
      choice: decision.choice,
      feedback: sanitizeFeedback(decision.feedback)
    }));

    await submitVote({
      electionId: ballot.electionId,
      decisions: sanitizedDecisions,
      tokenHash
    });

    await clearBallotCookie();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível registrar o voto."
    };
  }

  redirect("/sucesso");
}
