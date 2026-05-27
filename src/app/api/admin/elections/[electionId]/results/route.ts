import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { buildElectionReportPdf, electionReportFilename } from "@/lib/election-report-pdf";
import { getElectionFeedbacks, getElectionResult } from "@/lib/election-store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ electionId: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { electionId } = await params;
  const result = await getElectionResult(electionId);
  if (!result) {
    return NextResponse.json({ error: "Eleição não encontrada" }, { status: 404 });
  }

  const feedbacks = await getElectionFeedbacks(electionId);
  const pdf = await buildElectionReportPdf({
    election: {
      title: result.election.title,
      description: result.election.description,
      status: result.election.status,
      opensAt: result.election.opensAt,
      closesAt: result.election.closesAt
    },
    stats: {
      spentBallots: result.stats.spentBallots,
      linksIssued: result.stats.linksIssued,
      linksUsed: result.stats.linksUsed
    },
    candidates: result.candidates.map((candidate) => ({
      name: candidate.name,
      yesCount: candidate.yesCount,
      noCount: candidate.noCount,
      abstainCount: candidate.abstainCount
    })),
    feedbacks
  });

  const filename = electionReportFilename(result.election.title);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
