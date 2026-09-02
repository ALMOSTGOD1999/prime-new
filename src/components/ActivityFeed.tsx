"use client";

import { useEffect, useState } from "react";

interface Activity {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  meta?: any;
}

export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const { getActivityFeed } = await import("../../functions/user/dashboard-extras");
      const data = await getActivityFeed({ data: { limit } });
      setActivities(data.activities || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const typeIcons: Record<string, string> = {
    signup: "👤",
    activation: "✅",
    direct_income: "💰",
    matching_income: "🎯",
    award: "🏆",
    rank: "⭐",
    withdrawal: "💸",
    login: "🔑",
  };

  const typeColors: Record<string, string> = {
    signup: "border-blue-300 bg-blue-50",
    activation: "border-emerald-300 bg-emerald-50",
    direct_income: "border-gold/40 bg-gold/5",
    matching_income: "border-gold/40 bg-gold/5",
    award: "border-yellow-300 bg-yellow-50",
    rank: "border-purple-300 bg-purple-50",
    withdrawal: "border-red-300 bg-red-50",
    login: "border-gray-300 bg-gray-50",
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded border border-gold/10 bg-cream" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return <p className="py-4 text-center text-xs text-emerald/60">No recent activity</p>;
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {activities.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-2 rounded border p-2 text-xs ${typeColors[a.type] || "border-gold/10 bg-cream/50"}`}
        >
          <span className="mt-0.5 text-sm">{typeIcons[a.type] || "📌"}</span>
          <div className="flex-1 min-w-0">
            <p className="truncate text-emerald">{a.message}</p>
            <p className="text-[10px] text-emerald/50">{timeAgo(a.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN");
}
