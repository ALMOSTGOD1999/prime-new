import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminUsers } from "../../functions/admin/users";
import { impersonateUser } from "../../functions/admin/impersonate";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [impersonating, setImpersonating] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchUsers = (s: string, p: number) => {
    setLoading(true);
    getAdminUsers({ data: s ? { search: s, page: p } : { page: p } })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers("", 1);
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchUsers(search, 1);
  };

  const handleImpersonate = async (userId: number, userName: string) => {
    if (!confirm(`Impersonate ${userName}? You can return to admin anytime.`)) return;
    setImpersonating(userId);
    try {
      const result = await impersonateUser({ data: { targetUserId: userId } });
      document.cookie = `auth_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      alert(err.message || "Impersonation failed");
    } finally {
      setImpersonating(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl tracking-tight">
          <span className="italic text-gold">User</span> Management
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/40">
          {data?.total || 0} registered members
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-lg border border-gold/15 bg-cream py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-200 placeholder:text-emerald/30 focus:border-gold/40 focus:ring-2 focus:ring-gold/10"
          />
        </div>
        <button
          onClick={handleSearch}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream shadow-sm shadow-emerald/20 transition-all duration-200 hover:bg-emerald/90 hover:shadow-md hover:shadow-emerald/30"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          Search
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gold/10 bg-cream shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald/40">Loading users...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/10 text-[10px] uppercase tracking-[0.2em] text-emerald/40">
                    <th className="px-6 py-3 text-left font-semibold">ID</th>
                    <th className="px-6 py-3 text-left font-semibold">Name</th>
                    <th className="px-6 py-3 text-left font-semibold">Email</th>
                    <th className="px-6 py-3 text-left font-semibold">Code</th>
                    <th className="px-6 py-3 text-left font-semibold">Position</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold">Admin</th>
                    <th className="px-6 py-3 text-right font-semibold">Package</th>
                    <th className="px-6 py-3 text-right font-semibold">Joined</th>
                    <th className="px-6 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users?.map((user: any, i: number) => (
                    <tr
                      key={user.id}
                      className={`border-b border-gold/5 transition-all duration-200 hover:bg-gold/5 ${i % 2 === 0 ? "bg-emerald/[0.02]" : ""}`}
                    >
                      <td className="px-6 py-3.5 font-mono text-xs text-emerald/40">#{user.id}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald/10 to-emerald/5 text-[10px] font-bold text-emerald ring-1 ring-emerald/15">
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
                        {user.position ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold/5 px-2 py-0.5 text-[10px] font-semibold text-gold ring-1 ring-gold/15">
                            {user.position === "left" ? "←" : "→"} {user.position}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald/25">—</span>
                        )}
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
                      <td className="px-6 py-3.5">
                        {user.isAdmin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 text-[10px] font-semibold text-gold ring-1 ring-gold/20">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right text-xs font-semibold text-emerald/60">
                        ₹{user.packageAmount?.toLocaleString("en-IN") || "0"}
                      </td>
                      <td className="px-6 py-3.5 text-right text-[10px] text-emerald/40">
                        {new Date(user.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {!user.isAdmin && (
                          <button
                            onClick={() => handleImpersonate(user.id, user.name)}
                            disabled={impersonating === user.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gold/25 bg-gold/5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gold transition-all duration-200 hover:bg-gold/10 hover:border-gold/40 hover:shadow-sm disabled:opacity-40"
                          >
                            {impersonating === user.id ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-gold border-t-transparent" />
                            ) : (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
                            )}
                            {impersonating === user.id ? "..." : "Login"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gold/10 px-6 py-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-emerald/40">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data?.total || 0)} of {data?.total || 0}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPage(Math.max(1, page - 1)); fetchUsers(search, Math.max(1, page - 1)); }}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gold/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald/60 transition-all duration-200 hover:border-gold/40 hover:bg-gold/5 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  Prev
                </button>
                <span className="rounded-lg bg-emerald/5 px-3 py-1.5 text-[10px] font-bold text-emerald">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => { setPage(Math.min(totalPages, page + 1)); fetchUsers(search, Math.min(totalPages, page + 1)); }}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gold/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald/60 transition-all duration-200 hover:border-gold/40 hover:bg-gold/5 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  Next
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
