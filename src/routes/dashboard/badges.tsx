import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAchievements } from "../../functions/user/achievements";

export const Route = createFileRoute("/dashboard/badges")({
  component: BadgesPage,
});

function BadgesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAchievements()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-emerald/10" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded border border-gold/20 bg-cream" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">
          Achievement <span className="italic text-gold">Badges</span>
        </h1>
        <div className="text-right">
          <p className="font-display text-2xl text-gold">{data?.totalEarned || 0} / {data?.totalPossible || 0}</p>
          <p className="text-[10px] text-emerald/60">badges earned</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded border border-gold/20 bg-cream p-4">
        <div className="h-3 rounded-full bg-emerald/10">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-gold to-emerald transition-all"
            style={{ width: `${((data?.totalEarned || 0) / (data?.totalPossible || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.badges?.map((badge: any) => (
          <div
            key={badge.badge}
            className={`rounded border p-6 transition-all ${
              badge.earned
                ? "border-gold/40 bg-gold/5 shadow-sm"
                : "border-gold/10 bg-cream/50 opacity-50"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{badge.icon}</span>
              <div className="flex-1">
                <h3 className={`text-sm font-bold ${badge.earned ? "text-emerald" : "text-emerald/50"}`}>
                  {badge.title}
                </h3>
                <p className="mt-1 text-[10px] text-emerald/60">{badge.description}</p>
                {badge.earned && badge.earnedAt && (
                  <p className="mt-2 text-[10px] text-gold">
                    Earned {new Date(badge.earnedAt).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
              {badge.earned && (
                <span className="rounded bg-emerald/10 px-2 py-0.5 text-[10px] font-bold text-emerald">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
