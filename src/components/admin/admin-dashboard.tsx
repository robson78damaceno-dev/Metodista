"use client";

import { useActionState, useEffect, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, Download, KeyRound, LogOut, Mail, Plus, Save, Shield, Trash2, Vote } from "lucide-react";
import {
  changeElectionStatusAction,
  deleteElectionAction,
  saveCandidateAction,
  saveElectionAction
} from "@/actions/admin";
import { changeAdminAccountAction, logoutAdminAction } from "@/actions/auth";
import { MethodistBrand } from "@/components/methodist-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/types/actions";
import { cn } from "@/lib/utils";

type Candidate = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  voteStats: {
    yes: number;
    no: number;
    abstain: number;
  };
};

type Election = {
  id: string;
  title: string;
  description: string | null;
  recipientEmail1: string;
  recipientEmail2: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  candidates: Candidate[];
  linkStats: {
    issued: number;
    used: number;
  };
  totalVotes: number;
  spentBallots: number;
};

type ElectionTab = "overview" | "candidates" | "settings";

export function AdminDashboard({
  csrfToken,
  adminName,
  adminEmail,
  elections,
  feedbackCount,
  canCreateElection,
  blockingElectionTitle
}: {
  csrfToken: string;
  adminName: string;
  adminEmail: string;
  elections: Election[];
  feedbackCount: number;
  canCreateElection: boolean;
  blockingElectionTitle: string | null;
}) {
  const activeElection = elections.find((election) => election.status !== "CLOSED") ?? null;
  const closedElections = elections.filter((election) => election.status === "CLOSED");
  const totalVotes = elections.reduce((sum, election) => sum + election.totalVotes, 0);
  const totalLinksIssued = elections.reduce((sum, election) => sum + election.linkStats.issued, 0);

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex flex-col gap-3 rounded-2xl border bg-card/80 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <MethodistBrand subtitle="Painel administrativo" logoHeight={40} />
            <p className="text-xs text-muted-foreground sm:text-sm">Olá, {adminName}.</p>
            <div className="flex flex-wrap gap-2">
              <MetricPill icon={Shield} label="Eleições" value={elections.length} />
              <MetricPill icon={Vote} label="Votos" value={totalVotes} />
              <MetricPill icon={Mail} label="Links" value={totalLinksIssued} />
              <MetricPill icon={Download} label="Feedbacks" value={feedbackCount} />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <CreateElectionDialog
              csrfToken={csrfToken}
              canCreate={canCreateElection}
              blockingElectionTitle={blockingElectionTitle}
            />
            <ThemeToggle />
            <form action={logoutAdminAction}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </form>
          </div>
        </header>

        <AdminAccountCard csrfToken={csrfToken} email={adminEmail} />

        {activeElection ? (
          <ActiveElectionPanel election={activeElection} csrfToken={csrfToken} />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {canCreateElection
                ? "Nenhuma eleição em andamento. Clique em Nova eleição para começar."
                : `Encerre "${blockingElectionTitle}" para iniciar outra.`}
            </CardContent>
          </Card>
        )}

        {closedElections.length > 0 ? (
          <details className="group rounded-2xl border bg-card/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span>Histórico ({closedElections.length} encerrada{closedElections.length > 1 ? "s" : ""})</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
            </summary>
            <div className="space-y-2 border-t px-3 pb-3 pt-2">
              {closedElections.map((election) => (
                <ClosedElectionRow key={election.id} election={election} csrfToken={csrfToken} />
              ))}
              <ClearHistoryButton csrfToken={csrfToken} />
            </div>
          </details>
        ) : null}
      </div>
    </main>
  );
}

function MetricPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function AdminAccountCard({ csrfToken, email }: { csrfToken: string; email: string }) {
  const [state, action] = useActionState(changeAdminAccountAction, initialActionState);
  useRefreshOnActionSuccess(state);

  return (
    <details className="group rounded-2xl border bg-card/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Conta do administrador
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t px-4 pb-4 pt-3">
        <p className="text-sm text-muted-foreground">
          Altere o e-mail e a senha de acesso ao painel. É necessário informar a senha atual.
        </p>
        <form action={action} className="space-y-3">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <Field label="Usuário de login" name="email" type="text" defaultValue={email} required />
          <Field label="Senha atual" name="currentPassword" type="password" autoComplete="current-password" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nova senha (opcional)"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Deixe em branco para manter"
            />
            <Field
              label="Confirmar nova senha"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a nova senha"
            />
          </div>
          <ActionMessage state={state} />
          <SubmitButton icon={Save}>Salvar alterações da conta</SubmitButton>
        </form>
      </div>
    </details>
  );
}

function useRefreshOnActionSuccess(state: { ok: boolean; message: string }) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, state.message, router]);
}

