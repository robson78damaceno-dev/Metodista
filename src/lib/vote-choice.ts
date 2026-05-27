export type VoteChoice = "YES" | "NO" | "ABSTAIN";

export const VOTE_CHOICES = ["YES", "NO", "ABSTAIN"] as const;

export function voteChoiceLabel(choice: VoteChoice) {
  if (choice === "YES") return "Sim";
  if (choice === "NO") return "Não";
  return "Abster";
}
