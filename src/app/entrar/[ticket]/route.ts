import { NextResponse } from "next/server";
import { BALLOT_COOKIE, createBallotToken } from "@/lib/ballot";
import { env } from "@/lib/env";
import { consumeVotingTicket, getElectionDetails } from "@/lib/election-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ ticket: string }> }) {
  const { ticket: rawTicket } = await params;
  const ticket = decodeURIComponent(rawTicket).trim();

  if (!ticket || ticket.length < 16) {
    return NextResponse.redirect(new URL("/?erro=link-invalido", request.url));
  }

  const consumed = await consumeVotingTicket(ticket);
  if (!consumed.ok) {
    if (consumed.reason === "already_voted") {
      return NextResponse.redirect(new URL("/?erro=ja-votou", request.url));
    }
    if (consumed.reason === "election_closed") {
      return NextResponse.redirect(new URL("/?erro=votacao-fechada", request.url));
    }
    return NextResponse.redirect(new URL("/?erro=link-expirado", request.url));
  }

  const election = await getElectionDetails(consumed.electionId);
  if (!election || election.status !== "OPEN") {
    return NextResponse.redirect(new URL("/?erro=votacao-fechada", request.url));
  }

  if (election.candidates.filter((candidate) => candidate.active).length === 0) {
    return NextResponse.redirect(new URL("/?erro=sem-candidatos", request.url));
  }

  const { token } = await createBallotToken(consumed.electionId);
  const response = NextResponse.redirect(new URL("/votar", request.url));
  response.cookies.set(BALLOT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 20
  });
  return response;
}
