import { getPublicAppUrl } from "@/lib/app-url";
import { secureToken } from "@/lib/crypto";
import { debugError, debugLog, logStorageContext } from "@/lib/debug-log";
import { env } from "@/lib/env";
import { redis } from "@/lib/redis";

function votingEntryUrl(ticket: string) {
  return `${getPublicAppUrl(env.APP_URL)}/entrar/${encodeURIComponent(ticket)}`;
}

const DEFAULT_TTL_SECONDS = 72 * 60 * 60;

export type ElectionStatus = "DRAFT" | "OPEN" | "CLOSED";

export type ElectionCandidate = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
};

export type ElectionMeta = {
  id: string;
  title: string;
  description: string | null;
  status: ElectionStatus;
  recipientEmail1: string;
  recipientEmail2: string;
  createdAt: string;
  opensAt: string | null;
  closesAt: string | null;
};

export type ElectionDetails = ElectionMeta & {
  candidates: ElectionCandidate[];
};

type TicketPayload = {
  electionId: string;
  cpfHash: string;
};

export type { VoteChoice } from "@/lib/vote-choice";
import type { VoteChoice } from "@/lib/vote-choice";
export type CandidateDecision = {
  candidateId: string;
  choice: VoteChoice;
  feedback?: string;
};

export type IssueLinkResult =
  | { ok: true; url: string; resent: boolean }
  | { ok: false; reason: "already_voted" | "election_closed" | "no_candidates" | "not_found" };

function electionMetaKey(electionId: string) {
  return `election:${electionId}:meta`;
}

function electionCandidatesKey(electionId: string) {
  return `election:${electionId}:candidates`;
}

function electionVotesCountKey(electionId: string) {
  return `election:${electionId}:votes:count`;
}

function electionFeedbacksKey(electionId: string) {
  return `election:${electionId}:feedbacks`;
}

function electionBallotsSpentKey(electionId: string) {
  return `election:${electionId}:ballots:spent`;
}

function electionLinksIssuedKey(electionId: string) {
  return `election:${electionId}:links:issued`;
}

function electionCpfUsedSetKey(electionId: string) {
  return `election:${electionId}:cpf-used`;
}

function electionCpfTicketKey(electionId: string, cpfHash: string) {
  return `election:${electionId}:cpf-ticket:${cpfHash}`;
}

function electionCpfUsedKey(electionId: string, cpfHash: string) {
  return `election:${electionId}:cpf-used:${cpfHash}`;
}

function electionIndexKey() {
  return "elections:index";
}

function votingTicketKey(ticket: string) {
  return `voting-ticket:${ticket}`;
}

function decodeJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T;
  if (typeof value !== "string") {
    debugLog("decodeJson: tipo inesperado", { valueType: typeof value });
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    debugError("decodeJson: falha ao parsear string", error, {
      preview: value.slice(0, 120)
    });
    return null;
  }
}

function parseTicketPayload(raw: unknown): TicketPayload | null {
  return decodeJson<TicketPayload>(raw);
}

async function writeElectionMeta(electionId: string, meta: ElectionMeta) {
  await redis.set(electionMetaKey(electionId), meta, { ex: DEFAULT_TTL_SECONDS });
}

function normalizeCandidateActive(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
  }
  return true;
}

function normalizeCandidate(candidate: ElectionCandidate): ElectionCandidate {
  return {
    ...candidate,
    active: normalizeCandidateActive(candidate.active)
  };
}

async function getElectionCandidates(electionId: string): Promise<ElectionCandidate[]> {
  const raw = await redis.get<unknown>(electionCandidatesKey(electionId));
  if (!raw) return [];
  const list = Array.isArray(raw) ? (raw as ElectionCandidate[]) : (decodeJson<ElectionCandidate[]>(raw) ?? []);
  return list.map(normalizeCandidate);
}

export function getActiveCandidates(candidates: ElectionCandidate[]) {
  return candidates.filter((candidate) => normalizeCandidateActive(candidate.active));
}

export async function countActiveCandidates(electionId: string) {
  const candidates = await getElectionCandidates(electionId);
  return getActiveCandidates(candidates).length;
}

export async function assertElectionCanOpen(electionId: string) {
  const activeCount = await countActiveCandidates(electionId);
  if (activeCount === 0) {
    throw new Error(
      "Cadastre pelo menos um candidato ativo antes de abrir a votação (aba Candidatos no painel admin)."
    );
  }
}

