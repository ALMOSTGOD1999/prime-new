import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getTreeVisualization, getLevelTree, getDownlineUsers, getDirectUsers } from "../../functions/user/tree";
import { BinaryTreePanel } from "../../components/network/BinaryTreePanel";

export const Route = createFileRoute("/dashboard/network")({
  component: NetworkPage,
  validateSearch: (search) => ({
    tab: String(search["tab"] || "tree"),
  }),
});

type NetworkTab = "tree" | "downline" | "direct" | "levels";

function NetworkPage() {
  const search = Route.useSearch();
  const tab = (search as any).tab as string || "tree";
  const activeTab = (tab === "downline" || tab === "direct" || tab === "levels" ? tab : "tree") as NetworkTab;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl">
        My <span className="italic text-gold">Network</span>
      </h1>
      <div className="rounded border border-gold/20 bg-background p-6">
        {activeTab === "tree" && <TreeViewTab />}
        {activeTab === "downline" && <DownlineTab />}
        {activeTab === "direct" && <DirectTab />}
        {activeTab === "levels" && <LevelsTab />}
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-lg border border-gold/15 bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald/50">{label}</p>
      <p className="mt-1 text-xl font-bold text-emerald">{value}</p>
      <p className="text-xs text-emerald/40">{sub}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-gold/15 bg-card p-12 text-center">
      <p className="text-4xl">📋</p>
      <p className="mt-3 text-xs text-emerald/60">{message}</p>
    </div>
  );
}

function UserTable({ users, title }: { users: any[]; title: string }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-emerald/60">
        {title} <span className="font-bold text-emerald">{users.length}</span> member(s).
      </p>
      {users.length === 0 ? (
        <EmptyState message="No members yet. Share your referral code to start building!" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold/20 text-[10px] uppercase tracking-widest text-emerald/60">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Member ID</th>
                <th className="px-3 py-2">Position</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Rank</th>
                <th className="px-3 py-2">Business</th>
                <th className="px-3 py-2">Date of Joining</th>
                <th className="px-3 py-2">Sponsor ID</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className="border-b border-gold/10 hover:bg-emerald/5">
                  <td className="px-3 py-2 text-emerald/50">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">{u.name}</td>
                  <td className="px-3 py-2 font-mono text-emerald/70">{u.referralCode}</td>
                  <td className="px-3 py-2 capitalize">{u.position || "\u2014"}</td>
                  <td className="px-3 py-2">
                    {u.level != null ? (
                      <span className="inline-flex items-center rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                        L{u.level}
                      </span>
                    ) : (
                      "\u2014"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.isActive ? "bg-emerald/15 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 capitalize">{u.rank}</td>
                  <td className="px-3 py-2">{"\u20B9"}{(u.packageAmount || 0).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-[10px] text-emerald/70">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-emerald/70">{u.sponsorId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══ Tree View Tab ═══
function TreeViewTab() {
  const [tree, setTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTreeVisualization()
      .then((treeData) => setTree(treeData.tree))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (<div className="space-y-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1,2,3,4].map((i) => (<div key={i} className="h-20 animate-pulse rounded-lg border border-gold/20 bg-card" />))}</div><div className="h-64 animate-pulse rounded border border-gold/20 bg-background" /></div>);
  }

  // Shared fixed-window tree: search + anchor bar + tap-to-re-anchor canvas.
  // Identical behavior on /dashboard/tree and /admin/tree.
  return <BinaryTreePanel tree={tree} />;
}

// ═══ Downline Tab ═══
function DownlineTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDownlineUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-48 animate-pulse rounded bg-emerald/5" />;
  return <UserTable users={users} title="Showing all" />;
}

// ═══ Direct Tab ═══
function DirectTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDirectUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-48 animate-pulse rounded bg-emerald/5" />;
  return <UserTable users={users} title="Showing" />;
}

// ═══ Level Wise Tree Tab ═══
function LevelsTab() {
  const [levelData, setLevelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    getLevelTree().then(setLevelData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleLevel = (idx: number) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (loading) return <div className="h-48 animate-pulse rounded bg-emerald/5" />;
  if (!levelData?.levels?.length) return <EmptyState message="No levels found." />;

  const levelLabels = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th",
    "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th", "20th"];

  return (
    <div className="space-y-3">
      <p className="text-xs text-emerald/60">
        <span className="font-bold text-emerald">{levelData.levels.length}</span> levels found in your team.
      </p>
      {levelData.levels.map((level: any[], idx: number) => (
        <div key={idx} className="overflow-hidden rounded border border-gold/20">
          <button
            onClick={() => toggleLevel(idx)}
            className="flex w-full items-center justify-between bg-emerald/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-emerald transition-colors hover:bg-emerald/15"
          >
            <span>{levelLabels[idx] || `${idx + 1}th`} Lvl Tree ({level.length} members)</span>
            <span className="text-emerald/50">{expandedLevels.has(idx) ? "▲" : "▼"}</span>
          </button>
          {expandedLevels.has(idx) && (
            <div className="overflow-x-auto bg-background">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gold/20 text-[10px] uppercase tracking-widest text-emerald/60">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Member ID</th>
                    <th className="px-3 py-2">Position</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {level.map((u: any, i: number) => (
                    <tr key={u.id} className="border-b border-gold/10 hover:bg-emerald/5">
                      <td className="px-3 py-2 text-emerald/50">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold">{u.name}</td>
                      <td className="px-3 py-2 font-mono text-emerald/70">{u.referralCode}</td>
                      <td className="px-3 py-2 capitalize">{u.position || "\u2014"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.isActive ? "bg-emerald/15 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 capitalize">{u.rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
