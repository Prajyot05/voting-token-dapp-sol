"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ActionShell } from "@/components/features/ActionShell";
import { useVoteDappClient } from "@/hooks/useVoteDappClient";

const COLORS = ["#22d3ee", "#f472b6", "#818cf8", "#34d399", "#fb7185", "#f59e0b"];

export function VoteRaceCharts() {
  const dapp = useVoteDappClient();

  const raceData = useMemo(() => {
    const totalVotes = dapp.proposals.reduce((sum, proposal) => sum + proposal.numberOfVotes, 0);
    return dapp.proposals.map((proposal) => ({
      name: `P${proposal.proposalId}`,
      votes: proposal.numberOfVotes,
      share: totalVotes > 0 ? Number(((proposal.numberOfVotes / totalVotes) * 100).toFixed(1)) : 0,
    }));
  }, [dapp.proposals]);

  return (
    <ActionShell
      title="Vote Race Visualizer"
      subtitle="Animated race bars and distribution chart for portfolio-ready presentation quality."
      className="border-cyan-300/25 bg-[#0b1528]/70"
    >
      {raceData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-cyan-300/25 bg-cyan-300/5 p-5 text-sm text-cyan-100/70">
          No proposals yet. Create proposals and cast votes to animate the race.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28 }}
            className="rounded-xl border border-cyan-300/20 bg-[#070d1f]/80 p-3"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-cyan-100/60">Live vote race</p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer>
                <BarChart data={raceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="name" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "rgba(2,6,23,0.95)",
                      border: "1px solid rgba(34,211,238,0.35)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                    {raceData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28 }}
            className="rounded-xl border border-fuchsia-300/20 bg-[#100b22]/80 p-3"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-fuchsia-100/60">Vote share</p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(2,6,23,0.95)",
                      border: "1px solid rgba(244,114,182,0.35)",
                      borderRadius: 12,
                    }}
                  />
                  <Pie data={raceData} dataKey="share" nameKey="name" outerRadius={88} innerRadius={44}>
                    {raceData.map((entry, index) => (
                      <Cell key={`pie-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-300">
              {raceData.map((entry, index) => (
                <p key={`legend-${entry.name}`} className="inline-flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {entry.name}: {entry.share}%
                </p>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </ActionShell>
  );
}
