import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users, pairs, income } from "../../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Rank thresholds ─────────────────────────────────────
const RANK_THRESHOLDS = {
  bronze: { min: 0, max: 9, label: "Bronze" },
  silver: { min: 10, max: 49, label: "Silver" },
  gold: { min: 50, max: 199, label: "Gold" },
  platinum: { min: 200, max: Infinity, label: "Platinum" },
} as const;

function calculateRank(teamSize: number): "bronze" | "silver" | "gold" | "platinum" {
  if (teamSize >= 200) return "platinum";
  if (teamSize >= 50) return "gold";
  if (teamSize >= 10) return "silver";
  return "bronze";
}

// ── Count total team size (one query, in-memory walk) ───
// Was an N+1 recursion: one SQL round-trip per team member, serially.
// With neon-http each query is an HTTP request to Neon, so large teams
// hung getRankInfo for minutes (profile page stuck on skeleton).
async function countTeamSize(rootId: number): Promise<number> {
  const all = await db
    .select({ id: users.id, parentId: users.parentId })
    .from(users);

  const children = new Map<number, number[]>();
  for (const u of all) {
    if (u.parentId == null) continue;
    const list = children.get(u.parentId);
    if (list) list.push(u.id);
    else children.set(u.parentId, [u.id]);
  }

  let total = 0;
  const seen = new Set<number>([rootId]);
  const queue: number[] = [rootId];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    for (const child of children.get(cur) ?? []) {
      if (seen.has(child)) continue; // cycle guard
      seen.add(child);
      total++;
      queue.push(child);
    }
  }
  return total;
}

// ── Calculate and set rank ──────────────────────────────
export async function calculateAndSetRank(userId: number): Promise<string> {
  const teamSize = await countTeamSize(userId);
  const newRank = calculateRank(teamSize);

  await db.update(users).set({ rank: newRank }).where(eq(users.id, userId));
  return newRank;
}

// ── Get rank info ───────────────────────────────────────
export const getRankInfo = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    // Get current user
    const result = await db
      .select({ rank: users.rank })
      .from(users)
      .where(eq(users.id, userId));

    if (result.length === 0) throw new Error("User not found");

    const currentRank = result[0]!.rank || "bronze";
    const teamSize = await countTeamSize(userId);

    // Find current and next rank info
    const ranks = ["bronze", "silver", "gold", "platinum"];
    const currentIndex = ranks.indexOf(currentRank);
    const nextRank = currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : null;

    const currentThreshold = RANK_THRESHOLDS[currentRank as keyof typeof RANK_THRESHOLDS];
    const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank as keyof typeof RANK_THRESHOLDS] : null;

    // Calculate progress
    let progress = 100;
    if (nextThreshold) {
      const range = nextThreshold.min - currentThreshold.min;
      const progressInRank = teamSize - currentThreshold.min;
      progress = Math.min(100, Math.floor((progressInRank / range) * 100));
    }

    return {
      currentRank,
      currentRankLabel: currentThreshold.label,
      nextRank: nextRank || null,
      nextRankLabel: nextThreshold?.label || null,
      teamSize,
      progress,
      threshold: currentThreshold.min,
      nextThreshold: nextThreshold?.min || null,
    };
  });
