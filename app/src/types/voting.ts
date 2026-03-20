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

export type StreamEventType =
  | "ProposalCreated"
  | "VoteCast"
  | "WinnerDeclared"
  | "TokensPurchased"
  | "TreasuryInitialized"
  | "ProposalClosed"
  | "VoterAccountClosed"
  | "SolWithdrawn";

export interface TimelineEvent {
  id: string;
  type: StreamEventType;
  title: string;
  detail: string;
  slot: number;
  timestamp: number;
}

export interface VoteRacePoint {
  name: string;
  votes: number;
  share: number;
}
