import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getLeaderboard } from "../../functions/user/leaderboard";

export const Route = createFileRoute("/dashboard/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"all" | "week" | "month">("all");

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const d = await getLeaderboard({ data: { period } });
      setLeaderboard(d.leaderboard || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const rankColors: Record<string, string> = {
    bronze: "bg-orange-100 text-orange-700",
    silver: "bg-gray-100 text-gray-700",
    gold: "bg-yellow-100 text-yellow-700",
    platinum: "bg-purple-100 text-purple-700",
  };

  const medalIcons = ["🥇", "🥈", "🥉"];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">
            Top <span className="italic text-gold">Performers</span>
          </h1>
          <p className="text-xs text-emerald/70">
            Leaderboard ranked by total matching pairs earned.
          </p>
        </div>
        <div className="flex rounded border border-gold/20 bg-cream overflow-hidden">
          {(["all", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all ${
                period === p ? "bg-emerald text-cream" : "text-emerald/60 hover:bg-emerald/5"
              }`}
            >
              {p === "all" ? "All Time" : p === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="rounded border border-gold/20 bg-cream p-12 text-center">
          <p className="text-4xl">🏆</p>
          <p className="mt-4 text-xs text-emerald/60">No data yet. Start building your team!</p>
        </div>
      ) : (
        <div className="rounded border border-gold/20 bg-cream">
          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="flex items-end justify-center gap-4 border-b border-gold/10 px-6 py-8">
              {/* 2nd */}
              <div className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100 text-2xl">
                  {leaderboard[1]?.name?.charAt(0)}
                </div>
                <p className="mt-2 text-xs font-bold">{leaderboard[1]?.name}</p>
                <p className="text-[10px] text-emerald/60">{leaderboard[1]?.totalPairs} pairs</p>
                <div className="mt-1 h-16 w-16 rounded-t bg-gray-200" />
                <span className="text-lg">🥈</span>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-gold/10 text-3xl">
                  {leaderboard[0]?.name?.charAt(0)}
                </div>
                <p className="mt-2 text-sm font-bold">{leaderboard[0]?.name}</p>
                <p className="text-[10px] text-emerald/60">{leaderboard[0]?.totalPairs} pairs</p>
                <div className="mt-1 h-20 w-20 rounded-t bg-gold/20" />
                <span className="text-2xl">🥇</span>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange-300 bg-orange-100 text-xl">
                  {leaderboard[2]?.name?.charAt(0)}
                </div>
                <p className="mt-2 text-xs font-bold">{leaderboard[2]?.name}</p>
                <p className="text-[10px] text-emerald/60">{leaderboard[2]?.totalPairs} pairs</p>
                <div className="mt-1 h-12 w-12 rounded-t bg-orange-100" />
                <span className="text-lg">🥉</span>
              </div>
            </div>
          )}

          {/* Full List */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gold/10 text-[10px] uppercase tracking-widest text-emerald/70">
                  <th className="px-6 py-3 text-left">Rank</th>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Code</th>
                  <th className="px-6 py-3 text-left">Level</th>
                  <th className="px-6 py-3 text-right">Pairs</th>
                  <th className="px-6 py-3 text-right">Earned</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={entry.id} className="border-b border-gold/5 transition-colors hover:bg-gold/5">
                    <td className="px-6 py-3">
                      <span className="text-sm">{medalIcons[i] || `#${i + 1}`}</span>
                    </td>
                    <td className="px-6 py-3 text-xs font-semibold">{entry.name}</td>
                    <td className="px-6 py-3 text-[10px] text-emerald/70">{entry.referralCode}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${rankColors[entry.rank] || "bg-gray-100 text-gray-700"}`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-xs font-semibold text-gold">{entry.totalPairs}</td>
                    <td className="px-6 py-3 text-right text-xs text-emerald">₹{(entry.totalEarned || 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
