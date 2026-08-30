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
    getAdminIncome({ data: { type: type || undefined } })
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

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        <span className="italic text-gold">Income</span> Overview
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded border border-emerald/20 bg-emerald/5 p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/50">Total Direct Paid</p>
          <p className="mt-2 font-display text-2xl text-emerald">
            ₹{totalDirect.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded border border-gold/20 bg-gold/5 p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/50">Total Matching Paid</p>
          <p className="mt-2 font-display text-2xl text-gold">
            ₹{totalMatching.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded border border-gold/20 bg-cream p-6">
          <p className="text-[10px] uppercase tracking-widest text-emerald/50">Awards Given</p>
          <p className="mt-2 font-display text-2xl text-emerald">{totalAwards}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["", "direct", "matching", "award"].map((f) => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            className={`rounded px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
              filter === f
                ? "bg-emerald text-cream"
                : "border border-gold/20 text-emerald/50 hover:border-gold/40"
            }`}
          >
            {f || "All"}
          </button>
        ))}
      </div>

      <div className="rounded border border-gold/20 bg-cream">
        {loading ? (
          <div className="px-6 py-12 text-center text-xs text-emerald/40">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/50">
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-6 py-3 text-left">User</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Description</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.income?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-xs text-emerald/40">
                      No income records found.
                    </td>
                  </tr>
                ) : (
                  data?.income?.map((item: any) => (
                    <tr key={item.id} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                      <td className="px-6 py-3 text-xs text-emerald/50">#{item.id}</td>
                      <td className="px-6 py-3 text-xs font-semibold">{item.userName || `User #${item.userId}`}</td>
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
        )}
      </div>
    </div>
  );
}
