import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getTreeVisualization } from "../../functions/user/tree";
import { BinaryTreePanel } from "../../components/network/BinaryTreePanel";

export const Route = createFileRoute("/dashboard/tree")({
  component: DashboardTreePage,
});

function DashboardTreePage() {
  const [tree, setTree] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTreeVisualization()
      .then((treeData) => setTree(treeData.tree))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="h-96 animate-pulse rounded border border-gold/20 bg-background" />
      </div>
    );
  }

  // Shared fixed-window tree — same behavior as /dashboard/network and
  // /admin/tree: 3-level window, tap a box to re-anchor, Up/Top bar.
  return (
    <div className="space-y-4">
      <BinaryTreePanel tree={tree} emptyMessage="No organization data yet." />
    </div>
  );
}
