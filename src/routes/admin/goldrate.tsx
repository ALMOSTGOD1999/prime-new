import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setGoldRate, getGoldRateHistory } from "../../functions/admin/goldrate";

export const Route = createFileRoute("/admin/goldrate")({
  component: AdminGoldRatePage,
});

function AdminGoldRatePage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getGoldRateHistory();
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetRate = async () => {
    const p = parseFloat(price);
    if (!p || p <= 0) return alert("Enter a valid price in USD");
    setSaving(true);
    try {
      await setGoldRate({ data: { price: p } });
      setPrice("");
      await loadHistory();
    } catch (err: any) {
      alert(err.message || "Failed to set rate");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-48 animate-pulse rounded border border-gold/20 bg-cream" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        Gold <span className="italic text-gold">Rate</span>
      </h1>
      <p className="text-xs text-emerald/70">
        Set the daily gold rate (XAU/USD) that all users will see.
      </p>

      {/* Set Rate */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Set Today's Gold Rate</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-emerald">$</span>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 3250.00"
              className="w-48 border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold"
            />
            <span className="text-xs text-emerald/60">USD per ounce</span>
          </div>
          <button
            onClick={handleSetRate}
            disabled={saving || !price}
            className="bg-gold px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-50"
          >
            {saving ? "Setting..." : "Set Rate"}
          </button>
        </div>
        {history.length > 0 && (
          <p className="mt-3 text-[10px] text-emerald/50">
            Current rate: <span className="font-display text-sm text-gold">${history[0].price}</span> — set by {history[0].setByName} at {new Date(history[0].createdAt).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {/* Rate History */}
      <div className="rounded border border-gold/20 bg-cream">
        <div className="border-b border-gold/10 px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Rate History</h3>
        </div>
        {history.length === 0 ? (
          <div className="p-12 text-center text-xs text-emerald/60">No rates set yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-6 py-3 text-left">Date & Time</th>
                  <th className="px-6 py-3 text-left">Rate (USD)</th>
                  <th className="px-6 py-3 text-left">Set By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-gold/5 hover:bg-gold/5">
                    <td className="px-6 py-3 text-xs">{new Date(h.createdAt).toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 font-display text-sm text-gold">${h.price}</td>
                    <td className="px-6 py-3 text-xs text-emerald/70">{h.setByName}</td>
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
