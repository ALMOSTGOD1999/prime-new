import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyLevelIncome } from "../../functions/user/level-income";

export const Route = createFileRoute("/dashboard/level-income")({
  component: LevelIncomePage,
});

function depthLabel(d: number): string {
  if (d === 1) return "1st";
  if (d === 2) return "2nd";
  if (d === 3) return "3rd";
  return `${d}th`;
}

function LevelIncomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyLevelIncome()
      .then(setData)
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded bg-emerald/10" />
        <div className="h-32 animate-pulse rounded border border-gold/20 bg-background" />
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-background" />
      </div>
    );
  }

  if (error) return <div className="rounded border border-gold/20 bg-background p-6 text-sm text-red-500">{error}</div>;
  if (!data) return null;

  const { directs, teamBusiness, openLevels, tiers, depthRows, thisMonthEarning, months, history } = data;

  const rateRows = [
    { levels: "1st", rate: "1%" },
    { levels: "2nd", rate: "0.50%" },
    { levels: "3rd", rate: "0.20%" },
    { levels: "4th – 7th", rate: "0.15%" },
    { levels: "8th – 11th", rate: "0.10%" },
    { levels: "12th – 19th", rate: "0.05%" },
    { levels: "20th – 24th", rate: "0.02%" },
  ];

  const openRows = depthRows.filter((r: any) => r.depth <= openLevels && r.business > 0);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-1 rounded-full bg-gold" />
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-gold sm:text-4xl">
            Level Income
          </h1>
          <p className="mt-2 text-sm italic text-emerald/60">— Up to {months} months</p>
        </div>
      </div>

      {/* My unlock status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald/20 bg-background p-5">
          <p className="text-[10px] uppercase tracking-widest text-emerald/60">My Direct Referrals</p>
          <p className="mt-1 font-display text-2xl text-emerald">{directs}</p>
        </div>
        <div className="rounded-lg border border-gold/20 bg-background p-5">
          <p className="text-[10px] uppercase tracking-widest text-gold/70">My Team Business</p>
          <p className="mt-1 font-display text-2xl text-gold">₹{(teamBusiness ?? 0).toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-5">
          <p className="text-[10px] uppercase tracking-widest text-gold">Levels Open</p>
          <p className="mt-1 font-display text-2xl text-gold">{openLevels} / 24</p>
          <p className="mt-1 text-[11px] text-emerald/60">This month's earning: ₹{(thisMonthEarning ?? 0).toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Rate table + unlock conditions */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Rate table */}
        <div className="overflow-hidden rounded-lg border border-gold/15 bg-background">
          <div className="border-b border-gold/10 bg-gold/10 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Level · Income</h3>
          </div>
          <table className="w-full">
            <tbody>
              {rateRows.map((r) => (
                <tr key={r.levels} className="border-b border-gold/5 last:border-0">
                  <td className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-emerald">{r.levels}</td>
                  <td className="px-5 py-2.5 text-right text-xs font-bold text-gold">{r.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gold/10 px-5 py-3 text-[11px] text-emerald/60">
            % of last-month business at each level · Up to {months} months per member
          </div>
        </div>

        {/* Unlock conditions */}
        <div className="overflow-hidden rounded-lg border border-gold/15 bg-background">
          <div className="border-b border-gold/10 bg-gold/10 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Level Unlocks</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 text-left text-[10px] uppercase tracking-widest text-emerald/70">
                <th className="px-4 py-2.5">Condition</th>
                <th className="px-4 py-2.5 text-right">Open Levels</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t: any, i: number) => (
                <tr key={i} className={`border-b border-gold/5 last:border-0 ${t.met ? "bg-emerald/5" : ""}`}>
                  <td className="px-4 py-2.5 text-xs text-emerald">
                    {t.directs} Direct{t.teamBusiness > 0 ? ` + ₹${t.teamBusiness.toLocaleString("en-IN")} Team Business` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold text-gold">1–{t.openLevels}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${t.met ? "bg-emerald/10 text-emerald" : "bg-gold/10 text-gold/70"}`}>
                      {t.met ? "Open" : "Locked"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* This month's level breakdown */}
      <div className="rounded-lg border border-gold/15 bg-background">
        <div className="border-b border-gold/10 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">This Month's Level Business</h3>
          <p className="mt-0.5 text-[11px] text-emerald/60">
            Last-30-day approved purchase volume at each open level — credited monthly (70/20/10 split)
          </p>
        </div>
        {openRows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-emerald/60">
            No purchase volume at your open levels in the last month yet. {openLevels === 0 && "Unlock your first 2 levels with 1 direct referral."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-left text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-5 py-3">Level</th>
                  <th className="px-5 py-3 text-right">Rate</th>
                  <th className="px-5 py-3 text-right">Last-Month Business</th>
                  <th className="px-5 py-3 text-right">Income</th>
                </tr>
              </thead>
              <tbody>
                {openRows.map((r: any) => (
                  <tr key={r.depth} className="border-b border-gold/5 last:border-0">
                    <td className="px-5 py-3 text-xs font-semibold uppercase text-emerald">{depthLabel(r.depth)}</td>
                    <td className="px-5 py-3 text-right text-xs text-gold">{r.rate}%</td>
                    <td className="px-5 py-3 text-right text-xs text-emerald/70">₹{r.business.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-right text-xs font-semibold text-gold">₹{r.earning.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                <tr className="border-t border-gold/20 bg-gold/5">
                  <td className="px-5 py-3 text-xs font-bold uppercase text-gold" colSpan={3}>Total</td>
                  <td className="px-5 py-3 text-right text-xs font-bold text-gold">₹{thisMonthEarning.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-lg border border-gold/15 bg-background">
          <div className="border-b border-gold/10 px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Level Income History</h3>
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
        <span>Level Income Plan · Up to {months} months</span>
      </div>
    </div>
  );
}
