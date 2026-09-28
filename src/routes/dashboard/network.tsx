import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { getTreeVisualization, getLevelTree, getTeamStats, getDownlineUsers, getDirectUsers } from "../../functions/user/tree";
import { LevelTreeView } from "../../components/LevelTreeView";
import { NetTreeNode, WINDOW_LEVELS } from "../../components/network/NetTreeNode";

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
  const [levelData, setLevelData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"binary" | "level">("binary");
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Fixed four-level window: the anchor user's card sits on top with exactly
  // three tiers of two downline slots below. Tapping a box that has a downline
  // re-anchors the window to that user — the skeleton stays identical, only
  // the users change — so a full expanded tree is never needed on mobile.
  const [anchorId, setAnchorId] = useState<number | null>(null);
  // Drag-vs-tap guard: pan gestures must not trigger a box re-anchor.
  const dragMovedRef = useRef(false);
  const dragOriginRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    Promise.all([getTreeVisualization(), getLevelTree(), getTeamStats()])
      .then(([treeData, levelTreeData, statsData]) => {
        setTree(treeData.tree);
        setLevelData(levelTreeData);
        setStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Locate the anchor node (with parent + depth) inside the loaded tree.
  const findWithParent = (n: any, id: number, parent: any = null, depth = 0): any => {
    if (!n) return null;
    if (n.id === id) return { node: n, parent, depth };
    return findWithParent(n.left, id, n, depth + 1) || findWithParent(n.right, id, n, depth + 1);
  };
  const anchor =
    !tree ? null : anchorId === null ? { node: tree, parent: null, depth: 0 } : findWithParent(tree, anchorId) ?? { node: tree, parent: null, depth: 0 };

  // Tap a downline box → the fixed window re-anchors to that user's family
  // (ignored if the gesture was a pan drag, not a tap).
  const handleToggle = (node: any) => {
    if (dragMovedRef.current) return;
    setAnchorId(node.id);
    setPan({ x: 0, y: 0 });
  };

  const goUpLevel = () => {
    if (anchor?.parent) {
      setAnchorId(anchor.parent.id);
      setPan({ x: 0, y: 0 });
    }
  };

  const goTopLevel = () => {
    setAnchorId(null);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.min(3, Math.max(0.15, prev + (e.deltaY > 0 ? -0.08 : 0.08))));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragMovedRef.current = false;
    dragOriginRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - dragOriginRef.current.x) + Math.abs(e.clientY - dragOriginRef.current.y) > 5) {
      dragMovedRef.current = true;
    }
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (e.touches.length === 1 && t) {
      dragMovedRef.current = false;
      dragOriginRef.current = { x: t.clientX, y: t.clientY };
      lastPos.current = { x: t.clientX, y: t.clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (e.touches.length === 1 && t) {
      if (Math.abs(t.clientX - dragOriginRef.current.x) + Math.abs(t.clientY - dragOriginRef.current.y) > 5) {
        dragMovedRef.current = true;
      }
      const dx = t.clientX - lastPos.current.x;
      const dy = t.clientY - lastPos.current.y;
      lastPos.current = { x: t.clientX, y: t.clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, []);

  const resetView = () => { setZoom(0.75); setPan({ x: 0, y: 0 }); };

  if (loading) {
    return (<div className="space-y-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1,2,3,4].map((i) => (<div key={i} className="h-20 animate-pulse rounded-lg border border-gold/20 bg-card" />))}</div><div className="h-64 animate-pulse rounded border border-gold/20 bg-background" /></div>);
  }

  return (
    <div className="space-y-4">
      {/* Search only — header and stats removed per request */}
      {viewMode === "binary" && (
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs font-semibold text-emerald/70">by Code</span>
          <input
            type="text"
            placeholder=""
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded border border-gold/20 bg-white px-3 py-2 text-sm outline-none focus:border-gold/40"
          />
          <button
            onClick={() => {}}
            className="rounded bg-emerald px-4 py-2 text-xs font-bold text-white hover:bg-emerald/90"
          >
            Search
          </button>
        </div>
      )}
      {/* Fixed two-level bar — visible whenever we are not anchored at the root */}
      {viewMode === "binary" && anchor && anchor.depth > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/20 bg-emerald/5 px-3 py-2">
          <p className="text-[11px] text-emerald/70">
            Showing levels <span className="font-bold text-emerald">{anchor.depth}</span>
            <span className="font-bold text-emerald">–{anchor.depth + WINDOW_LEVELS - 1}</span> · {WINDOW_LEVELS} levels at a time
          </p>
          <div className="flex gap-2">
            <button
              onClick={goUpLevel}
              className="rounded border border-gold/30 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald transition-colors hover:bg-emerald/5"
            >
              ⬆ Up a level
            </button>
            <button
              onClick={goTopLevel}
              className="rounded border border-gold/30 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald transition-colors hover:bg-emerald/5"
            >
              ⌂ Top
            </button>
          </div>
        </div>
      )}
      {viewMode === "binary" && (tree ? (
        <div ref={containerRef} className="overflow-hidden rounded-lg border border-gold/15 bg-card shadow-sm" style={{ cursor: dragging ? "grabbing" : "grab", minHeight: "500px" }} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
          <div className="origin-top-left p-4 sm:p-6" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: dragging ? "none" : "transform 0.15s ease-out", transformOrigin: "0 0" }}>
            <NetTreeNode node={anchor?.node ?? tree} isRoot={(anchor?.depth ?? 0) === 0} onToggle={handleToggle} searchQuery={searchQuery} />
          </div>
        </div>
      ) : (<div className="rounded-lg border border-gold/15 bg-card p-12 text-center"><p className="text-4xl">{"\uD83C\uDF33"}</p><p className="mt-3 text-xs text-emerald/60">No team data yet. Share your referral code to start building!</p></div>))}
      {viewMode === "level" && levelData && <LevelTreeView levels={levelData.levels} rootId={levelData.rootId} />}
    </div>
  );
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
