import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminGetPurchases, adminUpdatePurchase, adminGetPurchaseDetail } from "../../functions/admin/purchases";
import { generatePurchaseBill, type PurchaseBillData } from "../../lib/pdf-bill";

export const Route = createFileRoute("/admin/purchases")({
  component: PurchasesPage,
});

function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "stopped" | "cancelled">("all");
  const [detail, setDetail] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const data = await adminGetPurchases();
      setPurchases(data.purchases || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (purchaseId: number, action: "approve" | "reject" | "stop" | "cancel") => {
    const labels: Record<string, string> = {
      approve: "approve",
      reject: "reject",
      stop: "stop",
      cancel: "cancel",
    };
    if (!confirm(`Are you sure you want to ${labels[action]} this purchase?`)) return;

    setActionLoading(purchaseId);
    try {
      await adminUpdatePurchase({ data: { purchaseId, action } });
      await loadPurchases();
      setDetail(null);
    } catch (err: any) {
      alert(err.message || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (p: any) => {
    if (p.cancelledAt) return "bg-gray-100 text-gray-600 ring-gray-200";
    if (p.stoppedAt) return "bg-orange-100 text-orange-600 ring-orange-200";
    if (p.status === "approved") return "bg-emerald/10 text-emerald ring-emerald/20";
    if (p.rejectedAt) return "bg-red-100 text-red-600 ring-red-200";
    return "bg-gold/10 text-gold ring-gold/20";
  };

  const getStatusLabel = (p: any) => {
    if (p.cancelledAt) return "cancelled";
    if (p.stoppedAt) return "stopped";
    if (p.rejectedAt) return "rejected";
    return p.status;
  };

  const handleDownloadPdf = (p: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGeneratingPdfId(p.id);
    try {
      generatePurchaseBill({
        purchaseId: p.id,
        carat: p.carat,
        weight: p.weight,
        goldRatePerGram: p.goldRatePerGram,
        goldValue: p.goldValue,
        makingCharges: p.makingCharges,
        gst: p.gst,
        hallmarkCharges: p.hallmarkCharges,
        totalAmount: p.totalAmount,
        status: p.status,
        createdAt: p.createdAt,
        userName: p.userName,
        userEmail: p.userEmail,
        userId: p.userId,
      });
    } catch {
      alert("Failed to generate PDF");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDownloadPdfFromDetail = () => {
    if (!detail) return;
    const p = detail.purchase;
    const u = detail.user;
    setGeneratingPdfId(p.id);
    try {
      generatePurchaseBill({
        purchaseId: p.id,
        carat: p.carat,
        weight: p.weight,
        goldRatePerGram: p.goldRatePerGram,
        goldValue: p.goldValue,
        makingCharges: p.makingCharges,
        gst: p.gst,
        hallmarkCharges: p.hallmarkCharges,
        totalAmount: p.totalAmount,
        status: p.status,
        createdAt: p.createdAt,
        userName: u?.name,
        userEmail: u?.email,
        userId: u?.id,
        monthlyReturnAmount: detail.investment?.monthlyReturnAmount,
        monthlyReturnPct: detail.investment?.monthlyReturnPct,
        packageName: detail.investment?.packageName,
      });
    } catch {
      alert("Failed to generate PDF");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const filtered = filter === "all" ? purchases : purchases.filter((p) => {
    const status = p.cancelledAt ? "cancelled" : p.stoppedAt ? "stopped" : p.rejectedAt ? "rejected" : p.status;
    return status === filter;
  });

  const counts = {
    all: purchases.length,
    pending: purchases.filter((p) => !p.cancelledAt && !p.stoppedAt && !p.rejectedAt && p.status === "pending").length,
    approved: purchases.filter((p) => p.status === "approved" && !p.stoppedAt && !p.cancelledAt).length,
    rejected: purchases.filter((p) => p.rejectedAt).length,
    stopped: purchases.filter((p) => p.stoppedAt).length,
    cancelled: purchases.filter((p) => p.cancelledAt).length,
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight">
            <span className="italic text-gold">Purchases</span>
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/60">
            Manage all gold purchase records
          </p>
        </div>
        <Link
          to="/admin/make-purchase"
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream shadow-sm transition-all hover:bg-gold/90"
        >
          + Make Purchase
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "approved", "rejected", "stopped", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-all ${
              filter === f
                ? "bg-gold text-cream"
                : "border border-gold/20 text-emerald/60 hover:border-gold/40"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Purchase Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gold/20 bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-gold/10 px-6 py-4">
              <h3 className="font-display text-lg text-emerald">Purchase #{detail.purchase.id}</h3>
              <button onClick={() => setDetail(null)} className="text-emerald/40 hover:text-emerald">✕</button>
            </div>
            <div className="space-y-3 px-6 py-4 text-sm">
              <div className="flex justify-between"><span className="text-emerald/70">User</span><span className="font-semibold">{detail.user?.name}</span></div>
              <div className="flex justify-between"><span className="text-emerald/70">Email</span><span>{detail.user?.email}</span></div>
              <div className="flex justify-between"><span className="text-emerald/70">Carat</span><span>{detail.purchase.carat}K</span></div>
              <div className="flex justify-between"><span className="text-emerald/70">Weight</span><span>{detail.purchase.weight}g</span></div>
              <div className="flex justify-between"><span className="text-emerald/70">Gold Rate/g</span><span>₹{detail.purchase.goldRatePerGram}</span></div>
              <div className="flex justify-between"><span className="text-emerald/70">Gold Value</span><span>₹{detail.purchase.goldValue?.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-emerald/70">Making</span><span>₹{detail.purchase.makingCharges?.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-emerald/70">GST</span><span>₹{detail.purchase.gst?.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-emerald/70">Hallmark</span><span>₹{detail.purchase.hallmarkCharges?.toLocaleString("en-IN")}</span></div>
              <div className="border-t border-gold/10 pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-display text-gold text-lg">₹{detail.purchase.totalAmount?.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between"><span className="text-emerald/70">Status</span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(detail.purchase)}`}>
                  {getStatusLabel(detail.purchase)}
                </span>
              </div>
              {detail.purchase.adminNote && (
                <div className="flex justify-between"><span className="text-emerald/70">Note</span><span>{detail.purchase.adminNote}</span></div>
              )}
              {detail.investment && (
                <div className="border-t border-gold/10 pt-3">
                  <p className="text-[10px] uppercase tracking-widest text-gold mb-2">Investment</p>
                  <div className="flex justify-between"><span className="text-emerald/70">Monthly Return</span><span className="text-emerald">₹{detail.investment.monthlyReturnAmount?.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-emerald/70">Return %</span><span>{detail.investment.monthlyReturnPct}%</span></div>
                  <div className="flex justify-between"><span className="text-emerald/70">Status</span><span>{detail.investment.status}</span></div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-gold/10 px-6 py-4">
              {detail.purchase.status === "pending" && (
                <>
                  <button
                    onClick={() => handleAction(detail.purchase.id, "approve")}
                    disabled={actionLoading === detail.purchase.id}
                    className="rounded-lg bg-emerald px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream transition-all hover:bg-emerald/90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(detail.purchase.id, "reject")}
                    disabled={actionLoading === detail.purchase.id}
                    className="rounded-lg bg-red-500 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream transition-all hover:bg-red-600 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              )}
              {detail.purchase.status === "approved" && !detail.purchase.stoppedAt && (
                <>
                  <button
                    onClick={() => handleAction(detail.purchase.id, "stop")}
                    disabled={actionLoading === detail.purchase.id}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream transition-all hover:bg-orange-600 disabled:opacity-50"
                  >
                    Stop
                  </button>
                  <button
                    onClick={() => handleAction(detail.purchase.id, "cancel")}
                    disabled={actionLoading === detail.purchase.id}
                    className="rounded-lg bg-gray-500 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream transition-all hover:bg-gray-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button
                onClick={() => setDetail(null)}
                className="rounded-lg border border-gold/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald/60 transition-all hover:border-gold/40 hover:bg-gold/5"
              >
                Close
              </button>
              <button
                onClick={handleDownloadPdfFromDetail}
                disabled={generatingPdfId === detail.purchase.id}
                className="rounded-lg border border-gold/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-gold transition-all hover:bg-gold/10 disabled:opacity-50"
              >
                {generatingPdfId === detail.purchase.id ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchases Table */}
      <div className="overflow-hidden rounded-xl border border-gold/10 bg-background shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-emerald/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-emerald/60">
            No purchases found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-[0.2em] text-emerald/60">
                  <th className="px-6 py-3 text-left font-semibold">ID</th>
                  <th className="px-6 py-3 text-left font-semibold">User</th>
                  <th className="px-6 py-3 text-left font-semibold">Details</th>
                  <th className="px-6 py-3 text-right font-semibold">Amount</th>
                  <th className="px-6 py-3 text-center font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold">Date</th>
                  <th className="px-6 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gold/5 transition-all duration-200 hover:bg-gold/5 cursor-pointer"
                    onClick={() => setDetail(p)}
                  >
                    <td className="px-6 py-3.5 text-xs font-mono text-emerald/60">#{p.id}</td>
                    <td className="px-6 py-3.5">
                      <div>
                        <p className="text-xs font-semibold">{p.userName}</p>
                        <p className="text-[10px] text-emerald/60">{p.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-emerald/70">
                      {p.carat}K • {p.weight}g
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-xs font-semibold text-gold">₹{p.totalAmount?.toLocaleString("en-IN")}</span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${getStatusColor(p)}`}>
                        <span className={`h-1 w-1 rounded-full ${
                          p.status === "approved" && !p.stoppedAt && !p.cancelledAt ? "bg-emerald" :
                          p.rejectedAt ? "bg-red-400" : "bg-gold"
                        }`} />
                        {getStatusLabel(p)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-[10px] text-emerald/60">
                      {new Date(p.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={(e) => handleDownloadPdf(p, e)}
                          disabled={generatingPdfId === p.id}
                          className="rounded px-2 py-1 text-[10px] font-semibold text-gold hover:bg-gold/10 disabled:opacity-50"
                          title="Download PDF"
                        >
                          {generatingPdfId === p.id ? "..." : "PDF"}
                        </button>
                        {p.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleAction(p.id, "approve")}
                              disabled={actionLoading === p.id}
                              className="rounded px-2 py-1 text-[10px] font-semibold text-emerald hover:bg-emerald/10 disabled:opacity-50"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleAction(p.id, "reject")}
                              disabled={actionLoading === p.id}
                              className="rounded px-2 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
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
