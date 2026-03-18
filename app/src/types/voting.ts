export type TxStatus = "idle" | "pending" | "success" | "error";

export interface TreasuryConfig {
  authority: string;
  xMint: string;
  solPrice: bigint;
  tokensPerPurchase: bigint;
}

export interface ProposalItem {
  proposalId: number;
  proposalInfo: string;
  numberOfVotes: number;
  deadline: number;
  authority: string;
}

export interface WinnerItem {
  electionId: bigint;
  winningProposalId: number;
  numberOfVotes: number;
  proposalInfo: string;
  declaredAt: number;
}
