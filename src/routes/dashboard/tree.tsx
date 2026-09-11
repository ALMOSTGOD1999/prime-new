import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { getTreeVisualization, getLevelTree, getTeamStats } from "../../functions/user/tree";
import { LevelTreeView } from "../../components/LevelTreeView";

export const Route = createFileRoute("/dashboard/tree")({
  component: TreePage,
});

function TreePage() {
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
  // All nodes start COLLAPSED — user clicks to expand
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([getTreeVisualization(), getLevelTree(), getTeamStats()])
      .then(([treeData, levelTreeData, statsData]) => {
        setTree(treeData.tree);
        setLevelData(levelTreeData);
        setStats(statsData);
        // Initially collapse ALL nodes (so only root shows its L/R slots as empty)
        if (treeData.tree) {
          const allIds = new Set<number>();
          const collect = (n: any) => {
            if (n?.id) {
              allIds.add(n.id);
              if (n.left) collect(n.left);
              if (n.right) collect(n.right);
            }
          };
          collect(treeData.tree);
          // Remove root so root's children are visible
          allIds.delete(treeData.tree.id);
          setCollapsed(allIds);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleCollapse = (id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.min(3, Math.max(0.15, prev + (e.deltaY > 0 ? -0.08 : 0.08))));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    },
    [dragging]
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, []);

  const resetView = () => {
    setZoom(0.75);
    setPan({ x: 0, y: 0 });
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const ids = new Set<number>();
    const collect = (n: any) => { if (n?.id) { ids.add(n.id); if (n.left) collect(n.left); if (n.right) collect(n.right); } };
    if (tree) collect(tree);
    ids.delete(tree?.id); // Keep root expanded
    setCollapsed(ids);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-gold/20 bg-card" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-background" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header + Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">
            My <span className="italic text-gold">Tree</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-emerald/70">
            {viewMode === "binary" ? "Scroll to zoom, drag to pan." : "Members organized by level."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gold/20 bg-background p-0.5">
            <button
              onClick={() => setViewMode("binary")}
              className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                viewMode === "binary"
                  ? "bg-emerald text-cream shadow-sm"
                  : "text-emerald/60 hover:text-emerald"
              }`}
            >
              Binary
            </button>
            <button
              onClick={() => setViewMode("level")}
              className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                viewMode === "level"
                  ? "bg-emerald text-cream shadow-sm"
                  : "text-emerald/60 hover:text-emerald"
              }`}
            >
              Level
            </button>
          </div>

          {/* Zoom + expand/collapse controls (binary only) */}
          {viewMode === "binary" && (
            <div className="flex items-center gap-1.5">
              <button onClick={expandAll} className="rounded border border-emerald/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald hover:bg-emerald/5">Expand</button>
              <button onClick={collapseAll} className="rounded border border-gold/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold hover:bg-gold/5">Collapse</button>
              <div className="flex items-center gap-1 rounded border border-gold/30 px-1.5 py-0.5">
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.15))} className="px-1.5 py-0.5 text-xs font-bold text-emerald hover:bg-emerald/10 rounded">+</button>
                <span className="min-w-[36px] text-center text-[10px] text-emerald/60">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.15))} className="px-1.5 py-0.5 text-xs font-bold text-emerald hover:bg-emerald/10 rounded">−</button>
              </div>
              <button onClick={resetView} className="rounded border border-emerald/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald hover:bg-emerald/5">Reset</button>
            </div>
          )}
        </div>
      </div>

      {/* Team Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard label="Direct Team" value={stats.directTeam} sub={`L: ${stats.leftCount} · R: ${stats.rightCount}`} icon="👥" />
          <StatCard label="Total Team" value={stats.totalTeam} sub={`${stats.activeTeam} active`} icon="🌐" />
          <StatCard label="Total Business" value={`₹${stats.totalBusiness.toLocaleString("en-IN")}`} sub="Package value" icon="💰" />
          <StatCard label="Active Rate" value={stats.totalTeam > 0 ? `${Math.round((stats.activeTeam / stats.totalTeam) * 100)}%` : "—"} sub="Team activity" icon="📊" />
        </div>
      )}

      {/* Binary Tree View */}
      {viewMode === "binary" && (
        tree ? (
          <div
            ref={containerRef}
            className="overflow-hidden rounded-lg border border-gold/15 bg-card shadow-sm"
            style={{ cursor: dragging ? "grabbing" : "grab", minHeight: "500px" }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <div
              className="origin-top-left p-4 sm:p-6"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: dragging ? "none" : "transform 0.15s ease-out",
                transformOrigin: "0 0",
              }}
            >
              <TreeNode node={tree} isRoot={true} collapsed={collapsed} toggleCollapse={toggleCollapse} depth={0} />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gold/15 bg-card p-12 text-center">
            <p className="text-4xl">🌳</p>
            <p className="mt-3 text-xs text-emerald/60">No team data yet. Share your referral code to start building!</p>
          </div>
        )
      )}

      {/* Level Tree View */}
      {viewMode === "level" && levelData && (
        <LevelTreeView levels={levelData.levels} rootId={levelData.rootId} />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub: string; icon: string }) {
  return (
    <div className="rounded-lg border border-gold/15 bg-card p-3 sm:p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald/50">{label}</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald">{value}</p>
          <p className="text-[9px] sm:text-[10px] text-emerald/40">{sub}</p>
        </div>
        <span className="text-lg">{icon}</span>
      </div>
    </div>
  );
}

