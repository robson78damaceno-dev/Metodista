"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";
import { MethodistLogo } from "@/components/methodist-logo";
import { requestVotingLinkAction } from "@/actions/voting";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCpfInput } from "@/lib/cpf";
import type { ActionState } from "@/types/actions";

type RequestLinkState = ActionState<{ devLink?: string; alreadyVoted?: boolean }>;

const initialState: RequestLinkState = {
  ok: false,
  message: ""
};

export function RequestVotingLinkForm({
  csrfToken,
  initialNotice,
  initialAlreadyVoted = false
}: {
  csrfToken: string;
  initialNotice?: string | null;
  initialAlreadyVoted?: boolean;
}) {
  const [state, action] = useActionState(requestVotingLinkAction, initialState);
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");

  const alreadyVoted = Boolean(state.data?.alreadyVoted) || initialAlreadyVoted;
  const noticeMessage = state.message || initialNotice;

  useEffect(() => {
    if (noticeMessage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [noticeMessage]);

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <Card className="border-white/60 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-card/80">
        <CardContent className="space-y-5 p-5 sm:p-7">
          <div className="flex justify-center pb-1">
            <MethodistLogo height={40} />
          </div>
          <form action={action} className="space-y-4">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(event) => setCpf(formatCpfInput(event.target.value))}
                maxLength={14}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <p className="text-sm leading-6 text-muted-foreground">
                Enviaremos um link pessoal para este e-mail. Cada CPF recebe apenas um link por votação.
              </p>
            </div>

            {noticeMessage ? (
              <Alert variant={alreadyVoted ? "default" : state.message ? (state.ok ? "success" : "destructive") : "default"}>
                {alreadyVoted ? <AlertTitle>Você já votou</AlertTitle> : null}
                <AlertDescription className="space-y-3">
                  <p>{noticeMessage}</p>
                  {state.data?.devLink ? (
                    <div className="rounded-xl border bg-background/80 p-3 text-left">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Link de teste (desenvolvimento)</p>
                      <Button asChild size="sm" className="w-full">
                        <Link href={state.data.devLink}>Abrir cédula de votação</Link>
                      </Button>
                    </div>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            <SubmitButton disabled={alreadyVoted} />
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
      <Mail className="h-5 w-5" />
      {pending ? "Enviando link..." : "Receber link por e-mail"}
    </Button>
  );
}
