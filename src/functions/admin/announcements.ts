import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { announcements, notifications, users } from "../../lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAdminId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  const userId = payload["userId"] as number;
  const adminCheck = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  if (adminCheck.length === 0 || !adminCheck[0]!.isAdmin) throw new Error("Not authorized");
  return userId;
}

// ── Create announcement (admin) ────────────────────────
export const createAnnouncement = createServerFn({ method: "POST" })
  .validator((data: { title: string; message: string; priority?: "normal" | "important" | "urgent" }) => data)
  .handler(async ({ data }) => {
    const adminId = await getAdminId();

    const [announcement] = await db
      .insert(announcements)
      .values({
        title: data.title,
        message: data.message,
        priority: data.priority || "normal",
        createdBy: adminId,
      })
      .returning();

    // Send notification to all users
    const allUsers = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));

    if (allUsers.length > 0) {
      const notifValues = allUsers.map((u) => ({
        userId: u.id,
        type: "announcement" as const,
        title: data.title,
        message: data.message,
      }));
      // Batch insert in chunks of 100
      for (let i = 0; i < notifValues.length; i += 100) {
        await db.insert(notifications).values(notifValues.slice(i, i + 100));
      }
    }

    return { success: true, announcementId: announcement!.id, notifiedUsers: allUsers.length };
  });

// ── Get all announcements (admin) ──────────────────────
export const getAnnouncements = createServerFn({ method: "GET" })
  .handler(async () => {
    await getAdminId();

    const result = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt))
      .limit(50);

    return { announcements: result };
  });

// ── Delete announcement (admin) ────────────────────────
export const deleteAnnouncement = createServerFn({ method: "POST" })
  .validator((data: { announcementId: number }) => data)
  .handler(async ({ data }) => {
    await getAdminId();
    await db.delete(announcements).where(eq(announcements.id, data.announcementId));
    return { success: true };
  });
