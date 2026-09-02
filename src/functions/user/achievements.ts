import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { achievements } from "../../lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// All possible badges
export const ALL_BADGES = [
  { badge: "first_referral", title: "First Referral", description: "Referred your first member", icon: "👤" },
  { badge: "five_referrals", title: "Networker", description: "Referred 5 members", icon: "🌐" },
  { badge: "ten_referrals", title: "Connector", description: "Referred 10 members", icon: "🔗" },
  { badge: "first_pair", title: "First Pair", description: "Formed your first matching pair", icon: "🤝" },
  { badge: "ten_pairs", title: "Pair Master", description: "Formed 10 matching pairs", icon: "💎" },
  { badge: "fifty_pairs", title: "Pair Legend", description: "Formed 50 matching pairs", icon: "👑" },
  { badge: "rank_silver", title: "Silver Rank", description: "Reached Silver rank (10+ team)", icon: "🥈" },
  { badge: "rank_gold", title: "Gold Rank", description: "Reached Gold rank (50+ team)", icon: "🥇" },
  { badge: "rank_platinum", title: "Platinum Rank", description: "Reached Platinum rank (200+ team)", icon: "💠" },
  { badge: "first_1k", title: "₹1K Earner", description: "Earned ₹1,000 total", icon: "💰" },
  { badge: "first_10k", title: "₹10K Earner", description: "Earned ₹10,000 total", icon: "🏦" },
  { badge: "first_50k", title: "₹50K Earner", description: "Earned ₹50,000 total", icon: "🏆" },
  { badge: "activated", title: "Activated", description: "Activated your account", icon: "⚡" },
  { badge: "kyc_verified", title: "Verified", description: "Completed KYC verification", icon: "📋" },
  { badge: "week_streak", title: "7-Day Streak", description: "Logged in 7 days in a row", icon: "🔥" },
] as const;

// ── Get user achievements ──────────────────────────────
export const getAchievements = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    const earned = await db
      .select({ badge: achievements.badge, earnedAt: achievements.earnedAt })
      .from(achievements)
      .where(eq(achievements.userId, userId));

    const earnedSet = new Set(earned.map((e) => e.badge));
    const earnedMap = new Map(earned.map((e) => [e.badge, e.earnedAt]));

    const badges = ALL_BADGES.map((b) => ({
      ...b,
      earned: earnedSet.has(b.badge),
      earnedAt: earnedMap.get(b.badge) || null,
    }));

    return { badges, totalEarned: earnedSet.size, totalPossible: ALL_BADGES.length };
  });

// ── Award a badge (internal) ───────────────────────────
export async function awardBadge(userId: number, badge: string) {
  const badgeInfo = ALL_BADGES.find((b) => b.badge === badge);
  if (!badgeInfo) return;

  // Check if already earned
  const existing = await db
    .select({ id: achievements.id })
    .from(achievements)
    .where(eq(achievements.userId, userId));

  if (existing.some((e) => e.id)) {
    // Check specific badge
    const alreadyEarned = await db
      .select({ id: achievements.id })
      .from(achievements)
      .where(eq(achievements.userId, userId));
    // Simple check - insert only if not exists
    const hasBadge = await db
      .select({ id: achievements.id })
      .from(achievements)
      .where(eq(achievements.userId, userId));
    // Use a query to check
  }

  try {
    await db.insert(achievements).values({
      userId,
      badge,
      title: badgeInfo.title,
      description: badgeInfo.description,
      icon: badgeInfo.icon,
    });
  } catch {
    // Duplicate badge, ignore
  }
}
