type TreeNodeData = {
  id: number;
  name: string;
  referralCode: string;
  isActive: boolean;
  rank: string;
  position: string | null;
  parentId: number | null;
  createdAt: Date | null;
  left: TreeNodeData | null;
  right: TreeNodeData | null;
};

type Props = {
  node: TreeNodeData | null;
  isRoot?: boolean;
  collapsed: Set<number>;
  toggleCollapse: (id: number) => void;
  searchQuery?: string;
};

/* ── Person SVG Avatar ── */
function PersonAvatar({ size = 56, isActive = true }: { size?: number; isActive?: boolean }) {
  const color = isActive ? "#16a34a" : "#dc2626"; // green = active, red = inactive
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill={color} />
      <circle cx="28" cy="22" r="8" fill="white" opacity="0.9" />
      <ellipse cx="28" cy="42" rx="14" ry="10" fill="white" opacity="0.9" />
    </svg>
  );
}

function EmptyAvatar({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill="#3b82f6" />
      <circle cx="28" cy="22" r="8" fill="white" opacity="0.9" />
      <ellipse cx="28" cy="42" rx="14" ry="10" fill="white" opacity="0.9" />
    </svg>
  );
}

/* ── Count team size recursively ── */
function countTeam(n: TreeNodeData | null): number {
  if (!n) return 0;
  return 1 + countTeam(n.left) + countTeam(n.right);
}

export function NetTreeNode({ node, isRoot, collapsed, toggleCollapse, searchQuery }: Props) {
  // Empty slot
  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <EmptyAvatar size={56} />
        <p className="mt-1 text-[11px] font-semibold text-blue-500">Join Now</p>
      </div>
    );
  }

  const hasLeft = node.left != null;
  const hasRight = node.right != null;
  const hasChildren = hasLeft || hasRight;
  const isCollapsed = collapsed.has(node.id);

  const leftCount = hasLeft ? countTeam(node.left) - 1 : 0;
  const rightCount = hasRight ? countTeam(node.right) - 1 : 0;

  const joinDate = node.createdAt
    ? new Date(node.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const isHighlighted = searchQuery && (
    node.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.referralCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(node.id).includes(searchQuery)
  );

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div className={`flex flex-col items-center rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all ${isRoot ? "ring-2 ring-gold/30" : ""} ${isHighlighted ? "scale-110 shadow-lg ring-2 ring-gold" : ""}`}>
        <PersonAvatar size={56} isActive={node.isActive} />
        <p className="mt-1.5 text-[11px] font-mono font-bold text-slate-800">{node.referralCode}</p>
        <p className="max-w-[110px] truncate text-center text-[10px] text-slate-500">{node.name}</p>
        <p className="text-[9px] text-slate-400">({joinDate})</p>
        <p className="text-[9px] font-semibold text-slate-600">(L:{leftCount},R:{rightCount})</p>
      </div>

      {/* Children with connecting lines */}
      {hasChildren && !isCollapsed && (
        <div className="relative mt-0">
          <div className="absolute left-1/2 top-0 h-4 w-px bg-slate-300" />
          {(hasLeft || hasRight) && (
            <div className="absolute top-4 h-px bg-slate-300" style={{ left: hasLeft ? "25%" : "50%", right: hasRight ? "25%" : "50%" }} />
          )}

          <div className="flex gap-6 pt-4 sm:gap-10">
            <div className="relative flex flex-1 flex-col items-center">
              <div className="absolute h-4 w-px bg-slate-300" style={{ left: "50%" }} />
              <NetTreeNode node={node.left} collapsed={collapsed} toggleCollapse={toggleCollapse} searchQuery={searchQuery} />
            </div>
            <div className="relative flex flex-1 flex-col items-center">
              <div className="absolute h-4 w-px bg-slate-300" style={{ left: "50%" }} />
              <NetTreeNode node={node.right} collapsed={collapsed} toggleCollapse={toggleCollapse} searchQuery={searchQuery} />
            </div>
          </div>
        </div>
      )}

      {/* Expand/collapse */}
      {hasChildren && (
        <button
          onClick={() => toggleCollapse(node.id)}
          className="mt-2 text-[10px] font-bold text-emerald underline hover:text-emerald/80"
        >
          {isCollapsed ? "+ expand" : "− collapse"}
        </button>
      )}
    </div>
  );
}