function TreeNode({
  node,
  isRoot,
  collapsed,
  toggleCollapse,
  depth,
}: {
  node: any;
  isRoot?: boolean;
  collapsed: Set<number>;
  toggleCollapse: (id: number) => void;
  depth: number;
}) {
  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-4 text-center min-w-[120px]">
          <p className="text-xs text-slate-400 font-medium">Empty</p>
        </div>
      </div>
    );
  }

  const hasLeft = node.left != null;
  const hasRight = node.right != null;
  const hasChildren = hasLeft || hasRight;
  const isCollapsed = collapsed.has(node.id);

  const rankColors: Record<string, string> = {
    bronze: "bg-amber-100 text-amber-800 ring-amber-300",
    silver: "bg-slate-100 text-slate-700 ring-slate-300",
    gold: "bg-yellow-100 text-yellow-800 ring-yellow-300",
    platinum: "bg-violet-100 text-violet-800 ring-violet-300",
  };

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div
        className={`group relative flex flex-col items-center rounded-xl border-2 px-5 py-3 sm:px-6 sm:py-4 text-center transition-all min-w-[140px] ${
          isRoot
            ? "border-gold/50 bg-gradient-to-b from-gold/10 to-gold/5 shadow-lg ring-2 ring-gold/20"
            : node.isActive
              ? "border-emerald/30 bg-emerald/5 hover:border-emerald/50 hover:shadow-md"
              : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:shadow-sm"
        }`}
      >
        {isRoot && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cream shadow-md">
            You
          </span>
        )}

        <p className={`text-sm sm:text-base font-bold leading-tight ${isRoot ? "text-emerald" : "text-slate-800"}`}>
          {node.name}
        </p>
        <p className="text-[11px] sm:text-xs font-mono text-emerald/50 mt-1">{node.referralCode}</p>

        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold ${
            node.isActive ? "bg-emerald/15 text-emerald-700" : "bg-red-50 text-red-600"
          }`}>
            <span className={`mr-1 h-1.5 w-1.5 rounded-full ${node.isActive ? "bg-emerald-500" : "bg-red-400"}`} />
            {node.isActive ? "Active" : "Inactive"}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold ring-1 ring-inset ${rankColors[node.rank] || "bg-slate-100 text-slate-600 ring-slate-300"}`}>
            {node.rank}
          </span>
        </div>

        {/* Expand/Collapse button */}
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition-all ${
              isCollapsed
                ? "border-emerald/40 bg-emerald text-cream hover:bg-emerald/80"
                : "border-gold/40 bg-gold text-cream hover:bg-gold/80"
            }`}
          >
            {isCollapsed ? "+" : "−"}
          </button>
        )}
      </div>

      {/* Children with binary tree lines */}
      {hasChildren && !isCollapsed && (
        <div className="relative mt-6">
          {/* Vertical line down from parent */}
          <div className="absolute left-1/2 top-0 h-3 w-px bg-gold/30 -translate-x-px" />

          {/* Horizontal line connecting left and right */}
          {hasLeft && hasRight && (
            <div className="absolute left-[25%] right-[25%] top-3 h-px bg-gold/30" />
          )}
          {!hasLeft && hasRight && (
            <div className="absolute left-1/2 right-[25%] top-3 h-px bg-gold/30" />
          )}
          {hasLeft && !hasRight && (
            <div className="absolute left-[25%] right-1/2 top-3 h-px bg-gold/30" />
          )}

          <div className="flex pt-3 gap-8 sm:gap-12 md:gap-16">
            {/* Left child */}
            <div className="flex flex-1 flex-col items-center relative">
              <div className="absolute h-3 w-px bg-gold/30" style={{ left: "50%" }} />
              <span className="mb-2 rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset bg-emerald/10 text-emerald-700 ring-emerald/20">
                L
              </span>
              {node.left ? (
                <TreeNode node={node.left} collapsed={collapsed} toggleCollapse={toggleCollapse} depth={depth + 1} />
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-4 text-center min-w-[120px]">
                  <p className="text-xs text-slate-400 font-medium">Empty</p>
                </div>
              )}
            </div>

            {/* Right child */}
            <div className="flex flex-1 flex-col items-center relative">
              <div className="absolute h-3 w-px bg-gold/30" style={{ left: "50%" }} />
              <span className="mb-2 rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset bg-gold/10 text-gold-700 ring-gold/20">
                R
              </span>
              {node.right ? (
                <TreeNode node={node.right} collapsed={collapsed} toggleCollapse={toggleCollapse} depth={depth + 1} />
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-4 text-center min-w-[120px]">
                  <p className="text-xs text-slate-400 font-medium">Empty</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasChildren && isCollapsed && (
        <div className="mt-4 rounded-full border-2 border-dashed border-emerald/30 bg-emerald/5 px-4 py-1.5 text-[10px] sm:text-xs font-semibold text-emerald/70 cursor-pointer hover:bg-emerald/10 transition-colors" onClick={() => toggleCollapse(node.id)}>
          + Click to expand
        </div>
      )}
    </div>
  );
}
