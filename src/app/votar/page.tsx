import Link from "next/link";
import { redirect } from "next/navigation";
import { MethodistLogo } from "@/components/methodist-logo";
import { VoteForm } from "@/components/public/vote-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createCsrfToken } from "@/lib/csrf";
import { getBallotSession } from "@/lib/ballot";
import { getElectionDetails } from "@/lib/election-store";

export const dynamic = "force-dynamic";

export default async function VotingPage() {
  const ballot = await getBallotSession();
  if (!ballot) {
    redirect("/");
  }

  const election = await getElectionDetails(ballot.electionId);
  const activeCandidates = election?.candidates.filter((candidate) => candidate.active) ?? [];
  if (!election || election.status !== "OPEN" || activeCandidates.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="max-w-lg">
          <CardContent className="space-y-4 p-6 text-center">
            <h1 className="text-2xl font-bold">Votação indisponível</h1>
            <p className="text-muted-foreground">A eleição foi encerrada ou ainda não possui candidatos ativos.</p>
            <Button asChild>
              <Link href="/">Voltar ao início</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const csrfToken = await createCsrfToken();

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="fixed left-4 top-4 z-10">
        <MethodistLogo height={44} />
      </div>
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <section className="mx-auto w-full max-w-3xl pt-12 sm:pt-0">
        <VoteForm
          csrfToken={csrfToken}
          electionTitle={election.title}
          electionDescription={election.description}
          candidates={activeCandidates}
        />
      </section>
    </main>
  );
}
