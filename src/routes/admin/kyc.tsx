import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPendingKyc, processKyc } from "../../functions/admin/kyc";

export const Route = createFileRoute("/admin/kyc")({
  component: AdminKycPage,
});

function AdminKycPage() {
  const [kycList, setKycList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    loadKyc();
  }, []);

  const loadKyc = async () => {
    try {
      const data = await getPendingKyc();
      setKycList(data.kycList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: number, action: "approved" | "rejected") => {
    const reasonInput = action === "rejected" ? prompt("Rejection reason:") : null;
    if (action === "rejected" && reasonInput === null) return;

    setProcessing(id);
    try {
      const payload: { kycId: number; action: "approved" | "rejected"; reason?: string } = { kycId: id, action };
      if (reasonInput) payload.reason = reasonInput;
      await processKyc({ data: payload });
      await loadKyc();
    } catch (err: any) {
      alert(err.message || "Failed to process");
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === "all" ? kycList : kycList.filter((k) => k.status === filter);
  const pendingCount = kycList.filter((k) => k.status === "pending").length;

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
          KYC <span className="italic text-gold">Verification</span>
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

      {/* KYC List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded border border-gold/20 bg-cream p-12 text-center text-xs text-emerald/60">
            No KYC submissions found
          </div>
        ) : (
          filtered.map((k) => (
            <div key={k.id} className="rounded border border-gold/20 bg-cream p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold">{k.userName}</h3>
                  <p className="text-[10px] text-emerald/60">{k.userReferralCode} • {k.userEmail}</p>
                </div>
                <span
                  className={`rounded px-3 py-1 text-[10px] font-bold uppercase ${
                    k.status === "approved"
                      ? "bg-emerald/10 text-emerald"
                      : k.status === "rejected"
                        ? "bg-red-50 text-red-600"
                        : "bg-gold/10 text-gold"
                  }`}
                >
                  {k.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase text-emerald/70">PAN</p>
                  <p className="text-xs font-semibold">{k.panNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-emerald/70">Aadhaar</p>
                  <p className="text-xs font-semibold">{k.aadhaarNumber ? `****${k.aadhaarNumber.slice(-4)}` : "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-emerald/70">Bank</p>
                  <p className="text-xs font-semibold">{k.bankName || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-emerald/70">Account</p>
                  <p className="text-xs font-semibold">{k.accountNumber ? `****${k.accountNumber.slice(-4)}` : "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-emerald/70">IFSC</p>
                  <p className="text-xs font-semibold">{k.ifscCode || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-emerald/70">Submitted</p>
                  <p className="text-xs">{new Date(k.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              {k.rejectionReason && (
                <p className="mt-3 text-xs text-red-600">Reason: {k.rejectionReason}</p>
              )}

              {k.status === "pending" && (
                <div className="mt-4 flex gap-2 border-t border-gold/10 pt-4">
                  <button
                    onClick={() => handleProcess(k.id, "approved")}
                    disabled={processing === k.id}
                    className="rounded bg-emerald px-4 py-2 text-[10px] font-semibold text-cream transition-all hover:bg-emerald/80 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleProcess(k.id, "rejected")}
                    disabled={processing === k.id}
                    className="rounded border border-red-300 px-4 py-2 text-[10px] font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
