import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getWeeklyReport, getMonthlyReport } from "../../functions/user/reports";

export const Route = createFileRoute("/dashboard/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = period === "weekly" ? await getWeeklyReport() : await getMonthlyReport();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const maxTotal = data?.days ? Math.max(...data.days.map((d: any) => d.total), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">
          Performance <span className="italic text-gold">Reports</span>
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod("weekly")}
            className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all ${
              period === "weekly" ? "bg-emerald text-cream" : "border border-emerald/40 text-emerald hover:bg-emerald/10"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all ${
              period === "monthly" ? "bg-emerald text-cream" : "border border-emerald/40 text-emerald hover:bg-emerald/10"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {data?.totals && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded border border-gold/20 bg-cream p-6">
            <p className="text-[10px] uppercase tracking-widest text-emerald/70">Direct Commission</p>
            <p className="mt-2 font-display text-2xl text-emerald">₹{data.totals.direct.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded border border-gold/20 bg-cream p-6">
            <p className="text-[10px] uppercase tracking-widest text-emerald/70">Matching Income</p>
            <p className="mt-2 font-display text-2xl text-gold">₹{data.totals.matching.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded border border-gold/20 bg-cream p-6">
            <p className="text-[10px] uppercase tracking-widest text-emerald/70">Total Earned</p>
            <p className="mt-2 font-display text-2xl text-emerald">₹{data.totals.total.toLocaleString("en-IN")}</p>
          </div>
        </div>
      )}

      {/* Bar Chart */}
      {loading ? (
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-cream" />
      ) : data?.days ? (
        <div className="rounded border border-gold/20 bg-cream p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Daily Income</h3>
          <div className="flex items-end gap-1" style={{ height: "200px" }}>
            {data.days.map((day: any, i: number) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-col items-center" style={{ height: "180px", justifyContent: "flex-end" }}>
                  {day.total > 0 && (
                    <span className="text-[8px] text-emerald/70">₹{day.total}</span>
                  )}
                  <div className="w-full max-w-[40px]">
                    {day.matching > 0 && (
                      <div
                        className="w-full bg-gold"
                        style={{ height: `${(day.matching / maxTotal) * 140}px` }}
                      />
                    )}
                    {day.direct > 0 && (
                      <div
                        className="w-full bg-emerald"
                        style={{ height: `${(day.direct / maxTotal) * 140}px` }}
                      />
                    )}
                  </div>
                </div>
                <span className="text-[8px] text-emerald/60">
                  {new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-emerald" />
              <span className="text-[10px] text-emerald/70">Direct</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-gold" />
              <span className="text-[10px] text-emerald/70">Matching</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded border border-gold/20 bg-cream p-12 text-center">
          <p className="text-xs text-emerald/60">No income data for this period</p>
        </div>
      )}

      {/* Daily Breakdown Table */}
      {data?.days && data.days.length > 0 && (
        <div className="rounded border border-gold/20 bg-cream">
          <div className="border-b border-gold/10 px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Detailed Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-right">Direct</th>
                  <th className="px-6 py-3 text-right">Matching</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.days.map((day: any, i: number) => (
                  <tr key={i} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                    <td className="px-6 py-3 text-xs">{new Date(day.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-xs text-emerald">₹{day.direct.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-xs text-gold">₹{day.matching.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-xs font-semibold">₹{day.total.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
