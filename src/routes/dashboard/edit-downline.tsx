import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDownlineEditList } from "../../functions/user/downline-edit";
import { updateUserDetails } from "../../functions/admin/users";

export const Route = createFileRoute("/dashboard/edit-downline")({
  component: EditDownlinePage,
});

type Row = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  referralCode: string;
  isActive: boolean;
  packageAmount: number;
  level: number;
};

function EditDownlinePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    getDownlineEditList()
      .then((d) => setRows(d as Row[]))
      .catch((e) => setError(e.message || "Failed to load downline"))
      .finally(() => setLoading(false));
  }, []);

  const openEdit = (row: Row) => {
    setEditTarget(row);
    setEditForm({ name: row.name, email: row.email, phone: row.phone || "" });
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    setEditError("");
    try {
      await updateUserDetails({
        data: {
          userId: editTarget.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
        },
      });
      setRows((rs) =>
        rs.map((r) =>
          r.id === editTarget.id
            ? { ...r, name: editForm.name.trim(), email: editForm.email.trim(), phone: editForm.phone.trim() || null }
            : r,
        ),
      );
      setEditTarget(null);
    } catch (e: any) {
      setEditError(e.message || "Save failed");
    } finally {
      setEditSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.referralCode.toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q) ||
          (r.phone || "").includes(q),
      )
    : rows;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-emerald/10" />
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-background" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl">
          Edit <span className="italic text-gold">Downline</span>
        </h1>
        <div className="rounded border border-red-400/30 bg-red-400/5 p-12 text-center">
          <p className="text-xs font-semibold text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">
          Edit <span className="italic text-gold">Downline</span>
        </h1>
        <p className="mt-1 text-xs text-emerald/70">
          Update basic details (name, email, phone) of members in your downline. Referral code,
          tree position, rank and balances cannot be changed here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, email or phone..."
          className="w-full max-w-sm rounded-lg border border-gold/20 bg-card px-4 py-2.5 text-sm text-emerald outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
        />
        <span className="text-[11px] uppercase tracking-widest text-emerald/50">
          {filtered.length} of {rows.length} members
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded border border-gold/20 bg-background p-12 text-center">
          <p className="text-xs text-emerald/60">No downline members found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-gold/20 bg-background">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold/20 text-[10px] uppercase tracking-widest text-emerald/50">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gold/10 transition-colors hover:bg-gold/5">
                  <td className="px-4 py-3 font-semibold text-emerald">{r.name}</td>
                  <td className="px-4 py-3 text-gold">{r.referralCode}</td>
                  <td className="px-4 py-3 text-emerald/70">{r.email}</td>
                  <td className="px-4 py-3 text-emerald/70">{r.phone || "—"}</td>
                  <td className="px-4 py-3 text-emerald/60">L{r.level}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        r.isActive ? "bg-emerald/15 text-emerald" : "bg-red-400/15 text-red-400"
                      }`}
                    >
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald/30 bg-emerald/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald transition-all duration-200 hover:bg-emerald/20 hover:shadow-sm"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gold/30 bg-background shadow-2xl">
            <div className="border-b border-gold/20 px-6 py-4">
              <h3 className="font-display text-lg text-gold">Edit User Details</h3>
              <p className="text-xs text-emerald/60">Editing {editTarget.name} · ID #{editTarget.id}</p>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald/70">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gold/20 bg-card px-4 py-2.5 text-sm text-emerald outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald/70">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gold/20 bg-card px-4 py-2.5 text-sm text-emerald outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald/70">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Not set"
                  className="mt-1 w-full rounded-lg border border-gold/20 bg-card px-4 py-2.5 text-sm text-emerald outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
                />
              </div>
              <p className="text-[10px] text-emerald/50">
                Referral code, tree position, rank and balances cannot be edited here.
              </p>
              {editError && <p className="text-xs font-semibold text-red-600">{editError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gold/15 px-6 py-4">
              <button
                onClick={() => setEditTarget(null)}
                className="rounded-lg border border-gold/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-emerald/60 transition-all hover:border-gold/40 hover:bg-gold/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving || !editForm.name.trim() || !editForm.email.trim()}
                className="rounded-lg border border-gold/40 bg-gold/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-gold transition-all hover:bg-gold/20 disabled:opacity-40"
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
