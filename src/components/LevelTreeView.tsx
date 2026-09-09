import { useState } from "react";

type LevelUser = {
  id: number;
  name: string;
  referralCode: string;
  isActive: boolean;
  rank: string;
  position: string | null;
  parentId: number | null;
};

const rankColors: Record<string, string> = {
  bronze: "bg-amber-50 text-amber-700 ring-amber-200",
  silver: "bg-slate-50 text-slate-600 ring-slate-200",
  gold: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  platinum: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function LevelTreeView({ levels, rootId }: { levels: LevelUser[][]; rootId: number }) {
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([0]));

  const toggleLevel = (level: number) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  if (!levels || levels.length === 0) {
    return (
      <div className="rounded-lg border border-gold/15 bg-card p-12 text-center">
        <p className="text-4xl">🌳</p>
        <p className="mt-3 text-xs text-emerald/60">No team data yet. Share your referral code to start building!</p>
      </div>
    );
  }

  const totalMembers = levels.reduce((sum, level) => sum + level.length, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-emerald/10 px-3 py-1 text-[10px] font-semibold text-emerald">
          {totalMembers} total members
        </span>
        <span className="rounded-full bg-gold/10 px-3 py-1 text-[10px] font-semibold text-gold">
          {levels.length} levels deep
        </span>
      </div>

      {/* Levels */}
      {levels.map((levelUsers, levelIdx) => {
        const isExpanded = expandedLevels.has(levelIdx);
        const activeCount = levelUsers.filter((u) => u.isActive).length;

        return (
          <div key={levelIdx} className="rounded-lg border border-gold/15 bg-card overflow-hidden">
            {/* Level Header */}
            <button
              onClick={() => toggleLevel(levelIdx)}
              className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gold/5"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                  levelIdx === 0 ? "bg-gold text-cream" : "bg-emerald/10 text-emerald"
                }`}>
                  L{levelIdx}
                </span>
                <div className="text-left">
                  <p className="text-xs font-semibold">
                    Level {levelIdx === 0 ? "0 (You)" : levelIdx}
                  </p>
                  <p className="text-[10px] text-emerald/60">
                    {levelUsers.length} member{levelUsers.length !== 1 ? "s" : ""}
                    {levelIdx > 0 && ` · ${activeCount} active`}
                  </p>
                </div>
              </div>
              <svg
                className={`h-4 w-4 text-emerald/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
              </svg>
            </button>

            {/* Members Grid */}
            {isExpanded && (
              <div className="border-t border-gold/10 px-4 py-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {levelUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                        user.id === rootId
                          ? "border-gold/40 bg-gradient-to-b from-gold/8 to-gold/3 ring-1 ring-gold/15"
                          : user.isActive
                            ? "border-emerald/20 bg-emerald/[0.03] hover:border-emerald/35 hover:shadow-sm"
                            : "border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ${
                        user.id === rootId
                          ? "bg-gold/20 text-gold ring-gold/30"
                          : "bg-gradient-to-br from-emerald/10 to-emerald/5 text-emerald ring-emerald/15"
                      }`}>
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{user.name}</p>
                        <div className="flex items-center gap-1.5">
                          <code className="text-[9px] font-mono text-emerald/50">{user.referralCode}</code>
                          {user.position && (
                            <span className="text-[9px] text-emerald/40">
                              {user.position === "left" ? "←L" : "→R"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[7px] font-semibold ${
                          user.isActive ? "bg-emerald/10 text-emerald-700" : "bg-destructive/10 text-red-500"
                        }`}>
                          <span className={`mr-0.5 h-1 w-1 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-red-400"}`} />
                          {user.isActive ? "Active" : "Inact"}
                        </span>
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-semibold ring-1 ring-inset ${
                          rankColors[user.rank] || "bg-slate-50 text-slate-600 ring-slate-200"
                        }`}>
                          {user.rank}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
