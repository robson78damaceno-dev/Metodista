"use server";

import { revalidatePath } from "next/cache";
import { assertCsrfToken } from "@/lib/csrf";
import { sendElectionResultsEmail } from "@/lib/mailer";
import {
  closeOtherOpenElections,
  createElection,
  getElectionResult,
  saveCandidate,
  setElectionStatus,
  updateElection
} from "@/lib/election-store";
import { requireAdminSession } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import type { ActionState } from "@/types/actions";
import { candidateSchema, changeElectionStatusSchema, electionSchema } from "@/validations/admin";

export async function saveElectionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdminSession();
    const parsed = electionSchema.parse(Object.fromEntries(formData));
    await assertCsrfToken(parsed.csrfToken);

    const data = {
      title: sanitizeText(parsed.title) ?? parsed.title,
      description: sanitizeText(parsed.description) ?? null,
      recipientEmail1: parsed.recipientEmail1,
      recipientEmail2: parsed.recipientEmail2
    };

    if (parsed.id) {
      const updated = await updateElection(parsed.id, data);
      if (!updated) {
        return { ok: false, message: "Eleição não encontrada." };
      }
      await audit(admin.sub, "election.update", { electionId: parsed.id });
    } else {
      const election = await createElection(data);
      await audit(admin.sub, "election.create", { electionId: election.id });
    }

    revalidatePath("/admin");
    return {
      ok: true,
      message: parsed.id ? "Eleição salva com sucesso." : "Eleição criada com sucesso."
    };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, "Não foi possível salvar a eleição.") };
  }
}

export async function saveCandidateAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdminSession();
    const parsed = candidateSchema.parse(Object.fromEntries(formData));
    await assertCsrfToken(parsed.csrfToken);

    const data = {
      name: sanitizeText(parsed.name) ?? parsed.name,
      description: sanitizeText(parsed.description) ?? null,
      active: parsed.active,
      sortOrder: parsed.sortOrder
    };

    const candidate = await saveCandidate(parsed.electionId, { id: parsed.id, ...data });
    if (!candidate) {
      return { ok: false, message: "Eleição não encontrada." };
    }
    if (parsed.id) {
      await audit(admin.sub, "candidate.update", { candidateId: parsed.id });
    } else {
      await audit(admin.sub, "candidate.create", { candidateId: candidate.id });
    }

    revalidatePath("/admin");
    return { ok: true, message: "Candidato salvo com sucesso." };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, "Não foi possível salvar o candidato.") };
  }
}

export async function changeElectionStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdminSession();
    const parsed = changeElectionStatusSchema.parse(Object.fromEntries(formData));
    await assertCsrfToken(parsed.csrfToken);

    if (parsed.status === "OPEN") {
      await closeOtherOpenElections(parsed.electionId);
    }

    const election = await setElectionStatus(parsed.electionId, parsed.status);
    if (!election) {
      return { ok: false, message: "Eleição não encontrada." };
    }

    if (parsed.status === "CLOSED") {
      const result = await getElectionResult(parsed.electionId);
      if (!result) {
        return { ok: false, message: "Não foi possível gerar resultado final." };
      }

      await sendElectionResultsEmail({
        electionTitle: result.election.title,
        recipients: [result.election.recipientEmail1, result.election.recipientEmail2],
        closedAt: result.election.closesAt,
        rows: result.candidates.map((candidate) => ({
          candidate: candidate.name,
          yes: candidate.yesCount,
          no: candidate.noCount,
          abstain: candidate.abstainCount
        })),
        totalBallots: result.stats.spentBallots
      });
    }

    await audit(admin.sub, "election.status", { electionId: parsed.electionId, status: parsed.status });
    revalidatePath("/admin");
    return {
      ok: true,
      message:
        parsed.status === "OPEN"
          ? "Votação aberta. Os eleitores solicitam o link na página principal com CPF e e-mail."
          : "Status da eleição atualizado."
    };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, "Não foi possível alterar o status.") };
  }
}

async function audit(actorId: string, action: string, metadata?: Record<string, unknown>) {
  console.info("[audit]", {
    actorId,
    action,
    metadata
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
