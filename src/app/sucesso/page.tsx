import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { MethodistLogo } from "@/components/methodist-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg border-emerald-500/20">
        <CardContent className="space-y-6 p-8 text-center">
          <MethodistLogo height={48} className="mx-auto" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Voto registrado</h1>
            <p className="leading-7 text-muted-foreground">
              Obrigado. Seu voto foi depositado na urna anônima sem vínculo com seu código.
            </p>
          </div>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/">Concluir</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