function CreateElectionDialog({
  csrfToken,
  canCreate,
  blockingElectionTitle
}: {
  csrfToken: string;
  canCreate: boolean;
  blockingElectionTitle: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveElectionAction, initialActionState);
  useRefreshOnActionSuccess(state);

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok, state.message]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!canCreate}>
          <Plus className="h-4 w-4" />
          Nova eleição
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova eleição</DialogTitle>
          <DialogDescription>
            {canCreate
              ? "Preencha os dados e cadastre os candidatos na aba seguinte."
              : `Encerre "${blockingElectionTitle}" antes de criar outra.`}
          </DialogDescription>
        </DialogHeader>
        {!canCreate ? (
          <Alert>
            <AlertDescription>
              A eleição <span className="font-semibold">{blockingElectionTitle}</span> precisa estar encerrada.
            </AlertDescription>
          </Alert>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <Field label="Título" name="title" placeholder="Ex.: Delegado distrital" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="E-mail 1" name="recipientEmail1" type="email" required />
              <Field label="E-mail 2" name="recipientEmail2" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" name="description" rows={2} placeholder="Motivo da votação." />
            </div>
            <ActionMessage state={state} />
            <SubmitButton icon={Plus}>Criar eleição</SubmitButton>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActiveElectionPanel({ election, csrfToken }: { election: Election; csrfToken: string }) {
  const [tab, setTab] = useState<ElectionTab>("overview");
  const activeCandidateCount = election.candidates.filter((candidate) => candidate.active).length;
  const needsCandidates = activeCandidateCount === 0;

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(election.status)}>{statusLabel(election.status)}</Badge>
              <Badge variant="outline">{election.totalVotes} votos</Badge>
            </div>
            <CardTitle className="text-xl">{election.title}</CardTitle>
            {election.description ? <CardDescription>{election.description}</CardDescription> : null}
          </div>
          <ElectionStatusControls election={election} csrfToken={csrfToken} />
        </div>

        <div className="flex gap-1 rounded-xl bg-muted/60 p-1">
          {(
            [
              ["overview", "Visão geral"],
              ["candidates", `Candidatos (${election.candidates.length})`],
              ["settings", "Configuração"]
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition sm:text-sm",
                tab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {needsCandidates ? (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">
              Cadastre pelo menos um candidato ativo na aba <strong>Candidatos</strong> antes de abrir a votação ou
              enviar links por e-mail. Sem candidatos, o eleitor é redirecionado para a página inicial.
            </AlertDescription>
          </Alert>
        ) : null}
        {tab === "overview" ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <SmallStat label="Links" value={election.linkStats.issued} />
              <SmallStat label="Votaram" value={election.linkStats.used} />
              <SmallStat label="Cédulas" value={election.spentBallots} />
            </div>
            {election.status === "OPEN" ? (
              <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground sm:text-sm">
                Eleitores solicitam o link na página inicial com CPF e e-mail.
              </p>
            ) : null}
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <a href={`/api/admin/elections/${election.id}/results`}>
                <Download className="h-4 w-4" />
                Exportar relatório PDF
              </a>
            </Button>
          </>
        ) : null}

        {tab === "candidates" ? (
          <div className="space-y-3">
            <CandidateForm electionId={election.id} csrfToken={csrfToken} />
            {election.candidates.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">Nenhum candidato cadastrado.</p>
            ) : (
              election.candidates.map((candidate) => (
                <CandidateRow key={candidate.id} candidate={candidate} electionId={election.id} csrfToken={csrfToken} />
              ))
            )}
          </div>
        ) : null}

        {tab === "settings" ? <EditElectionForm election={election} csrfToken={csrfToken} /> : null}
      </CardContent>
    </Card>
  );
}

function ClosedElectionRow({ election, csrfToken }: { election: Election; csrfToken: string }) {
  const [state, action] = useActionState(deleteElectionAction, initialActionState);
  useRefreshOnActionSuccess(state);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/50 px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">{election.title}</p>
          <p className="text-xs text-muted-foreground">
            {election.totalVotes} votos · {election.candidates.length} candidato(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/admin/elections/${election.id}/results`}>PDF</a>
          </Button>
          <form action={action}>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="electionId" value={election.id} />
            <DeleteButton label="Excluir" />
          </form>
        </div>
      </div>
      {state.message ? <ActionMessage state={state} /> : null}
    </div>
  );
}

function ClearHistoryButton({ csrfToken }: { csrfToken: string }) {
  const [state, action] = useActionState(deleteElectionAction, initialActionState);
  useRefreshOnActionSuccess(state);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-2 border-t pt-2">
      {confirming ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="electionId" value="ALL_CLOSED" />
          <span className="text-xs text-muted-foreground">Excluir todo o histórico? Esta ação é permanente.</span>
          <DeleteButton label="Confirmar exclusão" />
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 className="h-4 w-4" />
          Limpar histórico
        </Button>
      )}
      {state.message ? <ActionMessage state={state} /> : null}
    </div>
  );
}

function DeleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      <Trash2 className="h-4 w-4" />
      {pending ? "Excluindo..." : label}
    </Button>
  );
}

function CandidateRow({
  candidate,
  electionId,
  csrfToken
}: {
  candidate: Candidate;
  electionId: string;
  csrfToken: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-background/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
      >
        <span className="font-medium">{candidate.name}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          Sim {candidate.voteStats.yes} · Não {candidate.voteStats.no} · Abster {candidate.voteStats.abstain}
          <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
        </span>
      </button>
      {open ? (
        <div className="border-t px-2 pb-2 pt-1">
          <CandidateForm candidate={candidate} electionId={electionId} csrfToken={csrfToken} compact />
        </div>
      ) : null}
    </div>
  );
}

function EditElectionForm({ election, csrfToken }: { election: Election; csrfToken: string }) {
  const [state, action] = useActionState(saveElectionAction, initialActionState);
  useRefreshOnActionSuccess(state);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="id" value={election.id} />
      <Field label="Título" name="title" defaultValue={election.title} required />
      <Field label="Descrição" name="description" defaultValue={election.description ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-mail 1" name="recipientEmail1" type="email" defaultValue={election.recipientEmail1} required />
        <Field label="E-mail 2" name="recipientEmail2" type="email" defaultValue={election.recipientEmail2} required />
      </div>
      <ActionMessage state={state} />
      <SubmitButton icon={Save}>Salvar configuração</SubmitButton>
    </form>
  );
}

function CandidateForm({
  candidate,
  electionId,
  csrfToken,
  compact = false
}: {
  candidate?: Candidate;
  electionId: string;
  csrfToken: string;
  compact?: boolean;
}) {
  const [state, action] = useActionState(saveCandidateAction, initialActionState);
  useRefreshOnActionSuccess(state);
  return (
    <form action={action} className={cn("rounded-xl border bg-muted/30 p-3", compact && "border-0 bg-transparent p-0")}>
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="electionId" value={electionId} />
      {candidate ? <input type="hidden" name="id" value={candidate.id} /> : null}
      <div className={cn("grid gap-2", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")}>
        <Field label={candidate ? "Nome" : "Novo candidato"} name="name" defaultValue={candidate?.name ?? ""} required />
        <Field label="Descrição" name="description" defaultValue={candidate?.description ?? ""} />
        <Field label="Ordem" name="sortOrder" type="number" defaultValue={candidate?.sortOrder ?? 0} min={0} />
        <div className="space-y-1.5">
          <Label>Status</Label>
          <select
            name="active"
            defaultValue={candidate?.active === false ? "false" : "true"}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
      </div>
      <div className="mt-2">
        <SubmitButton icon={Save} size="sm">
          {candidate ? "Salvar candidato" : "Adicionar candidato"}
        </SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function ElectionStatusControls({ election, csrfToken }: { election: Election; csrfToken: string }) {
  const [state, action] = useActionState(changeElectionStatusAction, initialActionState);
  useRefreshOnActionSuccess(state);

  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap gap-1.5">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="electionId" value={election.id} />
        {election.status !== "OPEN" ? (
          <Button type="submit" name="status" value="OPEN" size="sm">
            Abrir
          </Button>
        ) : null}
        {election.status !== "CLOSED" ? (
          <Button type="submit" name="status" value="CLOSED" size="sm" variant="secondary">
            Encerrar
          </Button>
        ) : null}
        {election.status !== "DRAFT" ? (
          <Button type="submit" name="status" value="DRAFT" size="sm" variant="outline">
            Rascunho
          </Button>
        ) : null}
      </form>
      {state.message ? <ActionMessage state={state} /> : null}
    </div>
  );
}

function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...inputProps } = props;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs sm:text-sm">
        {label}
      </Label>
      <Input id={name} name={name} className="h-10" {...inputProps} />
    </div>
  );
}

function SubmitButton({
  children,
  icon: Icon,
  size = "default"
}: {
  children: string;
  icon: LucideIcon;
  size?: "default" | "sm" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size={size} className="w-full sm:w-auto">
      <Icon className="h-4 w-4" />
      {pending ? "Salvando..." : children}
    </Button>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/60 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}

function ActionMessage({ state }: { state: { ok: boolean; message: string } }) {
  if (!state.message) return null;
  return (
    <Alert variant={state.ok ? "success" : "destructive"} className="mt-2 py-2">
      <AlertDescription className="text-sm">{state.message}</AlertDescription>
    </Alert>
  );
}

function statusLabel(status: Election["status"]) {
  return {
    DRAFT: "Rascunho",
    OPEN: "Aberta",
    CLOSED: "Encerrada"
  }[status];
}

function statusVariant(status: Election["status"]) {
  if (status === "OPEN") return "success";
  if (status === "CLOSED") return "secondary";
  return "warning";
}
