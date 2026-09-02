import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminUsers } from "../../functions/admin/users";
import { bulkActivate, bulkNotify, exportUsers } from "../../functions/admin/bulk";

export const Route = createFileRoute("/admin/bulk")({
  component: AdminBulkPage,
});

function AdminBulkPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState<"none" | "notify">("none");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const loadUsers = async () => {
    try {
      const data = await getAdminUsers({ data: { search, page } });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  };

  const handleBulkActivate = async () => {
    if (selected.size === 0) return alert("Select users first");
    if (!confirm(`Activate ${selected.size} users?`)) return;
    setProcessing(true);
    try {
      const result = await bulkActivate({ data: { userIds: Array.from(selected) } });
      alert(`Activated ${result.activated} users`);
      setSelected(new Set());
      await loadUsers();
    } catch (err: any) {
      alert(err.message || "Failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkNotify = async () => {
    if (selected.size === 0) return alert("Select users first");
    if (!notifyTitle || !notifyMsg) return alert("Enter title and message");
    setProcessing(true);
    try {
      const result = await bulkNotify({ data: { userIds: Array.from(selected), title: notifyTitle, message: notifyMsg } });
      alert(`Sent to ${result.sent} users`);
      setSelected(new Set());
      setAction("none");
      setNotifyTitle("");
      setNotifyMsg("");
    } catch (err: any) {
      alert(err.message || "Failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportUsers();
      const csv = [
        "ID,Name,Email,Code,Position,Active,Rank,Package,Joined",
        ...data.users.map((u: any) =>
          `${u.id},"${u.name}","${u.email}",${u.referralCode},${u.position || ""},${u.isActive},${u.rank},${u.packageAmount},${new Date(u.createdAt).toLocaleDateString("en-IN")}`
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Export failed");
    }
  };

  const totalPages = Math.ceil(total / 20);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-cream" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">
        Bulk <span className="italic text-gold">Actions</span>
      </h1>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search users..."
          className="flex-1 border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60 focus:border-gold sm:max-w-xs"
        />
        <span className="text-xs text-emerald/60">{selected.size} selected</span>
        <button
          onClick={() => setAction(action === "notify" ? "none" : "notify")}
          disabled={selected.size === 0}
          className="border border-gold/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-gold/10 disabled:opacity-40"
        >
          Notify Selected
        </button>
        <button
          onClick={handleBulkActivate}
          disabled={selected.size === 0 || processing}
          className="border border-emerald/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-emerald transition-all hover:bg-emerald/10 disabled:opacity-40"
        >
          Activate Selected
        </button>
        <button
          onClick={handleExport}
          className="bg-emerald px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80"
        >
          Export CSV
        </button>
      </div>

      {/* Notify Form */}
      {action === "notify" && (
        <div className="rounded border border-gold/20 bg-cream p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="Notification title"
              className="border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60"
            />
            <input
              type="text"
              value={notifyMsg}
              onChange={(e) => setNotifyMsg(e.target.value)}
              placeholder="Notification message"
              className="border-b border-gold/40 bg-transparent py-2 text-sm outline-none placeholder:text-emerald/60"
            />
          </div>
          <button
            onClick={handleBulkNotify}
            disabled={processing || !notifyTitle || !notifyMsg}
            className="mt-3 bg-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald disabled:opacity-50"
          >
            Send Notification
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded border border-gold/20 bg-cream">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                <th className="px-4 py-3">
                  <input type="checkbox" onChange={toggleAll} checked={selected.size === users.length && users.length > 0} className="accent-gold" />
                </th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Rank</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gold/5 hover:bg-gold/5">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      className="accent-gold"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs">#{u.id}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{u.name}</td>
                  <td className="px-4 py-3 text-[10px] text-emerald/70">{u.referralCode}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${u.isActive ? "bg-emerald/10 text-emerald" : "bg-red-50 text-red-600"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] capitalize">{u.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gold/10 px-6 py-3">
            <p className="text-[10px] text-emerald/60">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="border border-emerald/40 px-3 py-1 text-[10px] font-semibold uppercase disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="border border-emerald/40 px-3 py-1 text-[10px] font-semibold uppercase disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
