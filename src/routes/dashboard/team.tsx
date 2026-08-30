import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getTeam } from "@/functions/user/team";

export const Route = createFileRoute("/dashboard/team")({
  component: TeamPage,
});

function TeamPage() {
  const [tree, setTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeam()
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
        My <span className="italic text-gold">Team</span>
      </h1>
      <p className="text-xs text-emerald/50">
        Your binary tree structure — left and right legs.
      </p>

      {tree ? (
        <div className="overflow-x-auto rounded border border-gold/20 bg-cream p-6">
          <TreeNode node={tree} depth={0} />
        </div>
      ) : (
        <div className="rounded border border-gold/20 bg-cream p-12 text-center">
          <p className="text-xs text-emerald/40">No team data yet. Share your referral code to start building!</p>
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, depth }: { node: any; depth: number }) {
  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <div className="rounded border border-dashed border-gold/20 bg-cream/50 px-4 py-3 text-center">
          <p className="text-[10px] text-emerald/30">Empty</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={`rounded border px-4 py-3 text-center transition-colors ${
          node.isActive
            ? "border-emerald/30 bg-emerald/5"
            : "border-gold/20 bg-cream"
        }`}
      >
        <p className="text-xs font-semibold">{node.name}</p>
        <p className="text-[10px] text-emerald/50">{node.referralCode}</p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase ${
              node.isActive ? "bg-emerald/10 text-emerald" : "bg-red-50 text-red-600"
            }`}
          >
            {node.isActive ? "Active" : "Inactive"}
          </span>
          {node.position && (
            <span className="text-[8px] uppercase text-emerald/40">{node.position}</span>
          )}
        </div>
      </div>

      {(node.left || node.right) && (
        <div className="relative mt-4 flex gap-8">
          <div className="absolute -top-4 left-1/2 h-4 w-px bg-gold/30" />
          <div className="absolute -top-4 left-[25%] right-[25%] h-px bg-gold/30" />

          <div className="flex flex-col items-center">
            <div className="h-4 w-px bg-gold/30" />
            <p className="mb-1 text-[8px] uppercase text-emerald/40">Left</p>
            <TreeNode node={node.left} depth={depth + 1} />
          </div>

          <div className="flex flex-col items-center">
            <div className="h-4 w-px bg-gold/30" />
            <p className="mb-1 text-[8px] uppercase text-emerald/40">Right</p>
            <TreeNode node={node.right} depth={depth + 1} />
          </div>
        </div>
      )}
    </div>
  );
}
