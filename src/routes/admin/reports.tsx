import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminReports } from "../../functions/admin/reports";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminReports()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded border border-gold/20 bg-cream" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        Platform <span className="italic text-gold">Reports</span>
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Total Users</p>
          <p className="mt-2 font-display text-3xl text-emerald">{data?.totalUsers || 0}</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Active Users</p>
          <p className="mt-2 font-display text-3xl text-gold">{data?.activeUsers || 0}</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Total Income Paid</p>
          <p className="mt-2 font-display text-3xl text-emerald">₹{(data?.totalIncomePaid || 0).toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Total Withdrawals</p>
          <p className="mt-2 font-display text-3xl text-gold">₹{(data?.totalWithdrawals || 0).toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Daily Signups Chart */}
      {data?.dailySignups && data.dailySignups.length > 0 && (
        <div className="rounded border border-gold/20 bg-cream p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Daily Signups (Last 30 Days)</h3>
          <div className="flex items-end gap-1" style={{ height: "150px" }}>
            {data.dailySignups.slice(0, 30).reverse().map((day: any, i: number) => {
              const maxCount = Math.max(...data.dailySignups.map((d: any) => d.count), 1);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[8px] text-emerald/70">{day.count}</span>
                  <div
                    className="w-full max-w-[30px] bg-emerald"
                    style={{ height: `${(day.count / maxCount) * 120}px` }}
                  />
                  <span className="text-[7px] text-emerald/60">
                    {new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Earners */}
      {data?.topEarners && data.topEarners.length > 0 && (
        <div className="rounded border border-gold/20 bg-cream">
          <div className="border-b border-gold/10 px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Top 10 Earners</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Code</th>
                  <th className="px-6 py-3 text-left">Rank</th>
                  <th className="px-6 py-3 text-right">Pairs</th>
                  <th className="px-6 py-3 text-right">Earned</th>
                </tr>
              </thead>
              <tbody>
                {data.topEarners.map((e: any, i: number) => (
                  <tr key={e.id} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                    <td className="px-6 py-3 text-xs font-bold text-gold">#{i + 1}</td>
                    <td className="px-6 py-3 text-xs font-semibold">{e.name}</td>
                    <td className="px-6 py-3 text-[10px] text-emerald/70">{e.referralCode}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        e.rank === "platinum" ? "bg-purple-100 text-purple-700" :
                        e.rank === "gold" ? "bg-yellow-100 text-yellow-700" :
                        e.rank === "silver" ? "bg-gray-100 text-gray-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {e.rank}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-xs font-semibold text-gold">{e.totalPairs}</td>
                    <td className="px-6 py-3 text-right text-xs text-emerald">₹{(e.totalEarned || 0).toLocaleString("en-IN")}</td>
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
