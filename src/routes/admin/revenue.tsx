import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getRevenueData } from "../../functions/admin/bulk";

export const Route = createFileRoute("/admin/revenue")({
  component: AdminRevenuePage,
});

function AdminRevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRevenueData()
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

  const activeRatio = data?.totalUsers > 0 ? ((data.activeUsers / data.totalUsers) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        Revenue <span className="italic text-gold">Dashboard</span>
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Total Revenue</p>
          <p className="mt-2 font-display text-3xl text-gold">₹{(data?.totalRevenue || 0).toLocaleString("en-IN")}</p>
          <p className="text-[10px] text-emerald/60">from activations</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Active Users</p>
          <p className="mt-2 font-display text-3xl text-emerald">{data?.activeUsers || 0} / {data?.totalUsers || 0}</p>
          <p className="text-[10px] text-emerald/60">{activeRatio}% activation rate</p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Activation Rate</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-3xl text-gold">{activeRatio}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-emerald/10">
            <div className="h-2 rounded-full bg-gold" style={{ width: `${activeRatio}%` }} />
          </div>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/70">Avg Revenue/User</p>
          <p className="mt-2 font-display text-3xl text-emerald">
            ₹{data?.activeUsers > 0 ? Math.round((data?.totalRevenue || 0) / data.activeUsers).toLocaleString("en-IN") : "0"}
          </p>
        </div>
      </div>

      {/* Daily Activations Chart */}
      {data?.dailyActivations && data.dailyActivations.length > 0 && (
        <div className="rounded border border-gold/20 bg-cream p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Daily Activations (Last 30 Days)</h3>
          <div className="flex items-end gap-1" style={{ height: "150px" }}>
            {data.dailyActivations.slice(0, 30).reverse().map((day: any, i: number) => {
              const maxCount = Math.max(...data.dailyActivations.map((d: any) => d.count), 1);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[7px] text-emerald/60">{day.count}</span>
                  <div className="w-full max-w-[30px] bg-gold" style={{ height: `${(day.count / maxCount) * 120}px` }} />
                  <span className="text-[6px] text-emerald/50">
                    {new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Income Chart */}
      {data?.dailyIncome && data.dailyIncome.length > 0 && (
        <div className="rounded border border-gold/20 bg-cream p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Daily Income Paid (Last 30 Days)</h3>
          <div className="flex items-end gap-1" style={{ height: "150px" }}>
            {data.dailyIncome.slice(0, 30).reverse().map((day: any, i: number) => {
              const maxTotal = Math.max(...data.dailyIncome.map((d: any) => d.total || 0), 1);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[7px] text-emerald/60">₹{day.total}</span>
                  <div className="w-full max-w-[30px] bg-emerald" style={{ height: `${((day.total || 0) / maxTotal) * 120}px` }} />
                  <span className="text-[6px] text-emerald/50">
                    {new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
