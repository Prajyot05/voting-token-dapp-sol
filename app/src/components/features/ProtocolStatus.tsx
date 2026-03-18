"use client";

import { RefreshCw } from "lucide-react";
import { ActionShell } from "@/components/features/ActionShell";
import { shortKey } from "@/lib/utils";
import { useVoteDappClient } from "@/hooks/useVoteDappClient";

export function ProtocolStatus() {
  const data = useVoteDappClient();

  const cards = [
    { label: "Wallet SOL", value: data.walletSol.toFixed(3) },
    { label: "Wallet Tokens", value: data.walletTokens.toFixed(2) },
    { label: "Vault SOL", value: data.vaultSol.toFixed(3) },
    { label: "Election ID", value: data.electionId.toString() },
  ];

  return (
    <ActionShell title="Protocol Telemetry" subtitle="Live on-chain state from your local validator.">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-cyan-300/20 bg-[#070c25]/80 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/55">{card.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 text-sm text-cyan-100/80 sm:grid-cols-2">
        <p>Treasury Authority: {data.treasuryConfig ? shortKey(data.treasuryConfig.authority, 6) : "Not initialized"}</p>
        <p>Leader: {data.electionResult ? `#${data.electionResult.winningProposalId}` : "No votes yet"}</p>
        <p>Winner: {data.winner ? `Proposal #${data.winner.winningProposalId}` : "Not declared"}</p>
        <p>Voter: {data.voter ? shortKey(data.voter.voterId, 6) : "Not registered"}</p>
      </div>

      <button
        onClick={() => void data.refresh()}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/20"
      >
        <RefreshCw className="size-4" />
        Refresh Chain State
      </button>
    </ActionShell>
  );
}
