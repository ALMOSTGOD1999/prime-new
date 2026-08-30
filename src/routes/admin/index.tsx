import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminUsers } from "@/functions/admin/users";
import { getAdminIncome } from "@/functions/admin/income";

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
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded border border-gold/20 bg-cream" />
          ))}
        </div>
      </div>
    );
  }

  if (!usersData || !incomeData) return null;

  const totalUsers = usersData.total || 0;
  const activeUsers = usersData.users?.filter((u: any) => u.isActive).length || 0;
  const summary = incomeData.summary || [];
  const totalDirect = summary.find((s: any) => s.type === "direct")?.total || 0;
  const totalMatching = summary.find((s: any) => s.type === "matching")?.total || 0;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl">
        Admin <span className="italic text-gold">Dashboard</span>
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={String(totalUsers)} icon="◈" />
        <StatCard title="Active Users" value={String(activeUsers)} icon="◇" />
        <StatCard title="Direct Paid" value={`₹${totalDirect.toLocaleString("en-IN")}`} icon="◆" />
        <StatCard title="Matching Paid" value={`₹${totalMatching.toLocaleString("en-IN")}`} icon="○" />
      </div>

      <div className="rounded border border-gold/20 bg-cream">
        <div className="border-b border-gold/10 px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Recent Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/50">
                <th className="px-6 py-3 text-left">ID</th>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Code</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {usersData.users?.slice(0, 10).map((user: any) => (
                <tr key={user.id} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                  <td className="px-6 py-3 text-xs text-emerald/50">#{user.id}</td>
                  <td className="px-6 py-3 text-xs font-semibold">{user.name}</td>
                  <td className="px-6 py-3 text-xs text-emerald/70">{user.email}</td>
                  <td className="px-6 py-3 text-[10px] font-mono text-emerald/60">{user.referralCode}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                        user.isActive ? "bg-emerald/10 text-emerald" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-[10px] text-emerald/50">
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

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="rounded border border-gold/20 bg-cream p-6 transition-colors hover:border-gold/40">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-emerald/50">{title}</p>
        <span className="text-gold/40">{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </div>
  );
}
