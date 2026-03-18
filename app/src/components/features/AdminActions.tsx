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
      className="bg-[#050505]"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-400">
        <Shield className="size-3" />
        Authority-required operations
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={(event) => void onInit(event)} className="space-y-4 rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Initialize Treasury</h3>
          <div className="space-y-4">
            <label className="block text-xs font-medium text-neutral-500">
              SOL price (SOL)
              <input
                value={solPrice}
                onChange={(e) => setSolPrice(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-white/30 focus:ring-1 focus:ring-white/30"
              />
            </label>
            <label className="block text-xs font-medium text-neutral-500">
              Tokens per purchase
              <input
                value={tokensPerPurchase}
                onChange={(e) => setTokensPerPurchase(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-white/30 focus:ring-1 focus:ring-white/30"
              />
            </label>
          </div>
          <button className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200">
            Initialize
          </button>
        </form>

        <form onSubmit={(event) => void onWithdraw(event)} className="space-y-4 rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Withdraw SOL</h3>
          <label className="block text-xs font-medium text-neutral-500">
            Amount (SOL)
            <input
              value={withdrawSol}
              onChange={(e) => setWithdrawSol(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-white/30 focus:ring-1 focus:ring-white/30"
            />
          </label>
          <button className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10">
            Withdraw
          </button>
        </form>
      </div>

      <p className="mt-4 text-xs text-neutral-400">{dapp.txMessage}</p>
    </ActionShell>
  );
}
