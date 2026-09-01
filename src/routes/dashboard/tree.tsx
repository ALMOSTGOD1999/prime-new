import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getTreeVisualization } from "../../functions/user/tree";

export const Route = createFileRoute("/dashboard/tree")({
  component: TreePage,
});

function TreePage() {
  const [tree, setTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTreeVisualization()
      .then((d) => setTree(d.tree))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        My <span className="italic text-gold">Tree</span>
      </h1>
      <p className="text-xs text-emerald/70">
        Visual binary tree — 3 levels deep from your position.
      </p>

      {tree ? (
        <div className="overflow-x-auto rounded border border-gold/20 bg-cream p-6">
          <VisualTree node={tree} isRoot={true} />
        </div>
      ) : (
        <div className="rounded border border-gold/20 bg-cream p-12 text-center">
          <p className="text-4xl">🌳</p>
          <p className="mt-4 text-xs text-emerald/60">No team data yet. Share your referral code to start building!</p>
        </div>
      )}
    </div>
  );
}

function VisualTree({ node, isRoot }: { node: any; isRoot?: boolean }) {
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
      {/* Node */}
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
            You
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

      {/* Children */}
      {(node.left || node.right) && (
        <div className="relative mt-6">
          {/* Vertical line down */}
          <div className="absolute left-1/2 top-0 h-6 w-px bg-gold/30" />
          {/* Horizontal line */}
          <div className="absolute left-0 right-0 top-6 h-px bg-gold/30" />

          <div className="flex gap-16 pt-6">
            {/* Left */}
            <div className="flex flex-col items-center">
              <div className="absolute h-6 w-px bg-gold/30" style={{ left: "25%" }} />
              <span className="mb-2 rounded bg-emerald/10 px-2 py-0.5 text-[8px] font-bold uppercase text-emerald">
                Left Leg
              </span>
              <VisualTree node={node.left} />
            </div>

            {/* Right */}
            <div className="flex flex-col items-center">
              <div className="absolute h-6 w-px bg-gold/30" style={{ left: "75%" }} />
              <span className="mb-2 rounded bg-gold/10 px-2 py-0.5 text-[8px] font-bold uppercase text-gold">
                Right Leg
              </span>
              <VisualTree node={node.right} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
