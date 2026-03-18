export const APP_NAME = "NeonVote";

export const PROGRAM_ID = "3Qs3YBv9mw656z56RKSJa2MLznZKrpiRgvME33TopxYi";

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_ENDPOINT ?? "http://127.0.0.1:8899";

export const SEEDS = {
  TREASURY_CONFIG: "treasury-config",
  PROPOSAL_COUNTER: "proposal-counter",
  ELECTION_ROUND: "election-round",
  ELECTION_RESULT: "election-result",
  SOL_VAULT: "sol-vault",
  X_MINT: "x-mint",
  MINT_AUTHORITY: "mint-authority",
  PROPOSAL: "proposal",
  VOTER: "voter",
  WINNER: "winner",
} as const;
