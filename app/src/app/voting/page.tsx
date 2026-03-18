import { ProtocolStatus } from "@/components/features/ProtocolStatus";
import { VotingActions } from "@/components/features/VotingActions";

export default function VotingPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-300/20 bg-[#0b1233]/65 p-8 backdrop-blur">
        <h1 className="text-3xl font-semibold text-white">Voting Arena</h1>
        <p className="mt-3 max-w-2xl text-cyan-100/70">
          Purchase voting tokens, register as voter, cast a vote, and close your voter account when done.
        </p>
      </section>
      <ProtocolStatus />
      <VotingActions />
    </div>
  );
}
