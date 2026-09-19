type TreeNodeData = {
  id: number;
  name: string;
  referralCode: string;
  isActive: boolean;
  rank: string;
  position: string | null;
  createdAt: Date | null;
  left: TreeNodeData | null;
  right: TreeNodeData | null;
};

type Props = {
  node: TreeNodeData | null;
  isRoot?: boolean;
  collapsed: Set<number>;
  toggleCollapse: (id: number) => void;
};

export function NetTreeNode({ node, isRoot, collapsed, toggleCollapse }: Props) {
  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <div className="flex h-28 w-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-blue-50">
          <svg className="h-8 w-8 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <p className="mt-1 text-xs font-semibold text-blue-500">Join Now</p>
        </div>
      </div>
    );
  }

  const hasLeft = node.left != null;
  const hasRight = node.right != null;
  const hasChildren = hasLeft || hasRight;
  const isCollapsed = collapsed.has(node.id);

  // Green = active+registered, Red = registered but not activated
  const statusColor = node.isActive
    ? { border: "border-emerald-500", bg: "bg-emerald-50", iconBg: "bg-emerald-500", ring: "ring-emerald-200" }
    : { border: "border-red-500", bg: "bg-red-50", iconBg: "bg-red-500", ring: "ring-red-200" };

  const regDate = node.createdAt
    ? new Date(node.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : "N/A";

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        className={`relative flex w-36 flex-col items-center rounded-lg border-2 ${statusColor.border} ${statusColor.bg} p-3 shadow-sm transition-all hover:shadow-md ${isRoot ? "ring-2 ring-gold/30" : ""}`}
      >
        {isRoot && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream shadow">
            You
          </span>
        )}

        {/* Avatar */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${statusColor.iconBg} text-lg font-bold text-white shadow`}>
          {node.name?.charAt(0)?.toUpperCase()}
        </div>

        {/* Info */}
        <p className="mt-2 text-center text-[10px] font-mono text-emerald/60">{node.referralCode}</p>
        <p className="mt-0.5 text-center text-xs font-bold leading-tight text-slate-800">{node.name}</p>
        <p className="mt-1 text-[10px] text-slate-500">{regDate}</p>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="relative mt-2">
          {/* Vertical line from parent */}
          <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-px bg-slate-300" />

          {/* Horizontal connector */}
          {hasLeft && hasRight && (
            <div className="absolute left-[25%] right-[25%] top-4 h-px bg-slate-300" />
          )}
          {!hasLeft && hasRight && (
            <div className="absolute left-1/2 right-[25%] top-4 h-px bg-slate-300" />
          )}
          {hasLeft && !hasRight && (
            <div className="absolute left-[25%] right-1/2 top-4 h-px bg-slate-300" />
          )}

          <div className="flex gap-6 pt-4 sm:gap-10">
            {/* Left */}
            <div className="relative flex flex-1 flex-col items-center">
              <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-px bg-slate-300" />
              <span className="mb-2 rounded bg-emerald/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Left</span>
              <NetTreeNode node={node.left} collapsed={collapsed} toggleCollapse={toggleCollapse} />
            </div>

            {/* Right */}
            <div className="relative flex flex-1 flex-col items-center">
              <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-px bg-slate-300" />
              <span className="mb-2 rounded bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase text-gold-700">Right</span>
              <NetTreeNode node={node.right} collapsed={collapsed} toggleCollapse={toggleCollapse} />
            </div>
          </div>
        </div>
      )}

      {/* Expand/Collapse button */}
      {hasChildren && (
        <button
          onClick={() => toggleCollapse(node.id)}
          className={`mt-3 rounded-full border-2 px-4 py-1 text-xs font-semibold transition-all ${
            isCollapsed
              ? "border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600"
              : "border-gold/40 bg-gold text-cream hover:bg-gold/80"
          }`}
        >
          {isCollapsed ? "Expand" : "Collapse"}
        </button>
      )}
    </div>
  );
}
