import { ProposalActions } from "@/components/features/ProposalActions";
import { ProtocolStatus } from "@/components/features/ProtocolStatus";

export default function ProposalsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-fuchsia-300/20 bg-[#130f35]/65 p-8 backdrop-blur">
        <h1 className="text-3xl font-semibold text-white">Proposal Studio</h1>
        <p className="mt-3 max-w-2xl text-fuchsia-100/70">
          Register proposals, pick winner after deadline, and close ended proposal accounts in one place.
        </p>
      </section>
      <ProtocolStatus />
      <ProposalActions />
    </div>
  );
}
