import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { previewPurchase, confirmPurchase, getMyPurchases } from "../../functions/user/purchase";
import { generatePurchaseBill, type PurchaseBillData } from "../../lib/pdf-bill";

export const Route = createFileRoute("/dashboard/purchase")({
  component: PurchasePage,
});

function PurchasePage() {
  const [carat, setCarat] = useState<18 | 22 | 24>(22);
  const [weight, setWeight] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<"purchase" | "history">("purchase");
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getMyPurchases();
      setPurchases(data.purchases || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePreview = async () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return alert("Enter a valid weight in grams");
    setPreviewLoading(true);
    try {
      const data = await previewPurchase({ data: { carat, weight: w } });
      setPreview(data);
    } catch (err: any) {
      alert(err.message || "Failed to compute billing");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return alert("Enter a valid weight in grams");
    if (!confirm("Are you sure you want to confirm this purchase?")) return;

    setConfirmLoading(true);
    try {
      const result = await confirmPurchase({ data: { carat, weight: w } });
      alert(`Purchase successful! ID: #${result.purchaseId}\nTotal: ₹${result.totalAmount.toLocaleString("en-IN")}\nMonthly Return: ₹${result.monthlyReturnAmount.toLocaleString("en-IN")}`);
      // Auto-generate PDF bill
      try {
        generatePurchaseBill({
          purchaseId: result.purchaseId,
          carat,
          weight: w,
          goldRatePerGram: preview?.effectiveRate,
          goldValue: preview?.goldValue,
          makingCharges: preview?.makingCharges,
          gst: preview?.gst,
          hallmarkCharges: preview?.hallmarkCharges,
          totalAmount: result.totalAmount,
          status: "approved",
          createdAt: new Date().toISOString(),
          monthlyReturnAmount: result.monthlyReturnAmount,
          monthlyReturnPct: preview?.monthlyReturnPct,
          packageName: preview?.packageName,
        });
      } catch { /* PDF generation is best-effort */ }
      setWeight("");
      setPreview(null);
      setActiveTab("history");
      await loadHistory();
    } catch (err: any) {
      alert(err.message || "Purchase failed");
    } finally {
      setConfirmLoading(false);
    }
  };

  const getStatusColor = (p: any) => {
    if (p.cancelledAt) return "bg-gray-100 text-gray-600";
    if (p.stoppedAt) return "bg-orange-100 text-orange-600";
    if (p.status === "approved") return "bg-emerald/10 text-emerald";
    if (p.rejectedAt) return "bg-red-100 text-red-600";
    return "bg-gold/10 text-gold";
  };

  const getStatusLabel = (p: any) => {
    if (p.cancelledAt) return "cancelled";
    if (p.stoppedAt) return "stopped";
    if (p.rejectedAt) return "rejected";
    return p.status;
  };

  const handleDownloadPdf = (p: any) => {
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
        monthlyReturnAmount: p.investment?.monthlyReturnAmount,
        monthlyReturnPct: p.investment?.monthlyReturnPct,
        packageName: p.investment?.packageName,
      });
    } catch {
      alert("Failed to generate PDF");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        Make a <span className="italic text-gold">Purchase</span>
      </h1>
      <p className="text-xs text-emerald/70">
        Buy gold jewellery and start earning monthly investment returns.
      </p>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("purchase")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all ${
            activeTab === "purchase"
              ? "bg-gold text-cream"
              : "border border-gold/20 text-emerald/60 hover:border-gold/40"
          }`}
        >
          New Purchase
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all ${
            activeTab === "history"
              ? "bg-gold text-cream"
              : "border border-gold/20 text-emerald/60 hover:border-gold/40"
          }`}
        >
          Purchase History {purchases.length > 0 && `(${purchases.length})`}
        </button>
      </div>

      {activeTab === "purchase" && (
        <>
          {/* Carat Selection */}
          <div className="rounded border border-gold/20 bg-background p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Select Carat</h3>
            <div className="flex gap-3">
              {([18, 22, 24] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCarat(c)}
                  className={`flex-1 rounded-lg border p-4 text-center transition-all ${
                    carat === c
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-gold/20 text-emerald/60 hover:border-gold/40"
                  }`}
                >
                  <p className="font-display text-2xl">{c}K</p>
                  <p className="mt-1 text-xs uppercase tracking-widest">
                    {c === 24 ? "Pure Gold" : c === 22 ? "Standard" : "Light"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Weight Input */}
          <div className="rounded border border-gold/20 bg-background p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Weight (grams)</h3>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={weight}
                onChange={(e) => { setWeight(e.target.value); setPreview(null); }}
                placeholder="Enter weight in grams"
                className="flex-1 border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
              />
              <button
                onClick={handlePreview}
                disabled={previewLoading || !weight}
                className="border border-emerald/40 px-6 py-2 text-xs font-semibold uppercase tracking-widest transition-all hover:bg-emerald/10 disabled:opacity-50"
              >
                {previewLoading ? "Computing..." : "Preview Billing"}
              </button>
            </div>
            <p className="mt-2 text-xs text-emerald/50">Minimum purchase: ₹10,000</p>
          </div>

          {/* Billing Preview */}
          {preview && (
            <div className="rounded border-2 border-gold/40 bg-gold/5 p-6 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Billing Summary</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald/70">Carat</span>
                  <span className="font-semibold">{preview.carat}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald/70">Weight</span>
                  <span className="font-semibold">{preview.weight}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald/70">Gold Rate/g</span>
                  <span className="font-semibold">₹{preview.effectiveRate.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald/70">Gold Value</span>
                  <span className="font-semibold">₹{preview.goldValue.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald/70">Making Charges (8%)</span>
                  <span className="font-semibold">₹{preview.makingCharges.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald/70">GST (18%)</span>
                  <span className="font-semibold">₹{preview.gst.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald/70">Hallmark</span>
                  <span className="font-semibold">₹{preview.hallmarkCharges.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="border-t border-gold/20 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount</span>
                  <span className="font-display text-gold">₹{preview.total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="rounded-lg border border-emerald/20 bg-emerald/5 p-4">
                <p className="text-xs uppercase tracking-widest text-emerald/70">Monthly Return</p>
                <p className="mt-1 font-display text-2xl text-emerald">₹{preview.monthlyReturnAmount.toLocaleString("en-IN")}</p>
                <p className="text-xs text-emerald/60">{preview.monthlyReturnPct}% per month • Package: {preview.packageName}</p>
              </div>

              <button
                onClick={handleConfirm}
                disabled={confirmLoading}
                className="w-full bg-gold py-3 text-xs font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-50"
              >
                {confirmLoading ? "Processing..." : "Confirm Purchase"}
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === "history" && (
        <>
          {loadingHistory ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded border border-gold/20 bg-background" />
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <div className="rounded border border-gold/20 bg-background p-12 text-center">
              <p className="text-sm text-emerald/60">No purchases yet. Make your first gold purchase above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((p) => (
                <div key={p.id} className="rounded border border-gold/20 bg-background p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm">Purchase #{p.id}</p>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${getStatusColor(p)}`}>
                          {getStatusLabel(p)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-emerald/60">
                        {p.carat}K • {p.weight}g • {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-display text-lg text-gold">₹{p.totalAmount.toLocaleString("en-IN")}</p>
                      <button
                        onClick={() => handleDownloadPdf(p)}
                        disabled={generatingPdfId === p.id}
                        className="rounded border border-gold/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold transition-all hover:bg-gold/10 disabled:opacity-50"
                        title="Download PDF Invoice"
                      >
                        {generatingPdfId === p.id ? "..." : "PDF"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
