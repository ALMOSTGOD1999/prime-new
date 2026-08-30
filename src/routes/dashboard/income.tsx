import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboard } from "@/functions/user/dashboard";

export const Route = createFileRoute("/dashboard/income")({
  component: IncomePage,
});

function IncomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded border border-gold/20 bg-cream" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { income } = data;
  const allIncome = income.recentIncome || [];
  const filtered = filter === "all" ? allIncome : allIncome.filter((i: any) => i.type === filter);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        <span className="italic text-gold">Income</span> Statement
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded border border-emerald/20 bg-emerald/5 p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/50">Direct Commission</p>
          <p className="mt-2 font-display text-2xl text-emerald">
            ₹{income.direct.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[10px] text-emerald/40">5% per referral</p>
        </div>
        <div className="rounded border border-gold/20 bg-gold/5 p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/50">Matching Income</p>
          <p className="mt-2 font-display text-2xl text-gold">
            ₹{income.matching.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[10px] text-emerald/40">20% per pair</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/50">Total Earned</p>
          <p className="mt-2 font-display text-2xl text-emerald">
            ₹{income.totalEarned.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[10px] text-emerald/40">Lifetime</p>
        </div>
      </div>

      <div className="rounded border border-gold/20 bg-cream p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Today's Pairs</p>
            <p className="mt-1 font-display text-xl">
              {income.todayPairs} <span className="text-sm text-emerald/40">/ 3 cap</span>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Total Pairs</p>
            <p className="mt-1 font-display text-xl">{income.totalPairs}</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald/10">
          <div
            className="h-full bg-gold transition-all"
            style={{ width: `${Math.min((income.todayPairs / 3) * 100, 100)}%` }}
          />
        </div>
      </div>

      {income.awards && income.awards.length > 0 && (
        <div className="rounded border border-gold/20 bg-cream p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">
            Matching Awards
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {income.awards.map((award: any) => (
              <div key={award.id} className="flex items-center gap-3 rounded border border-gold/10 p-3">
                <span className="text-lg text-gold">&#127942;</span>
                <div>
                  <p className="text-xs font-semibold">{award.awardName}</p>
                  <p className="text-[10px] text-emerald/40">
                    At {award.totalPairs} pairs — {new Date(award.awardedAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {["all", "direct", "matching", "award"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
              filter === f
                ? "bg-emerald text-cream"
                : "border border-gold/20 text-emerald/50 hover:border-gold/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded border border-gold/20 bg-cream">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/50">
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-xs text-emerald/40">
                    No income records found.
                  </td>
                </tr>
              ) : (
                filtered.map((item: any) => (
                  <tr key={item.id} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          item.type === "direct"
                            ? "bg-emerald/10 text-emerald"
                            : item.type === "matching"
                              ? "bg-gold/10 text-gold"
                              : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-emerald/70">{item.description}</td>
                    <td className="px-6 py-3 text-right text-xs font-semibold text-emerald">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-3 text-right text-[10px] text-emerald/50">
                      {new Date(item.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
