import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
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

// ── Mark onboarding done ───────────────────────────────
export const completeOnboarding = createServerFn({ method: "POST" })
  .handler(async () => {
    const userId = await getAuthUserId();
    await db.update(users).set({ onboardingDone: true }).where(eq(users.id, userId));
    return { success: true };
  });

// ── Get onboarding status ──────────────────────────────
export const getOnboardingStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const result = await db.select({ onboardingDone: users.onboardingDone }).from(users).where(eq(users.id, userId));
    return { done: result[0]?.onboardingDone ?? false };
  });

// ── Toggle dark mode ───────────────────────────────────
export const toggleDarkMode = createServerFn({ method: "POST" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const result = await db.select({ darkMode: users.darkMode }).from(users).where(eq(users.id, userId));
    const newMode = !(result[0]?.darkMode ?? false);
    await db.update(users).set({ darkMode: newMode }).where(eq(users.id, userId));
    return { darkMode: newMode };
  });

// ── Get dark mode status ───────────────────────────────
export const getDarkMode = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const result = await db.select({ darkMode: users.darkMode }).from(users).where(eq(users.id, userId));
    return { darkMode: result[0]?.darkMode ?? false };
  });

// ── Get activity feed ──────────────────────────────────
export const getActivityFeed = createServerFn({ method: "GET" })
  .handler(async () => {
    // Get recent signups
    const recentSignups = await db
      .select({ id: users.id, name: users.name, referralCode: users.referralCode, position: users.position, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(10);

    // Get recent pairs
    const { pairs } = await import("../../lib/db/schema");
    const recentPairs = await db
      .select({
        id: pairs.id,
        userId: pairs.userId,
        createdAt: pairs.createdAt,
        leftCode: sql<string>`(SELECT referral_code FROM users WHERE id = ${pairs.leftUserId})`,
        rightCode: sql<string>`(SELECT referral_code FROM users WHERE id = ${pairs.rightUserId})`,
      })
      .from(pairs)
      .orderBy(sql`${pairs.createdAt} DESC`)
      .limit(10);

    // Get recent income
    const { income } = await import("../../lib/db/schema");
    const recentIncome = await db
      .select({
        id: income.id,
        userId: income.userId,
        type: income.type,
        amount: income.amount,
        description: income.description,
        createdAt: income.createdAt,
        userName: sql<string>`(SELECT name FROM users WHERE id = ${income.userId})`,
        userCode: sql<string>`(SELECT referral_code FROM users WHERE id = ${income.userId})`,
      })
      .from(income)
      .orderBy(sql`${income.createdAt} DESC`)
      .limit(10);

    return { recentSignups, recentPairs, recentIncome };
  });
