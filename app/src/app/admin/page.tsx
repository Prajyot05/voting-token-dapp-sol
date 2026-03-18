import { AdminActions } from "@/components/features/AdminActions";
import { ProtocolStatus } from "@/components/features/ProtocolStatus";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-300/20 bg-[#0d1235]/65 p-8 backdrop-blur">
        <h1 className="text-3xl font-semibold text-white">Treasury Admin</h1>
        <p className="mt-3 max-w-2xl text-indigo-100/70">
          Initialize treasury and withdraw SOL from the vault using authority-gated contract instructions.
        </p>
      </section>
      <ProtocolStatus />
      <AdminActions />
    </div>
  );
}
