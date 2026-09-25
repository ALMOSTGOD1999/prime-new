import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyCashback } from "../../functions/user/cashback";

export const Route = createFileRoute("/dashboard/cashback")({
  component: CashbackPage,
});

const RATE_CARDS = [
  { rate: "@2% per month", detail: "on purchase value up to Rs 1,99,999/-", cap: "for up to 60% Purchase value" },
  { rate: "@2.5% per month", detail: "on purchase value of Rs 2,00,000/- to Rs 4,99,999/-", cap: "for up to 60% Purchase value" },
  { rate: "@3% per month", detail: "on purchase value of Rs 5,00,000/- and above", cap: "for up to 60% Purchase value" },
];

function CashbackPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyCashback()
      .then(setData)
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded bg-emerald/10" />
        <div className="h-32 animate-pulse rounded border border-gold/20 bg-background" />
        <div className="h-48 animate-pulse rounded border border-gold/20 bg-background" />
      </div>
    );
  }

  if (error) return <div className="rounded border border-gold/20 bg-background p-6 text-sm text-red-500">{error}</div>;
  if (!data) return null;

  const { balance, minBilling, capPct, ledger, history } = data;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-1 rounded-full bg-gold" />
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-gold sm:text-4xl">
            Gold Purchase Cashback
          </h1>
          <p className="mt-2 text-sm italic text-emerald/60">Purchase Cashback generates on a monthly basis</p>
        </div>
      </div>

      {/* Minimum billing + rate cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-lg border border-gold/30 bg-gold/5 p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-emerald/70">Minimum Billing</p>
          <p className="mt-3 font-display text-4xl font-bold text-gold">Rs 10,000/-</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-emerald/60">Purchase Now</p>
        </div>
        <div className="space-y-4 lg:col-span-2">
          {RATE_CARDS.map((c) => (
            <div key={c.rate} className="rounded-lg border border-gold/20 bg-card p-5 transition-colors hover:border-gold/40">
              <p className="text-sm font-bold text-gold">{c.rate}</p>
              <p className="mt-1 text-xs text-emerald/70">
                {c.detail} <span className="text-emerald/50">— {c.cap}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Balance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-5">
          <p className="text-[10px] uppercase tracking-widest text-gold">Cashback Balance</p>
          <p className="mt-1 font-display text-2xl text-gold">₹{(balance ?? 0).toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[11px] text-emerald/60">Spendable on products</p>
        </div>
        <div className="rounded-lg border border-emerald/20 bg-background p-5">
          <p className="text-[10px] uppercase tracking-widest text-emerald/60">Minimum Billing</p>
          <p className="mt-1 font-display text-2xl text-emerald">₹{(minBilling ?? 10000).toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[11px] text-emerald/60">per purchase to qualify</p>
        </div>
        <div className="rounded-lg border border-emerald/20 bg-background p-5">
          <p className="text-[10px] uppercase tracking-widest text-emerald/60">Lifetime Cap</p>
          <p className="mt-1 font-display text-2xl text-emerald">{capPct ?? 60}%</p>
          <p className="mt-1 text-[11px] text-emerald/60">of each purchase value</p>
        </div>
      </div>

      {/* Enrollments */}
      <div className="rounded-lg border border-gold/15 bg-background">
        <div className="border-b border-gold/10 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">My Cashback Purchases</h3>
          <p className="mt-0.5 text-[11px] text-emerald/60">
            Each approved purchase of Rs {minBilling?.toLocaleString("en-IN")}/- or more earns monthly cashback until {capPct}% of its value is reached.
          </p>
        </div>
        {ledger.length === 0 ? (
          <p className="px-5 py-6 text-sm text-emerald/60">
            No cashback-eligible purchases yet. Make a gold purchase of Rs {minBilling?.toLocaleString("en-IN")}/- or more (approved by admin) to start earning monthly cashback.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-left text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-5 py-3">Purchase</th>
                  <th className="px-5 py-3 text-right">Value</th>
                  <th className="px-5 py-3 text-right">Rate</th>
                  <th className="px-5 py-3 text-right">Monthly</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Cap (60%)</th>
                  <th className="px-5 py-3">Progress</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l: any) => {
                  const pct = Math.min(100, Math.round((l.totalPaid / l.capAmount) * 100));
                  return (
                    <tr key={l.id} className="border-b border-gold/5 last:border-0">
                      <td className="px-5 py-3 text-xs text-emerald">#{l.purchaseId}</td>
                      <td className="px-5 py-3 text-right text-xs text-gold">₹{Number(l.purchaseValue).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3 text-right text-xs text-emerald">{l.ratePct}%</td>
                      <td className="px-5 py-3 text-right text-xs font-semibold text-gold">₹{l.monthlyAmount.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3 text-right text-xs text-emerald/70">₹{l.totalPaid.toLocaleString("en-IN")} ({l.paidCount}×)</td>
                      <td className="px-5 py-3 text-right text-xs text-emerald/70">₹{l.capAmount.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-emerald/10">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-emerald/50">{pct}%</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${l.status === "completed" ? "bg-emerald/10 text-emerald" : "bg-gold/10 text-gold"}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-lg border border-gold/15 bg-background">
          <div className="border-b border-gold/10 px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Cashback History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-left text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h.id} className="border-b border-gold/5 last:border-0">
                    <td className="px-5 py-3 text-xs text-emerald/70">{new Date(h.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3 text-xs text-emerald">{h.description}</td>
                    <td className="px-5 py-3 text-right text-xs font-semibold text-gold">₹{h.amount.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gold/10 pt-6 text-xs uppercase tracking-widest text-emerald/40">
        <span>Prime Jewellery Pvt. Ltd.</span>
        <span>Purchase Cashback generates on a monthly basis.</span>
      </div>
    </div>
  );
}
