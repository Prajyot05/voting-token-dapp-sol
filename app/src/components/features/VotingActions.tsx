"use client";

import { FormEvent, useState } from "react";
import { Coins, UserPlus } from "lucide-react";
import { ActionShell } from "@/components/features/ActionShell";
import { useVoteDappClient } from "@/hooks/useVoteDappClient";

export function VotingActions() {
  const dapp = useVoteDappClient();
  const [proposalId, setProposalId] = useState("1");
  const [voteTokens, setVoteTokens] = useState("100");

  const onVote = async (event: FormEvent) => {
    event.preventDefault();
    await dapp.voteProposal(Number(proposalId), Number(voteTokens));
  };

  return (
    <ActionShell
      title="Voting Arena"
      subtitle="Purchase tokens, register as voter, vote once per round, and close voter account."
      className="bg-[#050505]"
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => void dapp.purchaseTokens()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <Coins className="size-4" />
          Purchase Tokens
        </button>
        <button
          onClick={() => void dapp.registerVoter()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <UserPlus className="size-4" />
          Register Voter
        </button>
      </div>

      <form onSubmit={(event) => void onVote(event)} className="space-y-4 rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Cast Vote</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-neutral-500">
            Proposal ID
            <input
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-white/30 focus:ring-1 focus:ring-white/30"
            />
          </label>
          <label className="text-xs font-medium text-neutral-500">
            Token amount
            <input
              value={voteTokens}
              onChange={(e) => setVoteTokens(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-white/30 focus:ring-1 focus:ring-white/30"
            />
          </label>
        </div>
        <button className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200">
          Submit Vote
        </button>
      </form>

      <button
        onClick={() => void dapp.closeVoter()}
        className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
      >
        Close Voter Account
      </button>

      <p className="mt-4 text-xs text-neutral-400">{dapp.txMessage}</p>
    </ActionShell>
  );
}
