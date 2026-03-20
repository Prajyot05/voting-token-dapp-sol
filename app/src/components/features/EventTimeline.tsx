"use client";

import { motion } from "framer-motion";
import { Activity, Radio, Sparkles } from "lucide-react";
import { ActionShell } from "@/components/features/ActionShell";
import { useVoteDappClient } from "@/hooks/useVoteDappClient";

function colorByType(type: string) {
  if (type === "WinnerDeclared") return "border-amber-300/40 bg-amber-300/10 text-amber-100";
  if (type === "VoteCast") return "border-cyan-300/40 bg-cyan-300/10 text-cyan-100";
  if (type === "ProposalCreated") return "border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-100";
  return "border-white/15 bg-white/5 text-neutral-200";
}

export function EventTimeline() {
  const dapp = useVoteDappClient();

  return (
    <ActionShell
      title="Realtime Event Stream"
      subtitle="Live protocol events powered by Anchor listeners and websocket updates."
      className="border-emerald-300/25 bg-[#0d1428]/70"
    >
      <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-300/20 bg-[#091125]/70 px-4 py-3 text-sm">
        <div className="inline-flex items-center gap-2 text-emerald-100">
          <Radio className="size-4" />
          Stream status: {dapp.streamConnected ? "connected" : "disconnected"}
        </div>
        <div className="text-emerald-100/70">Events captured: {dapp.timeline.length}</div>
      </div>

      {dapp.timeline.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-black/10 p-5 text-sm text-neutral-300">
          <p className="inline-flex items-center gap-2">
            <Sparkles className="size-4 text-fuchsia-300" />
            No events yet. Trigger any instruction to populate the live timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dapp.timeline.slice(0, 15).map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: index * 0.03 }}
              className="rounded-xl border border-white/10 bg-[#070d1f]/75 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
                  <Activity className="size-4 text-cyan-300" />
                  {item.title}
                </p>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${colorByType(item.type)}`}>
                  {item.type}
                </span>
              </div>
              <p className="text-sm text-neutral-300">{item.detail}</p>
              <p className="mt-2 text-xs text-neutral-500">
                Slot {item.slot} · {new Date(item.timestamp * 1000).toLocaleTimeString()}
              </p>
            </motion.article>
          ))}
        </div>
      )}
    </ActionShell>
  );
}
