import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { getTreeVisualization, getLevelTree } from "../../functions/user/tree";
import { LevelTreeView } from "../../components/LevelTreeView";

export const Route = createFileRoute("/dashboard/tree")({
  component: DashboardTreePage,
});

function DashboardTreePage() {
  const [tree, setTree] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"binary" | "level">("binary");
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([getTreeVisualization(), getLevelTree()])
      .then(([treeData, levelTreeData]) => {
        setTree(treeData.tree);
        setLevelData(levelTreeData);
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
    setZoom((prev) => Math.min(3, Math.max(0.1, prev + (e.deltaY > 0 ? -0.08 : 0.08))));
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
      lastPos.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const dx = e.touches[0]!.clientX - lastPos.current.x;
      const dy = e.touches[0]!.clientY - lastPos.current.y;
      lastPos.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  }, []);

  const resetView = () => {
    setZoom(0.4);
    setPan({ x: 0, y: 0 });
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const ids = new Set<number>();
    const collect = (n: any) => {
      if (n?.id) {
        ids.add(n.id);
        if (n.left) collect(n.left);
        if (n.right) collect(n.right);
      }
    };
    if (tree) collect(tree);
    ids.delete(tree?.id);
    setCollapsed(ids);
  };

  const matchesSearch = (node: any): boolean => {
    if (!searchQuery || !node) return false;
    const q = searchQuery.toLowerCase();
    return (
      node.name?.toLowerCase().includes(q) ||
      node.referralCode?.toLowerCase().includes(q) ||
      String(node.id).includes(q)
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-96 animate-pulse rounded border border-gold/20 bg-background" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search only — header controls removed per request */}
      {viewMode === "binary" && (
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs font-semibold text-emerald/70">
            by Code
          </span>
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

      {/* Binary Tree View */}
      {viewMode === "binary" &&
        (tree ? (
          <div
            ref={containerRef}
            className="overflow-auto rounded-lg border border-gold/15 bg-white shadow-sm"
            style={{
              cursor: dragging ? "grabbing" : "grab",
              minHeight: "500px",
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <div
              className="origin-top-left inline-block p-6 sm:p-8"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: dragging ? "none" : "transform 0.15s ease-out",
                transformOrigin: "0 0",
              }}
            >
              <TreeNode
                node={tree}
                isRoot={true}
                collapsed={collapsed}
                toggleCollapse={toggleCollapse}
                depth={0}
                searchQuery={searchQuery}
                matchesSearch={matchesSearch}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gold/15 bg-card p-12 text-center">
            <p className="text-4xl">🌳</p>
            <p className="mt-3 text-xs text-emerald/60">No organization data yet.</p>
          </div>
        ))}

      {/* Level Tree View */}
      {viewMode === "level" && levelData && (
        <LevelTreeView levels={levelData.levels} rootId={levelData.rootId} />
      )}
    </div>
  );
}

/* ── Person SVG Avatar ── */
function PersonAvatar({ size = 60, isActive = true }: { size?: number; isActive?: boolean }) {
  const color = isActive ? "#16a34a" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="30" fill={color} />
      <circle cx="30" cy="23" r="8" fill="white" opacity="0.9" />
      <ellipse cx="30" cy="44" rx="14" ry="10" fill="white" opacity="0.9" />
      <rect x="22" y="36" width="16" height="3" rx="1" fill={color} opacity="0.4" />
    </svg>
  );
}

function EmptyAvatar({ size = 60 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="30" fill="#3b82f6" />
      <circle cx="30" cy="23" r="8" fill="white" opacity="0.9" />
      <ellipse cx="30" cy="44" rx="14" ry="10" fill="white" opacity="0.9" />
      <rect x="22" y="36" width="16" height="3" rx="1" fill="#3b82f6" opacity="0.4" />
    </svg>
  );
}

function TreeNode({
  node,
  isRoot,
  collapsed,
  toggleCollapse,
  depth,
  searchQuery,
  matchesSearch,
}: {
  node: any;
  isRoot?: boolean;
  collapsed: Set<number>;
  toggleCollapse: (id: number) => void;
  depth: number;
  searchQuery: string;
  matchesSearch: (node: any) => boolean;
}) {
  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <EmptyAvatar size={60} />
        <p className="mt-1 text-[11px] font-semibold text-blue-500">
          Join Now
        </p>
      </div>
    );
  }

  const hasLeft = node.left != null;
  const hasRight = node.right != null;
  const hasChildren = hasLeft || hasRight;
  const isCollapsed = collapsed.has(node.id);
  const isHighlighted = searchQuery && matchesSearch(node);

  const countTeam = (n: any): number => {
    if (!n) return 0;
    return 1 + countTeam(n.left) + countTeam(n.right);
  };
  const leftCount = hasLeft ? countTeam(node.left) - 1 : 0;
  const rightCount = hasRight ? countTeam(node.right) - 1 : 0;

  const joinDate = node.createdAt
    ? new Date(node.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const isTreeRoot = isRoot && node.parentId == null;

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex flex-col items-center rounded-lg border border-slate-200 bg-white px-4 py-3 transition-all ${
          isHighlighted ? "scale-110 shadow-lg ring-2 ring-gold" : "shadow-sm"
        }`}
      >
        <PersonAvatar size={60} isActive={node.isActive} />

        <p className="mt-2 text-xs font-bold text-slate-800">
          {node.referralCode}
        </p>

        {isTreeRoot ? (
          <>
            <p className="text-[11px] text-slate-500">
              {node.parentId
                ? `Parent: ${node.parentId}`
                : ""}
            </p>
            <p className="text-[11px] text-slate-500">
              (L:{leftCount},R:{rightCount})
            </p>
          </>
        ) : (
          <>
            <p className="max-w-[120px] text-center text-[11px] text-slate-500">
              {node.name} ({joinDate})
            </p>
            <p className="text-[11px] text-slate-500">
              (L:{leftCount},R:{rightCount})
            </p>
          </>
        )}

        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(node.id);
            }}
            className="mt-1 text-[10px] font-bold text-emerald underline hover:text-emerald/80"
          >
            {isCollapsed ? "+ expand" : "− collapse"}
          </button>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div className="relative mt-0">
          <div className="absolute left-1/2 top-0 h-5 w-px bg-slate-300" />
          <div
            className="absolute top-5 h-px bg-slate-300"
            style={{
              left: hasLeft ? "25%" : "50%",
              right: hasRight ? "25%" : "50%",
            }}
          />

          <div className="flex gap-8 pt-5 sm:gap-14">
            <div className="relative flex flex-1 flex-col items-center">
              <div className="absolute h-5 w-px bg-slate-300" />
              {node.left ? (
                <TreeNode
                  node={node.left}
                  collapsed={collapsed}
                  toggleCollapse={toggleCollapse}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                  matchesSearch={matchesSearch}
                />
              ) : (
                <div className="flex flex-col items-center">
                  <EmptyAvatar size={60} />
                  <p className="mt-1 text-[11px] font-semibold text-blue-500">
                    Join Now
                  </p>
                </div>
              )}
            </div>

            <div className="relative flex flex-1 flex-col items-center">
              <div className="absolute h-5 w-px bg-slate-300" />
              {node.right ? (
                <TreeNode
                  node={node.right}
                  collapsed={collapsed}
                  toggleCollapse={toggleCollapse}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                  matchesSearch={matchesSearch}
                />
              ) : (
                <div className="flex flex-col items-center">
                  <EmptyAvatar size={60} />
                  <p className="mt-1 text-[11px] font-semibold text-blue-500">
                    Join Now
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasChildren && isCollapsed && (
        <div
          className="mt-2 cursor-pointer text-[10px] font-semibold text-emerald/70 underline hover:text-emerald"
          onClick={() => toggleCollapse(node.id)}
        >
          + click to expand
        </div>
      )}
    </div>
  );
}
