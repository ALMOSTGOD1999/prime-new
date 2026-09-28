import { useState, useRef, useCallback } from "react";
import { NetTreeNode, WINDOW_LEVELS } from "./NetTreeNode";

/**
 * Shared fixed-window binary tree panel used by /dashboard/network,
 * /dashboard/tree and /admin/tree so all three show the SAME behavior:
 * a WINDOW_LEVELS-tall window anchored on one user, tap any downline box
 * with a downline to re-anchor the window to that user's family, and an
 * Up/Top bar whenever we are not at the root.
 */
type Props = {
  tree: any;
  /** Empty-state copy when there is no tree at all. */
  emptyMessage?: string;
};

export function BinaryTreePanel({ tree, emptyMessage = "No team data yet. Share your referral code to start building!" }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  // Fixed window: the anchor user's card sits on top with exactly
  // WINDOW_LEVELS-1 tiers of two downline slots below. Tapping a box that has
  // a downline re-anchors the window to that user — the skeleton stays
  // identical, only the users change — so a full expanded tree is never
  // needed on mobile.
  const [anchorId, setAnchorId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  // Drag-vs-tap guard: pan gestures must not trigger a box re-anchor.
  const dragMovedRef = useRef(false);
  const dragOriginRef = useRef({ x: 0, y: 0 });

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

  return (
    <div className="space-y-4">
      {/* Search only — header controls removed per request */}
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

      {/* Fixed window bar — visible whenever we are not anchored at the root */}
      {anchor && anchor.depth > 0 && (
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

      {tree ? (
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
            <NetTreeNode node={anchor?.node ?? tree} isRoot={(anchor?.depth ?? 0) === 0} onToggle={handleToggle} searchQuery={searchQuery} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gold/15 bg-card p-12 text-center">
          <p className="text-4xl">🌳</p>
          <p className="mt-3 text-xs text-emerald/60">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
