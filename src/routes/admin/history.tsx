import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminUsers } from "../../functions/admin/users";
import { getAdminIncome } from "../../functions/admin/income";

export const Route = createFileRoute("/admin/history")({
  component: AdminHistory,
});

function AdminHistory() {
  const [usersData, setUsersData] = useState<any>(null);
  const [incomeData, setIncomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "income">("users");

  useEffect(() => {
    Promise.all([
      getAdminUsers({ data: {} }),
      getAdminIncome({ data: {} }),
    ])
      .then(([u, i]) => { setUsersData(u); setIncomeData(i); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-display text-4xl tracking-tight">
          <span className="italic text-gold">Activity</span> History
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/40">
          Platform activity and event log
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "users" as const, label: "User Registrations", icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg> },
          { key: "income" as const, label: "Income Events", icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818.879.659 1.171-1.671.48-.642A3 3 0 0 1 15.96 12H18a3 3 0 0 1 3 3v.342M3 9.342A3 3 0 0 1 5.96 6H8.04c.734 0 1.413.468 1.658 1.165l.637 1.787M3 9.342V15a3 3 0 0 0 3 3h.64M12 6V3" /></svg> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all duration-200 ${
              tab === t.key
                ? "bg-emerald text-cream shadow-sm shadow-emerald/20"
                : "border border-gold/15 text-emerald/50 hover:border-gold/30 hover:bg-gold/5"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald/40">Loading history...</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gold/10 bg-cream shadow-sm">
          {tab === "users" ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/10 text-[10px] uppercase tracking-[0.2em] text-emerald/40">
                    <th className="px-6 py-3 text-left font-semibold">ID</th>
                    <th className="px-6 py-3 text-left font-semibold">Name</th>
                    <th className="px-6 py-3 text-left font-semibold">Email</th>
                    <th className="px-6 py-3 text-left font-semibold">Code</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-right font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData?.users?.map((user: any, i: number) => (
                    <tr
                      key={user.id}
                      className={`border-b border-gold/5 transition-all duration-200 hover:bg-gold/5 ${i % 2 === 0 ? "bg-emerald/[0.02]" : ""}`}
                    >
                      <td className="px-6 py-3.5 font-mono text-xs text-emerald/40">#{user.id}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald/10 text-[10px] font-bold text-emerald">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-emerald/60">{user.email}</td>
                      <td className="px-6 py-3.5">
                        <code className="rounded-md bg-emerald/5 px-2 py-0.5 text-[10px] font-semibold text-emerald/70">{user.referralCode}</code>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${
                          user.isActive ? "bg-emerald/5 text-emerald ring-emerald/20" : "bg-red-50 text-red-600 ring-red-100"
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${user.isActive ? "bg-emerald" : "bg-red-400"}`} />
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-[10px] text-emerald/40">
                        {new Date(user.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/10 text-[10px] uppercase tracking-[0.2em] text-emerald/40">
                    <th className="px-6 py-3 text-left font-semibold">ID</th>
                    <th className="px-6 py-3 text-left font-semibold">User</th>
                    <th className="px-6 py-3 text-left font-semibold">Type</th>
                    <th className="px-6 py-3 text-left font-semibold">Description</th>
                    <th className="px-6 py-3 text-right font-semibold">Amount</th>
                    <th className="px-6 py-3 text-right font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeData?.income?.map((item: any, i: number) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gold/5 transition-all duration-200 hover:bg-gold/5 ${i % 2 === 0 ? "bg-emerald/[0.02]" : ""}`}
                    >
                      <td className="px-6 py-3.5 font-mono text-xs text-emerald/40">#{item.id}</td>
                      <td className="px-6 py-3.5 text-xs font-semibold">{item.userName || `User #${item.userId}`}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${
                          item.type === "direct" ? "bg-emerald/5 text-emerald ring-emerald/20" :
                          item.type === "matching" ? "bg-gold/10 text-gold ring-gold/20" :
                          "bg-purple-50 text-purple-600 ring-purple-100"
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-emerald/60">{item.description}</td>
                      <td className="px-6 py-3.5 text-right text-xs font-bold text-emerald">
                        {item.amount > 0 ? `₹${item.amount.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right text-[10px] text-emerald/40">
                        {new Date(item.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
