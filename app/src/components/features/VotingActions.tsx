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
      className="border-cyan-300/30"
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => void dapp.purchaseTokens()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-300/15 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-300/25"
        >
          <Coins className="size-4" />
          Purchase Tokens
        </button>
        <button
          onClick={() => void dapp.registerVoter()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300/45 bg-fuchsia-300/15 px-4 py-3 text-sm text-fuchsia-100 hover:bg-fuchsia-300/25"
        >
          <UserPlus className="size-4" />
          Register Voter
        </button>
      </div>

      <form onSubmit={(event) => void onVote(event)} className="space-y-3 rounded-xl border border-cyan-300/20 bg-[#08122d]/80 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Cast Vote</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-cyan-100/70">
            Proposal ID
            <input
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cyan-300/35 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan-300"
            />
          </label>
          <label className="text-xs text-cyan-100/70">
            Token amount
            <input
              value={voteTokens}
              onChange={(e) => setVoteTokens(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cyan-300/35 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan-300"
            />
          </label>
        </div>
        <button className="rounded-lg border border-cyan-300/45 bg-cyan-300/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/25">
          Submit Vote
        </button>
      </form>

      <button
        onClick={() => void dapp.closeVoter()}
        className="mt-4 rounded-xl border border-red-300/40 bg-red-300/10 px-4 py-2 text-sm text-red-100 hover:bg-red-300/20"
      >
        Close Voter Account
      </button>

      <p className="mt-4 text-xs text-cyan-100/70">{dapp.txMessage}</p>
    </ActionShell>
  );
}
