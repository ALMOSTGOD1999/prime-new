import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminUsers } from "../../functions/admin/users";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchUsers = (s: string, p: number) => {
    setLoading(true);
    getAdminUsers({ data: { search: s || undefined, page: p } })
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

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        <span className="italic text-gold">User</span> Management
      </h1>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/40 focus:border-gold"
        />
        <button
          onClick={handleSearch}
          className="bg-emerald px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80"
        >
          Search
        </button>
      </div>

      <div className="rounded border border-gold/20 bg-cream">
        {loading ? (
          <div className="px-6 py-12 text-center text-xs text-emerald/40">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/50">
                    <th className="px-6 py-3 text-left">ID</th>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Code</th>
                    <th className="px-6 py-3 text-left">Position</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Admin</th>
                    <th className="px-6 py-3 text-right">Package</th>
                    <th className="px-6 py-3 text-right">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users?.map((user: any) => (
                    <tr key={user.id} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                      <td className="px-6 py-3 text-xs text-emerald/50">#{user.id}</td>
                      <td className="px-6 py-3 text-xs font-semibold">{user.name}</td>
                      <td className="px-6 py-3 text-xs text-emerald/70">{user.email}</td>
                      <td className="px-6 py-3 text-[10px] font-mono text-emerald/60">{user.referralCode}</td>
                      <td className="px-6 py-3">
                        {user.position ? (
                          <span className="text-[10px] uppercase text-emerald/50">{user.position}</span>
                        ) : (
                          <span className="text-[10px] text-emerald/30">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                            user.isActive ? "bg-emerald/10 text-emerald" : "bg-red-50 text-red-600"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {user.isAdmin && (
                          <span className="inline-block rounded bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-emerald/60">
                        ₹{user.packageAmount?.toLocaleString("en-IN") || "0"}
                      </td>
                      <td className="px-6 py-3 text-right text-[10px] text-emerald/50">
                        {new Date(user.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gold/10 px-6 py-3">
              <p className="text-[10px] text-emerald/50">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data?.total || 0)} of {data?.total || 0}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPage(Math.max(1, page - 1)); fetchUsers(search, Math.max(1, page - 1)); }}
                  disabled={page <= 1}
                  className="rounded border border-gold/20 px-3 py-1 text-[10px] uppercase disabled:opacity-30"
                >
                  Prev
                </button>
                <button
                  onClick={() => { setPage(Math.min(totalPages, page + 1)); fetchUsers(search, Math.min(totalPages, page + 1)); }}
                  disabled={page >= totalPages}
                  className="rounded border border-gold/20 px-3 py-1 text-[10px] uppercase disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
