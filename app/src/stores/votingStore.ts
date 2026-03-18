import { create } from "zustand";
import type { ProposalItem, WinnerItem } from "@/types/voting";

type VotingStore = {
  electionId: bigint;
  proposals: ProposalItem[];
  winners: WinnerItem[];
  setElectionId: (electionId: bigint) => void;
  setProposals: (proposals: ProposalItem[]) => void;
  upsertProposal: (proposal: ProposalItem) => void;
  addWinner: (winner: WinnerItem) => void;
};

export const useVotingStore = create<VotingStore>((set, get) => ({
  electionId: 0n,
  proposals: [],
  winners: [],
  setElectionId: (electionId) => set({ electionId }),
  setProposals: (proposals) => set({ proposals }),
  upsertProposal: (proposal) => {
    const current = get().proposals;
    const idx = current.findIndex((p) => p.proposalId === proposal.proposalId);
    if (idx === -1) {
      set({ proposals: [...current, proposal] });
      return;
    }
    const next = [...current];
    next[idx] = proposal;
    set({ proposals: next });
  },
  addWinner: (winner) => set({ winners: [winner, ...get().winners] }),
}));
