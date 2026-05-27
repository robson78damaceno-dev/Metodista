import Link from "next/link";
import { LockKeyhole, Mail, Vote } from "lucide-react";
import { MethodistBrand } from "@/components/methodist-logo";
import { RequestVotingLinkForm } from "@/components/public/request-voting-link-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { createCsrfToken } from "@/lib/csrf";
import { homeErrorMessage } from "@/lib/voting-messages";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const csrfToken = await createCsrfToken();
  const features = [
    { title: "Voto secreto", description: "Nenhum voto guarda CPF, e-mail, IP ou identificação.", Icon: LockKeyhole },
    { title: "Link por e-mail", description: "O sistema envia automaticamente seu acesso de votação.", Icon: Mail },
    { title: "Sem duplicidade", description: "Cada CPF recebe apenas um link por eleição.", Icon: Vote }
  ];

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="fixed right-4 top-4 z-10 flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/sair">Admin</Link>
        </Button>
        <ThemeToggle />
      </div>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:min-h-[calc(100vh-6rem)] lg:flex-row lg:items-center">
        <div className="flex-1 space-y-8">
          <MethodistBrand subtitle="Votação anônima do concílio" />
          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              Votação simples, segura e verdadeiramente anônima.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Informe seu CPF e e-mail. O sistema envia um link exclusivo para você votar com confiança, sem precisar
              digitar códigos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {features.map(({ title, description, Icon }) => (
              <div key={title} className="rounded-3xl border bg-card/70 p-4 backdrop-blur">
                <Icon className="mb-3 h-5 w-5 text-primary" />
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-xl lg:max-w-md">
          <RequestVotingLinkForm
            csrfToken={csrfToken}
            initialNotice={homeErrorMessage(erro)}
            initialAlreadyVoted={erro === "ja-votou"}
          />
        </div>
      </section>
    </main>
  );
}
