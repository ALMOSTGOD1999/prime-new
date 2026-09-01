import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminUsers } from "../../functions/admin/users";
import { getAdminIncome } from "../../functions/admin/income";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [usersData, setUsersData] = useState<any>(null);
  const [incomeData, setIncomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminUsers({ data: {} }),
      getAdminIncome({ data: {} }),
    ])
      .then(([u, i]) => { setUsersData(u); setIncomeData(i); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-gradient-to-r from-gold/10 to-gold/5" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-gold/10 bg-cream shadow-sm" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-gold/10 bg-cream shadow-sm" />
      </div>
    );
  }

  if (!usersData || !incomeData) return null;

  const totalUsers = usersData.total || 0;
  const activeUsers = usersData.users?.filter((u: any) => u.isActive).length || 0;
  const summary = incomeData.summary || [];
  const totalDirect = summary.find((s: any) => s.type === "direct")?.total || 0;
  const totalMatching = summary.find((s: any) => s.type === "matching")?.total || 0;

  const stats = [
    { title: "Total Users", value: String(totalUsers), gradient: "from-emerald/10 to-emerald/5", border: "border-emerald/15", iconBg: "bg-emerald/10 text-emerald", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg> },
    { title: "Active Users", value: String(activeUsers), gradient: "from-gold/10 to-gold/5", border: "border-gold/15", iconBg: "bg-gold/10 text-gold", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
    { title: "Direct Paid", value: `₹${totalDirect.toLocaleString("en-IN")}`, gradient: "from-emerald/10 to-emerald/5", border: "border-emerald/15", iconBg: "bg-emerald/10 text-emerald", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818.879.659 1.171-1.671.48-.642A3 3 0 0 1 15.96 12H18a3 3 0 0 1 3 3v.342M3 9.342A3 3 0 0 1 5.96 6H8.04c.734 0 1.413.468 1.658 1.165l.637 1.787M3 9.342V15a3 3 0 0 0 3 3h.64M12 6V3" /></svg> },
    { title: "Matching Paid", value: `₹${totalMatching.toLocaleString("en-IN")}`, gradient: "from-gold/10 to-gold/5", border: "border-gold/15", iconBg: "bg-gold/10 text-gold", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight">
            Admin <span className="italic text-gold">Dashboard</span>
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/60">Platform overview & analytics</p>
        </div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream shadow-sm shadow-emerald/20 transition-all duration-200 hover:bg-emerald/90 hover:shadow-md hover:shadow-emerald/30 hover:-translate-y-0.5"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
          Manage Users
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.title}
            className={`group relative overflow-hidden rounded-xl border ${stat.border} bg-gradient-to-br ${stat.gradient} p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald/70">{stat.title}</p>
              <div className={`rounded-lg p-2 ${stat.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                {stat.icon}
              </div>
            </div>
            <p className="mt-3 font-display text-3xl tracking-tight">{stat.value}</p>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          </div>
        ))}
      </div>

      {/* Recent Users Table */}
      <div className="overflow-hidden rounded-xl border border-gold/10 bg-cream shadow-sm">
        <div className="flex items-center justify-between border-b border-gold/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gold/10 p-2">
              <svg className="h-4 w-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">Recent Users</h3>
          </div>
          <Link to="/admin/users" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald/70 transition-colors hover:text-emerald">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 text-[10px] uppercase tracking-[0.2em] text-emerald/60">
                <th className="px-6 py-3 text-left font-semibold">ID</th>
                <th className="px-6 py-3 text-left font-semibold">Name</th>
                <th className="px-6 py-3 text-left font-semibold">Email</th>
                <th className="px-6 py-3 text-left font-semibold">Code</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {usersData.users?.slice(0, 10).map((user: any, i: number) => (
                <tr
                  key={user.id}
                  className="border-b border-gold/5 transition-all duration-200 hover:bg-gold/5"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-6 py-3.5 text-xs text-emerald/60 font-mono">#{user.id}</td>
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
                      user.isActive
                        ? "bg-emerald/5 text-emerald ring-emerald/20"
                        : "bg-red-50 text-red-600 ring-red-100"
                    }`}>
                      <span className={`h-1 w-1 rounded-full ${user.isActive ? "bg-emerald" : "bg-red-400"}`} />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right text-[10px] text-emerald/60">
                    {new Date(user.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
