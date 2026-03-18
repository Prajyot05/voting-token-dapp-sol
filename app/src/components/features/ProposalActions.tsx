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
      className="border-fuchsia-300/30 bg-[#130e34]/70"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={(event) => void onCreate(event)} className="space-y-3 rounded-xl border border-fuchsia-300/20 bg-[#0c0a2a]/80 p-4 lg:col-span-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-fuchsia-100">
            <Flag className="size-4" /> Create Proposal
          </h3>
          <label className="block text-xs text-fuchsia-100/70">
            Proposal info (max 50 chars)
            <input
              value={proposalInfo}
              onChange={(e) => setProposalInfo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fuchsia-300/30 bg-black/20 px-3 py-2 text-sm outline-none focus:border-fuchsia-300"
              maxLength={50}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-fuchsia-100/70">
              Deadline
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-lg border border-fuchsia-300/30 bg-black/20 px-3 py-2 text-sm outline-none focus:border-fuchsia-300"
              />
            </label>
            <label className="text-xs text-fuchsia-100/70">
              Stake token amount
              <input
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-fuchsia-300/30 bg-black/20 px-3 py-2 text-sm outline-none focus:border-fuchsia-300"
              />
            </label>
          </div>
          <button className="rounded-lg border border-fuchsia-300/45 bg-fuchsia-300/15 px-4 py-2 text-sm text-fuchsia-100 hover:bg-fuchsia-300/25">
            Register Proposal
          </button>
        </form>

        <div className="space-y-3 rounded-xl border border-cyan-300/20 bg-[#091129]/80 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Proposal Ops</h3>
          <label className="block text-xs text-cyan-100/70">
            Proposal ID
            <input
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cyan-300/35 bg-black/20 px-3 py-2 text-sm outline-none focus:border-cyan-300"
            />
          </label>
          <form onSubmit={(event) => void onPickWinner(event)}>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/45 bg-cyan-300/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/25">
              <Trophy className="size-4" /> Pick Winner
            </button>
          </form>
          <form onSubmit={(event) => void onCloseProposal(event)}>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-300/40 bg-red-300/10 px-4 py-2 text-sm text-red-100 hover:bg-red-300/20">
              <XCircle className="size-4" /> Close Proposal
            </button>
          </form>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dapp.proposals.map((proposal) => (
          <article key={proposal.proposalId} className="rounded-xl border border-fuchsia-300/20 bg-[#0a0d2a]/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-fuchsia-100/60">Proposal #{proposal.proposalId}</p>
            <p className="mt-1 text-sm text-white">{proposal.proposalInfo}</p>
            <p className="mt-2 text-xs text-fuchsia-100/70">Votes: {proposal.numberOfVotes}</p>
            <p className="text-xs text-fuchsia-100/70">Deadline: {new Date(proposal.deadline * 1000).toLocaleString()}</p>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-fuchsia-100/70">{dapp.txMessage}</p>
    </ActionShell>
  );
}
