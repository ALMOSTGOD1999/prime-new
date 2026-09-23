import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUsersForPositionManager, updateUserPosition } from "../../functions/admin/users";

export const Route = createFileRoute("/dashboard/manage-positions")({
  component: ManagePositions,
});

function ManagePositions() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchUsers = (s: string, p: number) => {
    setLoading(true);
    getUsersForPositionManager({ data: s ? { search: s, page: p } : { page: p } })
      .then(setData)
      .catch((e) => alert(e.message || "Forbidden: only PR0006 or admin"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers("", 1);
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchUsers(search, 1);
  };

  const handleChange = async (userId: number, name: string, currentPos: string | null, newPos: "left" | "right") => {
    if (currentPos === newPos) return;
    if (!confirm(`Change ${name} (#${userId}) from ${currentPos || "none"} → ${newPos}? Moves to extreme ${newPos} leaf.`)) return;
    setUpdatingId(userId);
    try {
      await updateUserPosition({ data: { userId, newPosition: newPos } });
      alert(`${name} moved to ${newPos}`);
      fetchUsers(search, page);
    } catch (err: any) {
      alert(err.message || "Failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">
          Manage <span className="italic text-gold">Positions</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald/60">
          Only position changer — for PR0006. No other admin access.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by ID, code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 rounded-lg border border-gold/15 bg-background px-4 py-2.5 text-sm outline-none focus:border-gold/40"
        />
        <button onClick={handleSearch} className="rounded-lg bg-emerald px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-cream">
          Search
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gold/10 bg-background">
        {loading ? (
          <div className="py-16 text-center text-xs uppercase tracking-[0.2em] text-emerald/60">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold/10 text-xs uppercase tracking-[0.2em] text-emerald/60">
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Current</th>
                    <th className="px-4 py-3 text-left">Change To</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users?.map((user: any) => (
                    <tr key={user.id} className="border-b border-gold/5 hover:bg-gold/5">
                      <td className="px-4 py-3 font-mono text-xs">#{user.id}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{user.name}</td>
                      <td className="px-4 py-3"><code className="rounded bg-emerald/5 px-2 py-0.5 text-xs">{user.referralCode}</code></td>
                      <td className="px-4 py-3 text-xs">
                        {user.position ? <span className="rounded-full bg-gold/5 px-2 py-0.5 font-semibold text-gold">{user.position}</span> : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.position || ""}
                          onChange={(e) => handleChange(user.id, user.name, user.position, e.target.value as "left" | "right")}
                          disabled={updatingId === user.id}
                          className="rounded border border-gold/20 bg-white px-2 py-1 text-xs font-bold uppercase disabled:opacity-40"
                        >
                          <option value="">—</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-gold/10 px-4 py-3">
              <span className="text-xs text-emerald/60">{data?.total || 0} users</span>
              <div className="flex gap-2">
                <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchUsers(search, p); }} disabled={page <= 1} className="rounded border px-3 py-1 text-xs disabled:opacity-30">Prev</button>
                <span className="px-3 py-1 text-xs font-bold">{page} / {totalPages}</span>
                <button onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchUsers(search, p); }} disabled={page >= totalPages} className="rounded border px-3 py-1 text-xs disabled:opacity-30">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
