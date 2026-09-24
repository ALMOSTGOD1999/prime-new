import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { activationPins, pinTransfers, users, wallet } from "../../lib/db/schema";
import { getCookie } from "@tanstack/react-start/server";
import { eq, and, desc, sql } from "drizzle-orm";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// ── Send a PIN to another user (admin or any user can send if they own it)
export const sendPin = createServerFn({ method: "POST" })
  .validator((data: { pin: string; toCode: string }) => data)
  .handler(async ({ data }) => {
    const fromUserId = await getAuthUserId();
    const pinStr = data.pin?.trim();
    const toCode = data.toCode?.trim().toUpperCase();
    if (!pinStr || !toCode) throw new Error("PIN and recipient code are required");

    // Find pin owned by sender and unused
    const pinRows = await db.select().from(activationPins).where(and(eq(activationPins.pin, pinStr), eq(activationPins.isUsed, false)));
    if (!pinRows.length) throw new Error("PIN not found or already used");
    const pin = pinRows[0]!;
    if (pin.ownerId !== fromUserId) throw new Error("You don't own this PIN");

    // Find recipient by referral code, email, or id
    let toUser: any = null;
    const byCode = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, toCode));
    if (byCode.length) toUser = byCode[0];
    else {
      const byEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, toCode));
      if (byEmail.length) toUser = byEmail[0];
      else {
        const numId = Number(toCode.replace(/^#/, ""));
        if (!isNaN(numId)) {
          const byId = await db.select({ id: users.id }).from(users).where(eq(users.id, numId));
          if (byId.length) toUser = byId[0];
        }
      }
    }
    if (!toUser) throw new Error("Recipient not found (use referral code, email or ID)");
    if (toUser.id === fromUserId) throw new Error("Cannot send to yourself");

    // Transfer ownership
    await db.update(activationPins).set({ ownerId: toUser.id }).where(eq(activationPins.id, pin.id));
    await db.insert(pinTransfers).values({ pinId: pin.id, fromUserId, toUserId: toUser.id });

    return { success: true, message: `PIN ${pinStr} sent to user #${toUser.id}` };
  });

// ── Get My Pins (inbox: owned, unused)
export const getMyPins = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getAuthUserId();
  const pins = await db.select().from(activationPins).where(and(eq(activationPins.ownerId, userId), eq(activationPins.isUsed, false))).orderBy(desc(activationPins.createdAt));
  return { pins };
});

// ── Get Pins History (used pins where I was owner, generator or usedBy)
export const getPinsHistory = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getAuthUserId();
  // Pins I owned/sent that are now used, plus pins I used to activate someone
  const pins = await db.select().from(activationPins).where(eq(activationPins.isUsed, true)).orderBy(desc(activationPins.usedAt));
  // Filter in memory to keep only relevant
  const relevant = pins.filter((p) => p.ownerId === userId || p.usedBy === userId || p.generatedBy === userId);
  // For display, fetch the activated account names
  const usedIds = relevant.map((p) => p.usedBy).filter(Boolean) as number[];
  let userMap = new Map<number, any>();
  if (usedIds.length) {
    const uRows = await db.select({ id: users.id, name: users.name, referralCode: users.referralCode }).from(users).where(sql`${users.id} IN ${usedIds}`);
    for (const u of uRows) userMap.set(u.id, u);
  }
  const enriched = relevant.map((p) => ({
    ...p,
    usedByUser: p.usedBy ? userMap.get(p.usedBy) : null,
  }));
  return { pins: enriched };
});

// ── Search user for activation (by code / ID / email)
export const searchUserForActivation = createServerFn({ method: "GET" })
  .validator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    await getAuthUserId();
    const q = data.query?.trim().toUpperCase();
    if (!q) return { user: null };
    let found: any = null;
    const byCode = await db.select({ id: users.id, name: users.name, referralCode: users.referralCode, isActive: users.isActive, email: users.email }).from(users).where(eq(users.referralCode, q));
    if (byCode.length) found = byCode[0];
    else {
      const byEmail = await db.select({ id: users.id, name: users.name, referralCode: users.referralCode, isActive: users.isActive, email: users.email }).from(users).where(eq(users.email, q));
      if (byEmail.length) found = byEmail[0];
      else {
        const numId = Number(q.replace(/^#/, ""));
        if (!isNaN(numId)) {
          const byId = await db.select({ id: users.id, name: users.name, referralCode: users.referralCode, isActive: users.isActive, email: users.email }).from(users).where(eq(users.id, numId));
          if (byId.length) found = byId[0];
        }
      }
    }
    if (!found) {
      // fallback ILIKE search for partial
      const like = `%${q}%`;
      const byLike = await db.select({ id: users.id, name: users.name, referralCode: users.referralCode, isActive: users.isActive, email: users.email }).from(users).where(sql`${users.referralCode} ILIKE ${like} OR ${users.email} ILIKE ${like}`);
      if (byLike.length) found = byLike[0];
    }
    return { user: found };
  });

// ── Activate any account (by searching) using a PIN I own
export const activateAccountWithPin = createServerFn({ method: "POST" })
  .validator((data: { pin: string; targetCode: string }) => data)
  .handler(async ({ data }) => {
    const callerId = await getAuthUserId();
    const pinStr = data.pin?.trim();
    const targetCode = data.targetCode?.trim().toUpperCase();
    if (!pinStr || !targetCode) throw new Error("PIN and target are required");

    // Find pin owned by caller and unused
    const pinRows = await db.select().from(activationPins).where(and(eq(activationPins.pin, pinStr), eq(activationPins.isUsed, false)));
    if (!pinRows.length) throw new Error("Invalid or already used PIN");
    const pin = pinRows[0]!;
    if (pin.ownerId !== callerId) {
      // Allow admin who generated but not owner? Strict: must own
      throw new Error("You don't own this PIN");
    }

    // Find target user to activate
    let target: any = null;
    const byCode = await db.select().from(users).where(eq(users.referralCode, targetCode));
    if (byCode.length) target = byCode[0];
    else {
      const byEmail = await db.select().from(users).where(eq(users.email, targetCode));
      if (byEmail.length) target = byEmail[0];
      else {
        const numId = Number(targetCode.replace(/^#/, ""));
        if (!isNaN(numId)) {
          const byId = await db.select().from(users).where(eq(users.id, numId));
          if (byId.length) target = byId[0];
        }
      }
    }
    if (!target) throw new Error("Target account not found");
    if (target.isActive) throw new Error("Target account is already active");

    const now = new Date();
    await db.update(activationPins).set({ isUsed: true, usedBy: target.id, usedAt: now }).where(eq(activationPins.id, pin.id));
    await db.update(users).set({ isActive: true }).where(eq(users.id, target.id));

    const existingWallet = await db.select().from(wallet).where(eq(wallet.userId, target.id));
    if (!existingWallet.length) {
      await db.insert(wallet).values({ userId: target.id, workingBalance: 0, incomeBalance: 0, repurchaseBalance: 0, cashbackBalance: 0, totalEarned: 0 });
    }
    const { payDirectCommission, calculateMatchingIncome } = await import("../../lib/mlm/engine");
    let directAmount = 0;
    if (target.referredBy) directAmount = await payDirectCommission(target.id, target.referredBy);
    const matchingEvents = await calculateMatchingIncome(target.id);

    return { success: true, message: `Account ${target.referralCode} activated!`, directAmount, matchingPairs: matchingEvents.length };
  });
