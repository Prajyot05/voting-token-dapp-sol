"use client";

import { FormEvent, useState } from "react";
import { Flag, Trophy, XCircle } from "lucide-react";
import { ActionShell } from "@/components/features/ActionShell";
import { useVoteDappClient } from "@/hooks/useVoteDappClient";

function toUnixSeconds(value: string) {
  return Math.floor(new Date(value).getTime() / 1000);
}

export function ProposalActions() {
  const dapp = useVoteDappClient();

  const [proposalInfo, setProposalInfo] = useState("Proposal: Expand ecosystem grants");
  const [deadline, setDeadline] = useState(() =>
    new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [stakeAmount, setStakeAmount] = useState("100");
  const [proposalId, setProposalId] = useState("1");

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    await dapp.registerProposal(proposalInfo, toUnixSeconds(deadline), Number(stakeAmount));
  };

  const onPickWinner = async (event: FormEvent) => {
    event.preventDefault();
    await dapp.pickWinner(Number(proposalId));
  };

  const onCloseProposal = async (event: FormEvent) => {
    event.preventDefault();
    await dapp.closeProposal(Number(proposalId));
  };

  return (
    <ActionShell
      title="Proposal Command"
      subtitle="Create proposals, finalize winner after deadline, and close ended proposals."
      className="bg-[#050505]"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={(event) => void onCreate(event)} className="space-y-4 rounded-xl border border-white/10 bg-[#0a0a0a] p-5 lg:col-span-2">
          <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            <Flag className="size-4" /> Create Proposal
          </h3>
          <label className="block text-xs font-medium text-neutral-500">
            Proposal info (max 50 chars)
            <input
              value={proposalInfo}
              onChange={(e) => setProposalInfo(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-white/30 focus:ring-1 focus:ring-white/30"
              maxLength={50}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-neutral-500">
              Deadline
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-white/30 focus:ring-1 focus:ring-white/30"
              />
            </label>
            <label className="text-xs font-medium text-neutral-500">
              Stake token amount
              <input
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-white/30 focus:ring-1 focus:ring-white/30"
              />
            </label>
          </div>
          <button className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200">
            Register Proposal
          </button>
        </form>

        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Proposal Ops</h3>
          <label className="block text-xs font-medium text-neutral-500">
            Proposal ID
            <input
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-white/30 focus:ring-1 focus:ring-white/30"
            />
          </label>
          <div className="space-y-2">
            <form onSubmit={(event) => void onPickWinner(event)}>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10">
                <Trophy className="size-4" /> Pick Winner
              </button>
            </form>
            <form onSubmit={(event) => void onCloseProposal(event)}>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300">
                <XCircle className="size-4" /> Close Proposal
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dapp.proposals.map((proposal) => (
          <article key={proposal.proposalId} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">Proposal #{proposal.proposalId}</p>
            <p className="mt-2 text-sm text-white">{proposal.proposalInfo}</p>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-neutral-400">
              <p>Votes: <span className="text-white">{proposal.numberOfVotes}</span></p>
              <p>{new Date(proposal.deadline * 1000).toLocaleDateString()}</p>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-neutral-400">{dapp.txMessage}</p>
    </ActionShell>
  );
}
