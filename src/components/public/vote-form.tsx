"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { submitVoteAction } from "@/actions/voting";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/types/actions";
import { voteChoiceLabel, type VoteChoice } from "@/lib/vote-choice";
type Candidate = {
  id: string;
  name: string;
  description: string | null;
};
type DecisionState = Record<string, { choice?: VoteChoice; feedback: string }>;

export function VoteForm({
  csrfToken,
  electionTitle,
  electionDescription,
  candidates
}: {
  csrfToken: string;
  electionTitle: string;
  electionDescription: string | null;
  candidates: Candidate[];
}) {
  const [state, action] = useActionState(submitVoteAction, initialActionState);
  const [decisions, setDecisions] = useState<DecisionState>(() =>
    Object.fromEntries(candidates.map((candidate) => [candidate.id, { feedback: "" }]))
  );

  const decisionsPayload = useMemo(
    () =>
      candidates
        .map((candidate) => {
          const decision = decisions[candidate.id];
          if (!decision?.choice) return null;
          return {
            candidateId: candidate.id,
            choice: decision.choice,
            feedback: decision.feedback
          };
        })
        .filter((item): item is { candidateId: string; choice: VoteChoice; feedback: string } => Boolean(item)),
    [candidates, decisions]
  );

  const yesUsedBy = useMemo(
    () => candidates.find((candidate) => decisions[candidate.id]?.choice === "YES")?.id ?? null,
    [candidates, decisions]
  );
  const noUsedBy = useMemo(
    () => candidates.find((candidate) => decisions[candidate.id]?.choice === "NO")?.id ?? null,
    [candidates, decisions]
  );

  const isReadyToSubmit = candidates.length > 0 && decisionsPayload.length === candidates.length;
  const decisionsJson = JSON.stringify(decisionsPayload);

  return (
    <form id="vote-form" action={action} className="space-y-6">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="decisions" value={decisionsJson} />

      <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-6 text-center shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Motivo da votação</p>
        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">{electionTitle}</h1>
        {electionDescription ? (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {electionDescription}
          </p>
        ) : null}
      </div>

      <p className="text-center text-sm font-medium text-muted-foreground">
        Você pode marcar <span className="text-foreground">Sim</span> em apenas{" "}
        <span className="text-foreground">um</span> candidato e <span className="text-foreground">Não</span> em apenas{" "}
        <span className="text-foreground">um</span> candidato. Os demais devem ficar como{" "}
        <span className="text-foreground">Abster</span>.
      </p>

      <div className="grid gap-3">
        {candidates.map((candidate, index) => {
          const decision = decisions[candidate.id] ?? { feedback: "" };
          return (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-3xl border bg-card/80 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{candidate.name}</h2>
                  {candidate.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{candidate.description}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["YES", "Sim"],
                      ["NO", "Não"],
                      ["ABSTAIN", "Abster"]
                    ] as const
                  ).map(([value, label]) => {
                    const disabled =
                      (value === "YES" && yesUsedBy !== null && yesUsedBy !== candidate.id) ||
                      (value === "NO" && noUsedBy !== null && noUsedBy !== candidate.id);
                    return (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={decision.choice === value ? "default" : "outline"}
                        disabled={disabled}
                        title={
                          disabled
                            ? value === "YES"
                              ? "Você já marcou Sim em outro candidato."
                              : "Você já marcou Não em outro candidato."
                            : undefined
                        }
                        onClick={() =>
                          setDecisions((current) => ({
                            ...current,
                            [candidate.id]: { ...(current[candidate.id] ?? { feedback: "" }), choice: value }
                          }))
                        }
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <label htmlFor={`feedback-${candidate.id}`} className="text-sm font-semibold">
                  Observação (opcional)
                </label>
                <Textarea
                  id={`feedback-${candidate.id}`}
                  value={decision.feedback}
                  maxLength={800}
                  onChange={(event) =>
                    setDecisions((current) => ({
                      ...current,
                      [candidate.id]: {
                        ...(current[candidate.id] ?? { feedback: "" }),
                        feedback: event.target.value
                      }
                    }))
                  }
                  placeholder="Escreva uma observação para este candidato."
                />
                <p className="text-xs text-muted-foreground">{decision.feedback.length}/800 caracteres</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {state.message ? (
        <Alert variant={state.ok ? "success" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" size="lg" className="w-full" disabled={!isReadyToSubmit}>
            Conferir e enviar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar voto?</DialogTitle>
            <DialogDescription>
              Após confirmar, seus votos por candidato serão depositados de forma anônima e não poderão ser alterados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-2xl bg-muted p-4">
            <p className="text-sm text-muted-foreground">Motivo da votação</p>
            <p className="text-lg font-bold">{electionTitle}</p>
            <div className="space-y-1 text-sm">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                  <span>{candidate.name}</span>
                  <span className="font-semibold">
                    {decisions[candidate.id]?.choice ? voteChoiceLabel(decisions[candidate.id].choice!) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <SubmitButton formId="vote-form" />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function SubmitButton({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" form={formId} size="lg" className="w-full" disabled={pending}>
      <Send className="h-5 w-5" />
      {pending ? "Depositando voto..." : "Confirmar voto anônimo"}
    </Button>
  );
}
