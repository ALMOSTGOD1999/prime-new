import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminIncome } from "../../functions/admin/income";

export const Route = createFileRoute("/admin/income")({
  component: AdminIncome,
});

function AdminIncome() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const fetchIncome = (type: string) => {
    setLoading(true);
    getAdminIncome({ data: type ? { type } : {} })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIncome("");
  }, []);

  const handleFilter = (type: string) => {
    setFilter(type);
    fetchIncome(type);
  };

  const summary = data?.summary || [];
  const totalDirect = summary.find((s: any) => s.type === "direct")?.total || 0;
  const totalMatching = summary.find((s: any) => s.type === "matching")?.total || 0;
  const totalAwards = summary.find((s: any) => s.type === "award")?.count || 0;

  const filters = [
    { key: "", label: "All", color: "emerald" },
    { key: "direct", label: "Direct", color: "emerald" },
    { key: "matching", label: "Matching", color: "gold" },
    { key: "award", label: "Awards", color: "gold" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl tracking-tight">
          <span className="italic text-gold">Income</span> Overview
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/60">All commission & award payouts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-xl border border-emerald/15 bg-gradient-to-br from-emerald/8 to-emerald/3 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/70">Direct Commission</p>
              <p className="mt-2 font-display text-3xl tracking-tight text-emerald">
                ₹{totalDirect.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[10px] text-emerald/60">5% one-time per referral</p>
            </div>
            <div className="rounded-lg bg-emerald/10 p-2.5 transition-transform duration-300 group-hover:scale-110">
              <svg className="h-5 w-5 text-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818.879.659 1.171-1.671.48-.642A3 3 0 0 1 15.96 12H18a3 3 0 0 1 3 3v.342M3 9.342A3 3 0 0 1 5.96 6H8.04c.734 0 1.413.468 1.658 1.165l.637 1.787M3 9.342V15a3 3 0 0 0 3 3h.64M12 6V3" /></svg>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald/20 to-transparent" />
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-gold/15 bg-gradient-to-br from-gold/8 to-gold/3 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/70">Matching Income</p>
              <p className="mt-2 font-display text-3xl tracking-tight text-gold">
                ₹{totalMatching.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[10px] text-emerald/60">20% per pair matched</p>
            </div>
            <div className="rounded-lg bg-gold/10 p-2.5 transition-transform duration-300 group-hover:scale-110">
              <svg className="h-5 w-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-gold/15 bg-gradient-to-br from-gold/5 to-cream p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/70">Awards Given</p>
              <p className="mt-2 font-display text-3xl tracking-tight text-emerald">
                {totalAwards}
              </p>
              <p className="mt-1 text-[10px] text-emerald/60">Milestone achievements</p>
            </div>
            <div className="rounded-lg bg-gold/10 p-2.5 transition-transform duration-300 group-hover:scale-110">
              <svg className="h-5 w-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.015 6.015 0 0 1-2.27.466 6.015 6.015 0 0 1-2.27-.466" /></svg>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilter(f.key)}
            className={`rounded-lg px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all duration-200 ${
              filter === f.key
                ? "bg-emerald text-cream shadow-sm shadow-emerald/20"
                : "border border-gold/15 text-emerald/70 hover:border-gold/30 hover:bg-gold/5 hover:text-emerald/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Income Table */}
      <div className="overflow-hidden rounded-xl border border-gold/10 bg-cream shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald/60">Loading income data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-[0.2em] text-emerald/60">
                  <th className="px-6 py-3 text-left font-semibold">ID</th>
                  <th className="px-6 py-3 text-left font-semibold">User</th>
                  <th className="px-6 py-3 text-left font-semibold">Type</th>
                  <th className="px-6 py-3 text-left font-semibold">Description</th>
                  <th className="px-6 py-3 text-right font-semibold">Amount</th>
                  <th className="px-6 py-3 text-right font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.income?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-gold/10 p-3">
                          <svg className="h-6 w-6 text-gold/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                        </div>
                        <p className="text-xs text-emerald/60">No income records found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data?.income?.map((item: any, i: number) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gold/5 transition-all duration-200 hover:bg-gold/5 ${i % 2 === 0 ? "bg-emerald/[0.02]" : ""}`}
                    >
                      <td className="px-6 py-3.5 font-mono text-xs text-emerald/60">#{item.id}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald/10 text-[10px] font-bold text-emerald">
                            {(item.userName || "U")?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold">{item.userName || `User #${item.userId}`}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${
                          item.type === "direct"
                            ? "bg-emerald/5 text-emerald ring-emerald/20"
                            : item.type === "matching"
                              ? "bg-gold/10 text-gold ring-gold/20"
                              : "bg-purple-50 text-purple-600 ring-purple-100"
                        }`}>
                          {item.type === "direct" && <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818.879.659 1.171-1.671.48-.642A3 3 0 0 1 15.96 12H18a3 3 0 0 1 3 3v.342M3 9.342A3 3 0 0 1 5.96 6H8.04" /></svg>}
                          {item.type === "matching" && <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>}
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-emerald/60">{item.description}</td>
                      <td className="px-6 py-3.5 text-right text-xs font-bold text-emerald">
                        {item.amount > 0 ? `₹${item.amount.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right text-[10px] text-emerald/60">
                        {new Date(item.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