/** Mantém só a eleição ativa mais recente; encerra duplicatas de testes/deploy. */
export async function normalizeActiveElections() {
  const elections = await listElections();
  const active = elections.filter((election) => election.status !== "CLOSED");
  if (active.length <= 1) return;

  const [, ...stale] = active;
  for (const election of stale) {
    debugLog("normalizeActiveElections: encerrando eleição antiga", {
      id: election.id,
      title: election.title,
      status: election.status
    });
    await setElectionStatus(election.id, "CLOSED");
  }
}

export async function getElectionBlockingNewCreation() {
  const elections = await listElections();
  return elections.find((election) => election.status !== "CLOSED") ?? null;
}

export async function assertCanCreateElection() {
  const blocking = await getElectionBlockingNewCreation();
  debugLog("assertCanCreateElection", {
    blocked: Boolean(blocking),
    blockingId: blocking?.id ?? null,
    blockingTitle: blocking?.title ?? null
  });
  if (blocking) {
    throw new Error(`Encerre a eleição "${blocking.title}" antes de criar uma nova.`);
  }
}

export async function createElection(input: {
  title: string;
  description: string | null;
  recipientEmail1: string;
  recipientEmail2: string;
}) {
  logStorageContext("createElection:start");
  debugLog("createElection: input", {
    title: input.title,
    recipientEmail1: input.recipientEmail1,
    recipientEmail2: input.recipientEmail2
  });

  await assertCanCreateElection();

  const now = new Date().toISOString();
  const meta: ElectionMeta = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    status: "DRAFT",
    recipientEmail1: input.recipientEmail1,
    recipientEmail2: input.recipientEmail2,
    createdAt: now,
    opensAt: null,
    closesAt: null
  };

  const metaKey = electionMetaKey(meta.id);
  const indexKey = electionIndexKey();

  try {
    const setResult = await redis.set(metaKey, meta, { ex: DEFAULT_TTL_SECONDS });
    const saddResult = await redis.sadd(indexKey, meta.id);
    const expireResult = await redis.expire(indexKey, DEFAULT_TTL_SECONDS);

    const indexIds = await redis.smembers(indexKey);
    const savedMeta = await getElectionMeta(meta.id);

    debugLog("createElection: gravado no Redis", {
      electionId: meta.id,
      metaKey,
      indexKey,
      setResult,
      saddResult,
      expireResult,
      indexCount: indexIds.length,
      indexIds,
      metaFound: Boolean(savedMeta),
      metaTitle: savedMeta?.title ?? null
    });

    if (!savedMeta) {
      throw new Error(
        "Eleição foi salva, mas não foi encontrada ao reler do Redis. Verifique UPSTASH_REDIS_REST_URL e TOKEN na Vercel."
      );
    }

    return meta;
  } catch (error) {
    debugError("createElection: falha ao gravar", error, { electionId: meta.id, metaKey, indexKey });
    throw error;
  }
}

export async function getElectionMeta(electionId: string) {
  return decodeJson<ElectionMeta>(await redis.get<string>(electionMetaKey(electionId)));
}

export async function getElectionDetails(electionId: string): Promise<ElectionDetails | null> {
  const meta = await getElectionMeta(electionId);
  if (!meta) return null;
  const candidates = await getElectionCandidates(electionId);
  return {
    ...meta,
    candidates: candidates.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  };
}

