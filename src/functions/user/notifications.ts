import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { notifications } from "../../lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Create notification (internal helper) ───────────────
export async function createNotification(
  userId: number,
  type: "referral" | "pair_match" | "commission" | "award" | "withdrawal" | "kyc" | "rank" | "general",
  title: string,
  message: string,
) {
  await db.insert(notifications).values({ userId, type, title, message });
}

// ── Get notifications ───────────────────────────────────
export const getNotifications = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return {
      notifications: result,
      unreadCount: unreadResult[0]?.count ?? 0,
    };
  });

// ── Mark notification as read ───────────────────────────
export const markNotificationRead = createServerFn({ method: "POST" })
  .validator((data: { notificationId: number }) => data)
  .handler(async ({ data }) => {
    const userId = await getAuthUserId();

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, data.notificationId), eq(notifications.userId, userId)));

    return { success: true };
  });

// ── Mark all as read ────────────────────────────────────
export const markAllRead = createServerFn({ method: "POST" })
  .handler(async () => {
    const userId = await getAuthUserId();

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return { success: true };
  });
