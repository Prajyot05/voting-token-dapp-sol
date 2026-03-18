"use client";

import { FormEvent, useState } from "react";
import { Shield } from "lucide-react";
import { ActionShell } from "@/components/features/ActionShell";
import { useVoteDappClient } from "@/hooks/useVoteDappClient";
import { toLamports } from "@/lib/utils";

export function AdminActions() {
  const dapp = useVoteDappClient();
  const [solPrice, setSolPrice] = useState("1");
  const [tokensPerPurchase, setTokensPerPurchase] = useState("1000");
  const [withdrawSol, setWithdrawSol] = useState("0.01");

  const onInit = async (event: FormEvent) => {
    event.preventDefault();
    await dapp.initializeTreasury(toLamports(Number(solPrice)), Number(tokensPerPurchase));
  };

  const onWithdraw = async (event: FormEvent) => {
    event.preventDefault();
    await dapp.withdrawSol(toLamports(Number(withdrawSol)));
  };

  return (
    <ActionShell
      title="Admin Control"
      subtitle="Initialize treasury and manage vault liquidity with authority checks."
      className="border-indigo-300/30 bg-[#111033]/70"
    >
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-300/35 bg-indigo-300/10 px-3 py-1 text-xs text-indigo-100">
        <Shield className="size-3" />
        Authority-required operations
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={(event) => void onInit(event)} className="space-y-3 rounded-xl border border-indigo-300/20 bg-[#090d2a]/80 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-100">Initialize Treasury</h3>
          <label className="block text-xs text-indigo-100/70">
            SOL price (SOL)
            <input
              value={solPrice}
              onChange={(e) => setSolPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-indigo-300/30 bg-black/20 px-3 py-2 text-sm outline-none focus:border-indigo-300"
            />
          </label>
          <label className="block text-xs text-indigo-100/70">
            Tokens per purchase
            <input
              value={tokensPerPurchase}
              onChange={(e) => setTokensPerPurchase(e.target.value)}
              className="mt-1 w-full rounded-lg border border-indigo-300/30 bg-black/20 px-3 py-2 text-sm outline-none focus:border-indigo-300"
            />
          </label>
          <button className="rounded-lg border border-indigo-300/45 bg-indigo-300/15 px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-300/25">
            Initialize
          </button>
        </form>

        <form onSubmit={(event) => void onWithdraw(event)} className="space-y-3 rounded-xl border border-fuchsia-300/20 bg-[#0b0928]/80 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-fuchsia-100">Withdraw SOL</h3>
          <label className="block text-xs text-fuchsia-100/70">
            Amount (SOL)
            <input
              value={withdrawSol}
              onChange={(e) => setWithdrawSol(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fuchsia-300/30 bg-black/20 px-3 py-2 text-sm outline-none focus:border-fuchsia-300"
            />
          </label>
          <button className="rounded-lg border border-fuchsia-300/45 bg-fuchsia-300/15 px-4 py-2 text-sm text-fuchsia-100 hover:bg-fuchsia-300/25">
            Withdraw
          </button>
        </form>
      </div>

      <p className="mt-4 text-xs text-indigo-100/70">{dapp.txMessage}</p>
    </ActionShell>
  );
}
