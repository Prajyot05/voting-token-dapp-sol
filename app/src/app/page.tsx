import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { AdminActions } from "@/components/features/AdminActions";
import { ProposalActions } from "@/components/features/ProposalActions";
import { ProtocolStatus } from "@/components/features/ProtocolStatus";
import { VotingActions } from "@/components/features/VotingActions";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 md:p-12">
        <div className="relative max-w-3xl space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-neutral-400">
            <Sparkles className="size-3 text-neutral-500" />
            Solana Governance Layer
          </p>

          <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
            Shape Decisions with
            <span className="text-white">
              {" "}Precision & Scale
            </span>
          </h1>

          <p className="max-w-2xl text-base text-neutral-400 md:text-lg">
            Buy governance tokens, create proposals, cast votes, declare winners, and run treasury operations with seamless Anchor transactions.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/voting" className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200">
              Launch Voting
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link href="/proposals" className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
              Explore Proposals
            </Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-transparent px-6 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white">
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
