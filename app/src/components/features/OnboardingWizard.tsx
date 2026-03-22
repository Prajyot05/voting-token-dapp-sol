"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Rocket } from "lucide-react";
import { ActionShell } from "@/components/features/ActionShell";
import { useVoteDappClient } from "@/hooks/useVoteDappClient";

export function OnboardingWizard() {
  const dapp = useVoteDappClient();
  const [busy, setBusy] = useState<"none" | "setup">("none");

  const steps = useMemo(
    () => [
      { label: "Wallet Connected", done: dapp.connected },
      { label: "Treasury Initialized", done: Boolean(dapp.treasuryConfig) },
      { label: "Tokens in Wallet", done: dapp.walletTokens > 0 },
      { label: "Voter Registered", done: Boolean(dapp.voter) },
    ],
    [dapp.connected, dapp.treasuryConfig, dapp.voter, dapp.walletTokens],
  );

  const completed = steps.filter((step) => step.done).length;

  const onSetup = async () => {
    setBusy("setup");
    try {
      await dapp.runSetupWizard();
    } catch {
      // Transaction errors are surfaced by tx store + toast in the hook.
    } finally {
      setBusy("none");
    }
  };

  return (
    <ActionShell
      title="Guided Onboarding"
      subtitle="Wallet checks and one-click protocol setup wizard."
      className="border-emerald-300/25 bg-[#0a1421]/70"
    >
      <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-300/20 bg-[#0a1220]/75 px-4 py-3">
        <p className="text-sm text-emerald-100">Setup progress</p>
        <p className="text-sm font-semibold text-emerald-200">{completed}/{steps.length}</p>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2.5"
          >
            <span className="text-sm text-neutral-200">{step.label}</span>
            {step.done ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                <CheckCircle2 className="size-4" /> done
              </span>
            ) : (
              <span className="text-xs text-neutral-400">pending</span>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-5">
        <div className="rounded-xl border border-fuchsia-300/25 bg-[#120e23]/75 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-fuchsia-100">
            <Rocket className="size-4" /> One-click setup
          </p>
          <p className="mt-1 text-xs text-fuchsia-100/65">
            Initializes treasury (if missing), buys token bundle, and registers voter in one flow.
          </p>
          <button
            onClick={() => void onSetup()}
            disabled={!dapp.connected || busy !== "none"}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-fuchsia-300/45 bg-fuchsia-300/15 px-4 py-2 text-sm text-fuchsia-100 disabled:opacity-50"
          >
            {busy === "setup" ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            Run Setup Wizard
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-neutral-400">{dapp.txMessage}</p>
    </ActionShell>
  );
}
