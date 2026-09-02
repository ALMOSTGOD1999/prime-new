import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { getTreeVisualization } from "../../functions/user/tree";

export const Route = createFileRoute("/dashboard/tree")({
  component: TreePage,
});

function TreePage() {
  const [tree, setTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  useEffect(() => {
    getTreeVisualization()
      .then((d) => setTree(d.tree))
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
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-64 animate-pulse rounded border border-gold/20 bg-cream" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">
            My <span className="italic text-gold">Tree</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-emerald/70">
            Scroll to zoom, drag to pan.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.15))} className="rounded border border-gold/30 px-2 py-1 text-xs font-bold text-emerald hover:bg-emerald/5">+</button>
          <span className="min-w-[36px] text-center text-[10px] text-emerald/60">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.max(0.15, z - 0.15))} className="rounded border border-gold/30 px-2 py-1 text-xs font-bold text-emerald hover:bg-emerald/5">−</button>
          <button onClick={resetView} className="rounded border border-emerald/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald hover:bg-emerald/5">Reset</button>
        </div>
      </div>

      {tree ? (
        <div
          ref={containerRef}
          className="overflow-hidden rounded-lg border border-gold/15 bg-white shadow-sm"
          style={{ cursor: dragging ? "grabbing" : "grab", minHeight: "400px" }}
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
        <div className="rounded-lg border border-gold/15 bg-white p-12 text-center">
          <p className="text-4xl">🌳</p>
          <p className="mt-3 text-xs text-emerald/60">No team data yet. Share your referral code to start building!</p>
        </div>
      )}
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
        <div className="rounded border border-dashed border-gold/15 px-4 py-2 text-center">
          <p className="text-[9px] text-emerald/40">Empty</p>
        </div>
      </div>
    );
  }

  const hasChildren = node.left || node.right;
  const isCollapsed = collapsed.has(node.id);

  const rankColors: Record<string, string> = {
    bronze: "bg-amber-50 text-amber-700 ring-amber-200",
    silver: "bg-slate-50 text-slate-600 ring-slate-200",
    gold: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    platinum: "bg-violet-50 text-violet-700 ring-violet-200",
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`group relative flex flex-col items-center rounded-lg border px-3 py-2 sm:px-4 sm:py-2.5 text-center transition-all ${
          isRoot
            ? "border-gold/40 bg-gradient-to-b from-gold/8 to-gold/3 shadow-md ring-1 ring-gold/15"
            : node.isActive
              ? "border-emerald/25 bg-emerald/3 hover:border-emerald/40 hover:shadow-sm"
              : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
        }`}
      >
        {isRoot && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider text-cream shadow-sm">
            You
          </span>
        )}

        <p className={`text-xs sm:text-sm font-semibold leading-tight ${isRoot ? "text-emerald" : "text-slate-800"}`}>
          {node.name}
        </p>
        <p className="text-[9px] sm:text-[10px] font-mono text-emerald/50 mt-0.5">{node.referralCode}</p>

        <div className="mt-1.5 flex items-center justify-center gap-1">
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[7px] sm:text-[8px] font-semibold ${
            node.isActive ? "bg-emerald/10 text-emerald-700" : "bg-red-50 text-red-500"
          }`}>
            <span className={`mr-0.5 h-1 w-1 rounded-full ${node.isActive ? "bg-emerald-500" : "bg-red-400"}`} />
            {node.isActive ? "Active" : "Inactive"}
          </span>
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[7px] sm:text-[8px] font-semibold ring-1 ring-inset ${rankColors[node.rank] || "bg-slate-50 text-slate-600 ring-slate-200"}`}>
            {node.rank}
          </span>
        </div>

        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-gold/30 bg-white text-[10px] font-bold text-emerald shadow-sm transition-colors hover:bg-emerald/5 hover:border-emerald/40"
          >
            {isCollapsed ? "+" : "−"}
          </button>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div className="relative mt-5">
          <div className="absolute left-1/2 top-0 h-2.5 w-px bg-gold/25 -translate-x-px" />
          {(node.left && node.right) && (
            <div className="absolute left-[25%] right-[25%] top-2.5 h-px bg-gold/25" />
          )}

          <div className="flex gap-4 sm:gap-8 md:gap-12 pt-2.5">
            <div className="flex flex-col items-center">
              {node.left && <div className="absolute h-2.5 w-px bg-gold/25" style={{ left: "25%" }} />}
              <span className="mb-1.5 rounded-full bg-emerald/8 px-2 py-0.5 text-[7px] sm:text-[8px] font-semibold uppercase tracking-wider text-emerald/70 ring-1 ring-emerald/10">
                L
              </span>
              <TreeNode node={node.left} collapsed={collapsed} toggleCollapse={toggleCollapse} depth={depth + 1} />
            </div>

            <div className="flex flex-col items-center">
              {node.right && <div className="absolute h-2.5 w-px bg-gold/25" style={{ left: "75%" }} />}
              <span className="mb-1.5 rounded-full bg-gold/8 px-2 py-0.5 text-[7px] sm:text-[8px] font-semibold uppercase tracking-wider text-gold/70 ring-1 ring-gold/10">
                R
              </span>
              <TreeNode node={node.right} collapsed={collapsed} toggleCollapse={toggleCollapse} depth={depth + 1} />
            </div>
          </div>
        </div>
      )}

      {hasChildren && isCollapsed && (
        <div className="mt-3 rounded-full border border-dashed border-gold/30 bg-gold/5 px-3 py-1 text-[9px] text-gold/70">
          +{(node.left ? 1 : 0) + (node.right ? 1 : 0)} hidden
        </div>
      )}
    </div>
  );
}
