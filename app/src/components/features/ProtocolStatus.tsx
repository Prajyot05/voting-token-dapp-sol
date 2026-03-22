"use client";

import { RefreshCw } from "lucide-react";
import { ActionShell } from "@/components/features/ActionShell";
import { shortKey } from "@/lib/utils";
import { useVoteDappClient } from "@/hooks/useVoteDappClient";

// Token mint uses 6 decimals, so keep fixed precision visible in telemetry.
function formatTokens(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}

export function ProtocolStatus() {
  const data = useVoteDappClient();

  const cards = [
    { label: "Wallet SOL", value: data.walletSol.toFixed(3) },
    { label: "Wallet Tokens", value: formatTokens(data.walletTokens) },
    { label: "Vault SOL", value: data.vaultSol.toFixed(3) },
    { label: "Election ID", value: data.electionId.toString() },
    ...(data.treasuryConfig ? [
      { label: "SOL Price", value: (Number(data.treasuryConfig.solPrice) / 1_000_000_000).toFixed(3) },
      { label: "Tokens Per Bundle", value: Number(data.treasuryConfig.tokensPerPurchase).toLocaleString() },
    ] : []),
  ];

  return (
    <ActionShell title="Protocol Telemetry" subtitle="Live on-chain state from your local validator." className="bg-[#050505]">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">{card.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 text-sm text-neutral-400 sm:grid-cols-2">
        <p>Treasury Authority: {data.treasuryConfig ? shortKey(data.treasuryConfig.authority, 6) : "Not initialized"}</p>
        <p>Leader: {data.electionResult ? `#${data.electionResult.winningProposalId}` : "No votes yet"}</p>
        <p>Winner: {data.winner ? `Proposal #${data.winner.winningProposalId}` : "Not declared"}</p>
        <p>Voter: {data.voter ? shortKey(data.voter.voterId, 6) : "Not registered"}</p>
      </div>

      <button
        onClick={() => void data.refresh()}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <RefreshCw className="size-4" />
        Refresh Chain State
      </button>
    </ActionShell>
  );
}
