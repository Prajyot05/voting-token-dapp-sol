import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";

import idl from "@/idl/vote_dapp.json";

export type VoteDappProgram = Program<Idl>;

export function getProvider(wallet: AnchorProvider["wallet"], endpoint: string) {
  const connection = new web3.Connection(endpoint, "confirmed");
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

export function getProgram(provider: AnchorProvider) {
  const parsedIdl = idl as Idl;
  return new Program(parsedIdl, provider);
}

export const programService = {
  async initializeTreasury(
    program: VoteDappProgram,
    solPrice: bigint,
    tokensPerPurchase: bigint,
  ) {
    return program.methods.initializeTreasury(solPrice, tokensPerPurchase);
  },

  async purchaseTokens(program: VoteDappProgram) {
    return program.methods.purchaseTokens();
  },

  async registerVoter(program: VoteDappProgram) {
    return program.methods.registerVoter();
  },

  async registerProposal(
    program: VoteDappProgram,
    proposalInfo: string,
    deadline: bigint,
    tokenAmount: bigint,
  ) {
    return program.methods.registerProposal(proposalInfo, deadline, tokenAmount);
  },

  async proposalToVote(program: VoteDappProgram, proposalId: number, tokenAmount: bigint) {
    return program.methods.proposalToVote(proposalId, tokenAmount);
  },

  async pickWinner(program: VoteDappProgram, proposalId: number) {
    return program.methods.pickWinner(proposalId);
  },

  async closeProposal(program: VoteDappProgram, proposalId: number) {
    return program.methods.closeProposal(proposalId);
  },

  async closeVoter(program: VoteDappProgram) {
    return program.methods.closeVoter();
  },

  async withdrawSol(program: VoteDappProgram, amount: bigint) {
    return program.methods.withdrawSol(amount);
  },
};
