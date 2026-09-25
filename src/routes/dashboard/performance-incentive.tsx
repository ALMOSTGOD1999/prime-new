import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyPerformanceIncentive } from "../../functions/user/incentive";

export const Route = createFileRoute("/dashboard/performance-incentive")({
  component: PerformanceIncentivePage,
});

function fmtBiz(n: number): string {
  if (n >= 10000000) {
    const v = n / 10000000;
    return `₹${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, "")}Cr.`;
  }
  if (n >= 100000) {
    const v = n / 100000;
    return `₹${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, "")}L.`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending_growth: "bg-gold/10 text-gold",
    eligible: "bg-emerald/10 text-emerald",
    paid: "bg-emerald/10 text-emerald",
    expired: "bg-red-500/10 text-red-500",
  };
  const labels: Record<string, string> = {
    pending_growth: "Awaiting 30% growth",
    eligible: "Eligible — awaiting payout",
    paid: "Paid",
    expired: "Expired",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[status] ?? "bg-emerald/10 text-emerald/70"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function PerformanceIncentivePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyPerformanceIncentive()
      .then(setData)
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded bg-emerald/10" />
        <div className="h-24 animate-pulse rounded border border-gold/20 bg-background" />
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-background" />
      </div>
    );
  }

  if (error) return <div className="rounded border border-gold/20 bg-background p-6 text-sm text-red-500">{error}</div>;
  if (!data) return null;

  const { business, ranks, milestones, growthPct, growthMonths } = data;
  const leftRanks = ranks.slice(0, 6);
  const rightRanks = ranks.slice(6);
  const nextRank = ranks.find((r: any) => !r.reached);

  const RankTable = ({ rows }: { rows: any[] }) => (
    <div className="overflow-hidden rounded-lg border border-gold/15 bg-background">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gold/15 bg-gold/10 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gold">
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3 text-right">Business</th>
            <th className="px-4 py-3 text-right">Bonus</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.name}
              className={`border-b border-gold/5 last:border-0 ${r.reached ? "bg-gold/5" : ""}`}
            >
              <td className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-emerald">
                {r.name}
                {r.reached && <span className="ml-2 text-gold">✓</span>}
              </td>
              <td className="px-4 py-2.5 text-right text-xs font-semibold text-gold">{fmtBiz(r.target)}</td>
              <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald">Rs {r.bonus.toLocaleString("en-IN")}/-</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-1 rounded-full bg-gold" />
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-gold sm:text-4xl">
            Performance Incentive
          </h1>
          <p className="mt-2 text-sm italic text-emerald/60">60:40 ratio accumulation basis — up to 6 months</p>
          <p className="mt-1 text-xs italic text-emerald/50">
            {growthPct}% Increase must be in next {growthMonths} month, to receive payment
          </p>
        </div>
      </div>

      {/* My business */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald/20 bg-background p-5">
          <p className="text-[10px] uppercase tracking-widest text-emerald/60">Left Business</p>
          <p className="mt-1 font-display text-2xl text-emerald">₹{(business.left ?? 0).toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-lg border border-gold/20 bg-background p-5">
          <p className="text-[10px] uppercase tracking-widest text-gold/70">Right Business</p>
          <p className="mt-1 font-display text-2xl text-gold">₹{(business.right ?? 0).toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-5">
          <p className="text-[10px] uppercase tracking-widest text-gold">Total Accumulated Business</p>
          <p className="mt-1 font-display text-2xl text-gold">₹{(business.total ?? 0).toLocaleString("en-IN")}</p>
          {nextRank && (
            <p className="mt-1 text-[11px] text-emerald/60">
              Next: {nextRank.name} at {fmtBiz(nextRank.target)} ({nextRank.progress}%)
            </p>
          )}
        </div>
      </div>

      {/* Rank tables — split like the plan chart */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RankTable rows={leftRanks} />
        <RankTable rows={rightRanks} />
      </div>

      {/* Milestones */}
      <div className="rounded-lg border border-gold/15 bg-background">
        <div className="border-b border-gold/10 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">My Incentive Milestones</h3>
          <p className="mt-0.5 text-[11px] text-emerald/60">
            A milestone starts when your business first hits the rank target. Bonus pays once your business grows {growthPct}%+ above that level within {growthMonths} months.
          </p>
        </div>
        {milestones.length === 0 ? (
          <p className="px-5 py-6 text-sm text-emerald/60">
            No rank targets reached yet. Keep accumulating team business — your first milestone unlocks at {fmtBiz(ranks[0].target)} (STARTER).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-left text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-5 py-3">Rank</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Business at Reach</th>
                  <th className="px-5 py-3">Reached On</th>
                  <th className="px-5 py-3">Growth Deadline</th>
                  <th className="px-5 py-3 text-right">Bonus</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m: any) => (
                  <tr key={m.id} className="border-b border-gold/5 last:border-0">
                    <td className="px-5 py-3 text-xs font-semibold uppercase text-emerald">{m.rankName}</td>
                    <td className="px-5 py-3 text-xs text-gold">{fmtBiz(m.targetBusiness)}</td>
                    <td className="px-5 py-3 text-xs text-emerald">₹{Number(m.businessAtReach).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-xs text-emerald/70">{new Date(m.reachedAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3 text-xs text-emerald/70">{new Date(m.growthDeadline).toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3 text-right text-xs font-semibold text-gold">₹{m.bonusAmount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
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
        <span>Performance Incentive Plan</span>
      </div>
    </div>
  );
}
