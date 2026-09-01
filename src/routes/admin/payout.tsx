import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPendingPayouts, processPayout } from "../../functions/admin/payout";

export const Route = createFileRoute("/admin/payout")({
  component: AdminPayoutPage,
});

function AdminPayoutPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      const data = await getPendingPayouts();
      setPayouts(data.payouts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: number, action: "approved" | "rejected") => {
    const noteInput = action === "rejected" ? prompt("Rejection reason (optional):") : null;
    if (action === "rejected" && noteInput === null) return;

    setProcessing(id);
    try {
      const payload: { withdrawalId: number; action: "approved" | "rejected"; note?: string } = { withdrawalId: id, action };
      if (noteInput) payload.note = noteInput;
      await processPayout({ data: payload });
      await loadPayouts();
    } catch (err: any) {
      alert(err.message || "Failed to process");
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === "all" ? payouts : payouts.filter((p) => p.status === filter);
  const pendingCount = payouts.filter((p) => p.status === "pending").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-cream" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">
          Payout <span className="italic text-gold">Processing</span>
        </h1>
        {pendingCount > 0 && (
          <span className="rounded bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all ${
              filter === f ? "bg-emerald text-cream" : "border border-emerald/40 text-emerald hover:bg-emerald/10"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Payouts Table */}
      <div className="rounded border border-gold/20 bg-cream">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-emerald/60">No payouts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-6 py-3 text-left">User</th>
                  <th className="px-6 py-3 text-left">Code</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Note</th>
                  <th className="px-6 py-3 text-right">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                    <td className="px-6 py-3 text-xs font-semibold">{p.userName}</td>
                    <td className="px-6 py-3 text-[10px] text-emerald/70">{p.userReferralCode}</td>
                    <td className="px-6 py-3 text-right text-xs font-semibold text-emerald">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                          p.status === "approved"
                            ? "bg-emerald/10 text-emerald"
                            : p.status === "rejected"
                              ? "bg-red-50 text-red-600"
                              : "bg-gold/10 text-gold"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[10px] text-emerald/60">{p.adminNote || "-"}</td>
                    <td className="px-6 py-3 text-right text-[10px] text-emerald/70">
                      {new Date(p.requestedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {p.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleProcess(p.id, "approved")}
                            disabled={processing === p.id}
                            className="rounded bg-emerald px-3 py-1 text-[10px] font-semibold text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleProcess(p.id, "rejected")}
                            disabled={processing === p.id}
                            className="rounded border border-red-300 px-3 py-1 text-[10px] font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
