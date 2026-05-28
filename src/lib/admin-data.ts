import {
  getElectionBlockingNewCreation,
  getElectionFeedbacks,
  getElectionResult,
  listElections
} from "@/lib/election-store";
import { debugLog, logStorageContext } from "@/lib/debug-log";

export async function getAdminDashboardData() {
  logStorageContext("getAdminDashboardData");
  const elections = await listElections();
  debugLog("getAdminDashboardData", {
    electionCount: elections.length,
    electionIds: elections.map((e) => e.id),
    titles: elections.map((e) => e.title)
  });
  const blockingElection = await getElectionBlockingNewCreation();
  const results = await Promise.all(elections.map((election) => getElectionResult(election.id)));
  const feedbackCounts = await Promise.all(elections.map((election) => getElectionFeedbacks(election.id)));
  const feedbackCount = feedbackCounts.reduce((sum, rows) => sum + rows.length, 0);

  return {
    elections: elections.map((election, index) => {
      const result = results[index];
      return {
        id: election.id,
        title: election.title,
        description: election.description,
        status: election.status,
        recipientEmail1: election.recipientEmail1,
        recipientEmail2: election.recipientEmail2,
        candidates: election.candidates.map((candidate) => {
          const stats = result?.candidates.find((row) => row.id === candidate.id);
          return {
            id: candidate.id,
            name: candidate.name,
            description: candidate.description,
            active: candidate.active,
            sortOrder: candidate.sortOrder,
            voteStats: {
              yes: stats?.yesCount ?? 0,
              no: stats?.noCount ?? 0,
              abstain: stats?.abstainCount ?? 0
            }
          };
        }),
        linkStats: {
          issued: result?.stats.linksIssued ?? 0,
          used: result?.stats.linksUsed ?? 0
        },
        totalVotes: result?.stats.spentBallots ?? 0,
        spentBallots: result?.stats.spentBallots ?? 0
      };
    }),
    feedbackCount,
    canCreateElection: !blockingElection,
    blockingElectionTitle: blockingElection?.title ?? null
  };
}
