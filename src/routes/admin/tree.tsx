import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { getTreeVisualization } from "../../functions/user/tree";

export const Route = createFileRoute("/admin/tree")({
  component: AdminTreePage,
});

function AdminTreePage() {
  const [tree, setTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTreeVisualization()
      .then((d) => setTree(d.tree))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.min(3, Math.max(0.1, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
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

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-96 animate-pulse rounded border border-gold/20 bg-cream" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">
            Full <span className="italic text-gold">Tree</span>
          </h1>
          <p className="text-xs text-emerald/70">
            Complete organization tree — scroll to zoom, drag to pan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="border border-gold/40 px-3 py-1 text-xs font-bold hover:bg-gold/10">+</button>
          <span className="text-xs text-emerald/60">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.2))} className="border border-gold/40 px-3 py-1 text-xs font-bold hover:bg-gold/10">−</button>
          <button onClick={resetView} className="border border-emerald/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest hover:bg-emerald/10">Reset</button>
        </div>
      </div>

      {tree ? (
        <div
          ref={containerRef}
          className="overflow-hidden rounded border border-gold/20 bg-cream"
          style={{ cursor: dragging ? "grabbing" : "grab", minHeight: "600px" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="origin-center p-8"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragging ? "none" : "transform 0.15s ease-out",
            }}
          >
            <VisualTreeNode node={tree} isRoot={true} />
          </div>
        </div>
      ) : (
        <div className="rounded border border-gold/20 bg-cream p-12 text-center">
          <p className="text-4xl">🌳</p>
          <p className="mt-4 text-xs text-emerald/60">No organization data yet.</p>
        </div>
      )}
    </div>
  );
}

function VisualTreeNode({ node, isRoot }: { node: any; isRoot?: boolean }) {
  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <div className="rounded-lg border-2 border-dashed border-gold/20 px-6 py-4 text-center">
          <p className="text-[10px] text-emerald/50">Empty</p>
        </div>
      </div>
    );
  }

  const rankBadges: Record<string, string> = {
    bronze: "bg-orange-100 text-orange-700",
    silver: "bg-gray-100 text-gray-700",
    gold: "bg-yellow-100 text-yellow-700",
    platinum: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative rounded-lg border-2 px-6 py-4 text-center transition-all ${
          isRoot
            ? "border-gold bg-gold/5 shadow-lg"
            : node.isActive
              ? "border-emerald/40 bg-emerald/5"
              : "border-gold/20 bg-cream"
        }`}
      >
        {isRoot && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-gold px-2 py-0.5 text-[8px] font-bold uppercase text-cream">
            Root
          </span>
        )}
        <p className="text-sm font-bold">{node.name}</p>
        <p className="text-[10px] text-emerald/60">{node.referralCode}</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[8px] font-bold uppercase ${
              node.isActive ? "bg-emerald/10 text-emerald" : "bg-red-50 text-red-600"
            }`}
          >
            {node.isActive ? "Active" : "Inactive"}
          </span>
          <span className={`rounded px-2 py-0.5 text-[8px] font-bold uppercase ${rankBadges[node.rank] || "bg-gray-100 text-gray-700"}`}>
            {node.rank}
          </span>
        </div>
      </div>

      {(node.left || node.right) && (
        <div className="relative mt-6">
          <div className="absolute left-1/2 top-0 h-6 w-px bg-gold/30" />
          <div className="absolute left-0 right-0 top-6 h-px bg-gold/30" />

          <div className="flex gap-16 pt-6">
            <div className="flex flex-col items-center">
              <div className="absolute h-6 w-px bg-gold/30" style={{ left: "25%" }} />
              <span className="mb-2 rounded bg-emerald/10 px-2 py-0.5 text-[8px] font-bold uppercase text-emerald">
                Left Leg
              </span>
              <VisualTreeNode node={node.left} />
            </div>

            <div className="flex flex-col items-center">
              <div className="absolute h-6 w-px bg-gold/30" style={{ left: "75%" }} />
              <span className="mb-2 rounded bg-gold/10 px-2 py-0.5 text-[8px] font-bold uppercase text-gold">
                Right Leg
              </span>
              <VisualTreeNode node={node.right} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