export async function listElections() {
  const indexKey = electionIndexKey();
  const ids = await redis.smembers(indexKey);
  const details = await Promise.all(ids.map((id) => getElectionDetails(id)));
  const resolved = details.filter((value): value is ElectionDetails => Boolean(value));

  debugLog("listElections", {
    indexKey,
    rawIdCount: ids.length,
    rawIds: ids,
    resolvedCount: resolved.length,
    missingIds: ids.filter((id, index) => !details[index])
  });

  return resolved.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOpenElection() {
  const open = (await listElections()).filter((election) => election.status === "OPEN");
  if (open.length === 0) return null;
  return open[0];
}

export async function closeOtherOpenElections(exceptElectionId: string) {
  const elections = await listElections();
  for (const election of elections) {
    if (election.status === "OPEN" && election.id !== exceptElectionId) {
      await setElectionStatus(election.id, "CLOSED");
    }
  }
}

export async function updateElection(
  electionId: string,
  input: { title: string; description: string | null; recipientEmail1: string; recipientEmail2: string }
) {
  const current = await getElectionMeta(electionId);
  if (!current) return null;
  const updated: ElectionMeta = {
    ...current,
    title: input.title,
    description: input.description,
    recipientEmail1: input.recipientEmail1,
    recipientEmail2: input.recipientEmail2
  };
  await writeElectionMeta(electionId, updated);
  return updated;
}

export async function setElectionStatus(electionId: string, status: ElectionStatus) {
  const current = await getElectionMeta(electionId);
  if (!current) return null;

  if (status === "OPEN") {
    await assertElectionCanOpen(electionId);
  }

  const now = new Date().toISOString();
  const updated: ElectionMeta = {
    ...current,
    status,
    opensAt: status === "OPEN" ? now : current.opensAt,
    closesAt: status === "CLOSED" ? now : current.closesAt
  };

  await writeElectionMeta(electionId, updated);
  const verified = await getElectionMeta(electionId);
  if (!verified || verified.status !== status) {
    throw new Error(
      `Não foi possível confirmar o status "${status}" no Redis. Tente novamente ou verifique o Upstash na Vercel.`
    );
  }

  debugLog("setElectionStatus: ok", { electionId, status, title: verified.title });
  return verified;
}

export async function saveCandidate(
  electionId: string,
  input: Omit<ElectionCandidate, "id"> & { id?: string }
): Promise<ElectionCandidate | null> {
  const election = await getElectionMeta(electionId);
  if (!election) return null;

  const candidates = await getElectionCandidates(electionId);
  const id = input.id ?? crypto.randomUUID();
  const nextCandidate: ElectionCandidate = {
    id,
    name: input.name,
    description: input.description,
    active: input.active,
    sortOrder: input.sortOrder
  };
  const index = candidates.findIndex((candidate) => candidate.id === id);
  if (index >= 0) candidates[index] = nextCandidate;
  else candidates.push(nextCandidate);

  await redis.set(electionCandidatesKey(electionId), candidates, { ex: DEFAULT_TTL_SECONDS });
  return nextCandidate;
}

export async function issueVotingLinkForCpf(electionId: string, cpfHash: string): Promise<IssueLinkResult> {
  const election = await getElectionMeta(electionId);
  if (!election || election.status !== "OPEN") {
    return { ok: false, reason: "election_closed" };
  }

  if ((await countActiveCandidates(electionId)) === 0) {
    return { ok: false, reason: "no_candidates" };
  }

  if (await redis.get(electionCpfUsedKey(electionId, cpfHash))) {
    return { ok: false, reason: "already_voted" };
  }

  const existingTicket = await redis.get<string>(electionCpfTicketKey(electionId, cpfHash));
  if (existingTicket) {
    const payload = parseTicketPayload(await redis.get<string>(votingTicketKey(existingTicket)));
    if (payload) {
      return {
        ok: true,
        url: votingEntryUrl(existingTicket),
        resent: true
      };
    }
  }

  const ticket = secureToken(24);
  const payload: TicketPayload = { electionId, cpfHash };
  await redis.set(votingTicketKey(ticket), payload, { ex: DEFAULT_TTL_SECONDS });
  await redis.set(electionCpfTicketKey(electionId, cpfHash), ticket, { ex: DEFAULT_TTL_SECONDS });
  await redis.incr(electionLinksIssuedKey(electionId));
  await redis.expire(electionLinksIssuedKey(electionId), DEFAULT_TTL_SECONDS);

  return {
    ok: true,
    url: votingEntryUrl(ticket),
    resent: false
  };
}

export type ConsumeTicketResult =
  | { ok: true; electionId: string }
  | { ok: false; reason: "invalid" | "already_voted" | "election_closed" | "no_candidates" };

export async function consumeVotingTicket(ticket: string): Promise<ConsumeTicketResult> {
  const raw = await redis.get<string>(votingTicketKey(ticket));
  const payload = parseTicketPayload(raw);
  if (!payload) return { ok: false, reason: "invalid" };

  const election = await getElectionDetails(payload.electionId);
  if (!election || election.status !== "OPEN") return { ok: false, reason: "election_closed" };

  if (getActiveCandidates(election.candidates).length === 0) {
    return { ok: false, reason: "no_candidates" };
  }

  if (await redis.get(electionCpfUsedKey(payload.electionId, payload.cpfHash))) {
    return { ok: false, reason: "already_voted" };
  }

  const marked = await redis.set(electionCpfUsedKey(payload.electionId, payload.cpfHash), "1", {
    nx: true,
    ex: DEFAULT_TTL_SECONDS
  });
  if (marked !== "OK") return { ok: false, reason: "already_voted" };

  await redis.sadd(electionCpfUsedSetKey(payload.electionId), payload.cpfHash);
  await redis.expire(electionCpfUsedSetKey(payload.electionId), DEFAULT_TTL_SECONDS);
  await redis.del(votingTicketKey(ticket));
  await redis.del(electionCpfTicketKey(payload.electionId, payload.cpfHash));

  return { ok: true, electionId: payload.electionId };
}

export async function submitVote(input: {
  electionId: string;
  decisions: CandidateDecision[];
  tokenHash: string;
}) {
  const election = await getElectionDetails(input.electionId);
  if (!election || election.status !== "OPEN") throw new Error("Votação encerrada ou indisponível.");
  if (input.decisions.length === 0) throw new Error("Nenhum voto foi informado.");

  const activeCandidates = new Map(
    getActiveCandidates(election.candidates).map((candidate) => [candidate.id, candidate])
  );
  for (const decision of input.decisions) {
    if (!activeCandidates.has(decision.candidateId)) {
      throw new Error("Voto inválido para candidato inativo ou inexistente.");
    }
  }

  const yesCount = input.decisions.filter((decision) => decision.choice === "YES").length;
  const noCount = input.decisions.filter((decision) => decision.choice === "NO").length;
  if (yesCount > 1) {
    throw new Error("Você só pode marcar Sim em um candidato.");
  }
  if (noCount > 1) {
    throw new Error("Você só pode marcar Não em um candidato.");
  }

  const spent = await redis.set(`ballot-spent:${input.tokenHash}`, "1", { nx: true, ex: DEFAULT_TTL_SECONDS });
  if (spent !== "OK") throw new Error("Você já votou nesta eleição.");

  await redis.sadd(electionBallotsSpentKey(input.electionId), input.tokenHash);
  await redis.expire(electionBallotsSpentKey(input.electionId), DEFAULT_TTL_SECONDS);

  for (const decision of input.decisions) {
    await redis.hincrby(electionVotesCountKey(input.electionId), decision.choice, 1);
    await redis.hincrby(
      electionVotesCountKey(input.electionId),
      `${decision.candidateId}:${decision.choice}`,
      1
    );

    if (decision.feedback) {
      await redis.rpush(
        electionFeedbacksKey(input.electionId),
        JSON.stringify({
          candidateId: decision.candidateId,
          choice: decision.choice,
          feedback: decision.feedback
        })
      );
    }
  }
  await redis.expire(electionVotesCountKey(input.electionId), DEFAULT_TTL_SECONDS);
  await redis.expire(electionFeedbacksKey(input.electionId), DEFAULT_TTL_SECONDS);
}

export async function getElectionResult(electionId: string) {
  const election = await getElectionDetails(electionId);
  if (!election) return null;

  const votes = await redis.hgetall<Record<string, string | number>>(electionVotesCountKey(electionId));
  const linksIssued = Number((await redis.get<string>(electionLinksIssuedKey(electionId))) ?? 0);
  const linksUsed = await redis.scard(electionCpfUsedSetKey(electionId));
  const spentBallots = await redis.scard(electionBallotsSpentKey(electionId));

  const yesCount = Number(votes?.YES ?? 0);
  const noCount = Number(votes?.NO ?? 0);
  const abstainCount = Number(votes?.ABSTAIN ?? 0);
  const candidates = election.candidates.map((candidate) => ({
    ...candidate,
    yesCount: Number(votes?.[`${candidate.id}:YES`] ?? 0),
    noCount: Number(votes?.[`${candidate.id}:NO`] ?? 0),
    abstainCount: Number(votes?.[`${candidate.id}:ABSTAIN`] ?? 0)
  }));

  return {
    election,
    candidates,
    stats: {
      yesCount,
      noCount,
      abstainCount,
      totalVotes: yesCount + noCount + abstainCount,
      linksIssued,
      linksUsed,
      spentBallots
    }
  };
}

export async function getElectionFeedbacks(electionId: string) {
  const election = await getElectionDetails(electionId);
  if (!election) return [];
  const raw = await redis.lrange(electionFeedbacksKey(electionId), 0, -1);
  const byCandidate = new Map(election.candidates.map((candidate) => [candidate.id, candidate.name]));

  return raw
    .map((entry) => decodeJson<{ candidateId: string; choice: VoteChoice; feedback?: string }>(entry))
    .filter(
      (entry): entry is { candidateId: string; choice: VoteChoice; feedback?: string } =>
        Boolean(entry?.feedback)
    )
    .map((entry) => ({
      candidate: byCandidate.get(entry.candidateId) ?? "Candidato",
      choice: entry.choice,
      feedback: entry.feedback ?? ""
    }));
}
