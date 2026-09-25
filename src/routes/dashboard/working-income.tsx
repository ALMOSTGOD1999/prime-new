import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyWorkingIncome } from "../../functions/user/working-income";

export const Route = createFileRoute("/dashboard/working-income")({
  component: WorkingIncomePage,
});

const TYPE_LABELS: Record<string, string> = {
  cashback: "Cashback",
  level: "Level Income",
  performance_incentive: "Performance Incentive",
};

function WorkingIncomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyWorkingIncome()
      .then(setData)
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded bg-emerald/10" />
        <div className="h-32 animate-pulse rounded border border-gold/20 bg-background" />
        <div className="h-32 animate-pulse rounded border border-gold/20 bg-background" />
        <div className="h-48 animate-pulse rounded border border-gold/20 bg-background" />
      </div>
    );
  }

  if (error) return <div className="rounded border border-gold/20 bg-background p-6 text-sm text-red-500">{error}</div>;
  if (!data) return null;

  const { total, breakdown, workingWithdraw, repurchase, adminCharge, rows } = data;
  const breakdownEntries = Object.entries(breakdown as Record<string, number>);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-1 rounded-full bg-gold" />
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-gold sm:text-4xl">
            Working Income
          </h1>
          <p className="mt-2 text-sm italic text-emerald/60">
            Cashback + Level Income + Performance Incentive — split 70 / 20 / 10 on every credit
          </p>
        </div>
      </div>

      {/* Section 1: Working Income */}
      <div className="rounded-lg border border-gold/15 bg-background">
        <div className="border-b border-gold/10 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Section 1 — Working Income (Gross)</h3>
          <p className="mt-0.5 text-[11px] text-emerald/60">Total of all working income earned to date</p>
        </div>
        <div className="p-5">
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-6 text-center">
            <p className="text-[10px] uppercase tracking-widest text-gold">Total Working Income</p>
            <p className="mt-2 font-display text-4xl font-bold text-gold">₹{total.toLocaleString("en-IN")}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {breakdownEntries.length === 0 ? (
              <p className="text-xs text-emerald/60 sm:col-span-3">
                No working income yet. Cashback, Level Income and Performance Incentive credits appear here once the admin runs the monthly payouts.
              </p>
            ) : (
              breakdownEntries.map(([type, amt]) => (
                <div key={type} className="rounded-lg border border-emerald/20 bg-card p-4">
                  <p className="text-[10px] uppercase tracking-widest text-emerald/60">{TYPE_LABELS[type] ?? type}</p>
                  <p className="mt-1 font-display text-xl text-emerald">₹{amt.toLocaleString("en-IN")}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Section 2 + 3: wallets */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Working Withdraw Wallet */}
        <div className="rounded-lg border border-gold/15 bg-background">
          <div className="border-b border-gold/10 px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Section 2 — Working Withdraw Wallet</h3>
            <p className="mt-0.5 text-[11px] text-emerald/60">70% of working income — withdrawable</p>
          </div>
          <div className="p-5 text-center">
            <p className="font-display text-3xl font-bold text-emerald">₹{workingWithdraw.toLocaleString("en-IN")}</p>
            <p className="mt-2 text-[11px] text-emerald/60">
              70% of ₹{total.toLocaleString("en-IN")} gross working income
            </p>
          </div>
        </div>

        {/* Re-Purchase Wallet */}
        <div className="rounded-lg border border-gold/15 bg-background">
          <div className="border-b border-gold/10 px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Section 3 — Re-Purchase Wallet</h3>
            <p className="mt-0.5 text-[11px] text-emerald/60">20% of working income — spendable on products</p>
          </div>
          <div className="p-5 text-center">
            <p className="font-display text-3xl font-bold text-gold">₹{repurchase.toLocaleString("en-IN")}</p>
            <p className="mt-2 text-[11px] text-emerald/60">
              20% of ₹{total.toLocaleString("en-IN")} gross working income
            </p>
          </div>
        </div>
      </div>

      {/* Split explanation */}
      <div className="rounded-lg border border-emerald/20 bg-emerald/5 p-4">
        <p className="text-[11px] text-emerald/80">
          Every working income credit is split automatically: <span className="font-semibold">70%</span> to Working Withdraw
          Wallet, <span className="font-semibold">20%</span> to Re-Purchase Wallet, and <span className="font-semibold">10%</span> admin charge
          (₹{adminCharge.toLocaleString("en-IN")}) is wiped by the system.
        </p>
      </div>

      {/* Recent working income rows */}
      <div className="rounded-lg border border-gold/15 bg-background">
        <div className="border-b border-gold/10 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Recent Working Income</h3>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-emerald/60">No working income entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-left text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-right">Gross</th>
                  <th className="px-5 py-3 text-right">70% Withdraw</th>
                  <th className="px-5 py-3 text-right">20% Repurchase</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-b border-gold/5 last:border-0">
                    <td className="px-5 py-3 text-xs text-emerald/70">{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3 text-xs font-semibold uppercase text-emerald">{TYPE_LABELS[r.type] ?? r.type}</td>
                    <td className="px-5 py-3 text-xs text-emerald">{r.description}</td>
                    <td className="px-5 py-3 text-right text-xs font-semibold text-gold">₹{r.amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-right text-xs text-emerald/70">₹{Math.round((r.amount * 70) / 100).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-right text-xs text-emerald/70">₹{Math.round((r.amount * 20) / 100).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gold/10 pt-6 text-xs uppercase tracking-widest text-emerald/40">
        <span>Prime Jewellery Pvt. Ltd.</span>
        <span>Working Income · 70 / 20 / 10</span>
      </div>
    </div>
  );
}
