import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/calculator")({
  component: CalculatorPage,
});

function CalculatorPage() {
  const [referrals, setReferrals] = useState(5);
  const [teamGrowth, setTeamGrowth] = useState(2);
  const [months, setMonths] = useState(6);

  // Calculate projections
  const directCommission = 150; // 5% of 2999
  const matchingPerPair = 599; // 20% of 2999

  // Simple projection model
  let totalTeam = 0;
  let totalDirect = 0;
  let totalMatching = 0;
  let monthlyData: { month: string; team: number; direct: number; matching: number; total: number }[] = [];

  let currentLevel = [1]; // Start with 1 (the user)
  for (let m = 1; m <= months; m++) {
    let newLevel: number[] = [];
    let monthDirect = 0;
    let monthPairs = 0;

    for (const member of currentLevel) {
      const newMembers = Math.min(referrals, referrals); // Each member refers 'referrals' people
      for (let i = 0; i < newMembers; i++) {
        newLevel.push(1);
        monthDirect += directCommission;
      }
    }

    // Matching pairs: each new member can form pairs
    const leftLeg = Math.floor(newLevel.length / 2);
    const rightLeg = newLevel.length - leftLeg;
    monthPairs = Math.min(leftLeg, rightLeg);

    totalDirect += monthDirect;
    totalMatching += monthPairs * matchingPerPair;
    totalTeam += newLevel.length;

    monthlyData.push({
      month: `Month ${m}`,
      team: totalTeam,
      direct: totalDirect,
      matching: totalMatching,
      total: totalDirect + totalMatching,
    });

    currentLevel = newLevel;
  }

  const maxTotal = Math.max(...monthlyData.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        Earnings <span className="italic text-gold">Calculator</span>
      </h1>
      <p className="text-xs text-emerald/70">
        Project your potential earnings based on team growth assumptions.
      </p>

      {/* Input Controls */}
      <div className="rounded border border-gold/20 bg-cream p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-[10px] uppercase tracking-widest text-emerald/70">
              Referrals per person
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={referrals}
              onChange={(e) => setReferrals(parseInt(e.target.value))}
              className="w-full accent-gold"
            />
            <p className="mt-1 text-center font-display text-2xl text-gold">{referrals}</p>
          </div>
          <div>
            <label className="mb-2 block text-[10px] uppercase tracking-widest text-emerald/70">
              Projection period (months)
            </label>
            <input
              type="range"
              min="1"
              max="24"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="w-full accent-gold"
            />
            <p className="mt-1 text-center font-display text-2xl text-gold">{months}</p>
          </div>
          <div>
            <label className="mb-2 block text-[10px] uppercase tracking-widest text-emerald/70">
              Daily pair cap
            </label>
            <p className="mt-1 text-center font-display text-2xl text-emerald">3 pairs/day</p>
            <p className="text-[10px] text-center text-emerald/60">Increases with rank</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded border border-emerald/20 bg-emerald/5 p-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Total Team Size</p>
          <p className="mt-2 font-display text-3xl text-emerald">{totalTeam.toLocaleString()}</p>
          <p className="text-[10px] text-emerald/60">projected members</p>
        </div>
        <div className="rounded border border-gold/20 bg-gold/5 p-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Direct Commission</p>
          <p className="mt-2 font-display text-3xl text-gold">₹{totalDirect.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-emerald/60">5% per referral (₹{directCommission})</p>
        </div>
        <div className="rounded border border-gold/20 bg-gold/5 p-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Matching Income</p>
          <p className="mt-2 font-display text-3xl text-gold">₹{totalMatching.toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-emerald/60">20% per pair (₹{matchingPerPair})</p>
        </div>
      </div>

      {/* Total */}
      <div className="rounded border-2 border-gold/40 bg-gold/5 p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-emerald/70">Projected Total Earnings</p>
        <p className="mt-2 font-display text-4xl text-gold">₹{(totalDirect + totalMatching).toLocaleString("en-IN")}</p>
        <p className="mt-1 text-[10px] text-emerald/60">over {months} months</p>
      </div>

      {/* Chart */}
      {monthlyData.length > 0 && (
        <div className="rounded border border-gold/20 bg-cream p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Cumulative Earnings</h3>
          <div className="flex items-end gap-2" style={{ height: "200px" }}>
            {monthlyData.map((d, i) => {
              const height = (d.total / maxTotal) * 180;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[8px] text-emerald/70">₹{(d.total / 1000).toFixed(0)}K</span>
                  <div className="w-full max-w-[40px] rounded-t bg-gold" style={{ height: `${height}px` }} />
                  <span className="text-[8px] text-emerald/60">M{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded border border-gold/10 bg-cream/50 p-4">
        <p className="text-[10px] text-emerald/60">
          ⚠️ This is a projection tool only. Actual earnings depend on team activity, pair matching, and daily caps.
          Income is not guaranteed. Binary MLM involves building a network and matching active members on both legs.
        </p>
      </div>
    </div>
  );
}
