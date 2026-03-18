import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { AdminActions } from "@/components/features/AdminActions";
import { ProposalActions } from "@/components/features/ProposalActions";
import { ProtocolStatus } from "@/components/features/ProtocolStatus";
import { VotingActions } from "@/components/features/VotingActions";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#0b1233]/70 p-8 shadow-[0_0_40px_rgba(217,70,239,.15)] backdrop-blur-xl md:p-12">
        <div className="pointer-events-none absolute -top-24 -right-12 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-8 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative max-w-3xl space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">
            <Sparkles className="size-3" />
            Solana Governance Layer
          </p>

          <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
            Shape Decisions in a
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              {" "}Neon-Powered DAO Arena
            </span>
          </h1>

          <p className="max-w-2xl text-base text-cyan-100/75 md:text-lg">
            Buy governance tokens, create proposals, cast votes, declare winners, and run treasury operations with seamless Anchor transactions.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/voting" className="group inline-flex items-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-300/15 px-5 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/25">
              Launch Voting
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link href="/proposals" className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm text-white/85 transition hover:border-fuchsia-300/60 hover:text-fuchsia-200">
              Explore Proposals
            </Link>
            <Link href="/admin" className="rounded-full border border-indigo-300/35 bg-indigo-300/10 px-5 py-2 text-sm text-indigo-100 transition hover:bg-indigo-300/20">
              Open Admin
            </Link>
          </div>
        </div>
      </section>

      <ProtocolStatus />

      <div className="grid gap-6">
        <VotingActions />
        <ProposalActions />
        <AdminActions />
      </div>
    </div>
  );
}
