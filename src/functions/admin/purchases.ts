import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { purchases, investments, investmentPackages, users, wallet, income, goldRates } from "../../lib/db/schema";
import { eq, and, sql, desc, like, or } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

const MIN_PURCHASE = 10000;
const GST_PCT = 18;
const HALLMARK_CHARGES = 500;
const MAKING_CHARGES_PCT = 8;

// ── Admin auth helper ──
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

// ── Get latest gold rate ──
async function getLatestGoldRate(): Promise<number> {
  const latest = await db
    .select()
    .from(goldRates)
    .orderBy(desc(goldRates.createdAt))
    .limit(1);
  if (latest.length === 0) throw new Error("Gold rate not set by admin");
  return latest[0].price;
}

// ── Compute billing from carat + weight ──
function computeBilling(carat: number, weight: number, goldRatePerGram: number) {
  const purityMap: Record<number, number> = { 24: 1.0, 22: 0.9167, 18: 0.75 };
  const purity = purityMap[carat];
  if (!purity) throw new Error("Invalid carat. Must be 18, 22, or 24.");

  const effectiveRate = goldRatePerGram * purity;
  const goldValue = effectiveRate * weight;
  const makingCharges = Math.round(goldValue * MAKING_CHARGES_PCT / 100);
  const subtotal = goldValue + makingCharges;
  const gst = Math.round(subtotal * GST_PCT / 100);
  const total = Math.round(subtotal + gst + HALLMARK_CHARGES);

  return {
    carat,
    weight,
    goldRatePerGram,
    effectiveRate: Math.round(effectiveRate),
    goldValue: Math.round(goldValue),
    makingCharges,
    gst,
    hallmarkCharges: HALLMARK_CHARGES,
    total,
  };
}

// ── Find matching investment package ──
async function findPackage(totalAmount: number) {
  const pkgs = await db
    .select()
    .from(investmentPackages)
    .where(
      and(
        eq(investmentPackages.isActive, true),
        sql`${investmentPackages.minAmount} <= ${totalAmount}`,
        sql`${investmentPackages.maxAmount} >= ${totalAmount}`
      )
    )
    .limit(1);

  if (pkgs.length === 0) {
    const fallback = await db
      .select()
      .from(investmentPackages)
      .where(eq(investmentPackages.isActive, true))
      .orderBy(sql`${investmentPackages.minAmount} ASC`)
      .limit(1);
    if (fallback.length === 0) throw new Error("No investment packages configured");
    return fallback[0]!;
  }
  return pkgs[0]!;
}

// ── Admin: Search users ──
export const adminSearchUsers = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    await getAdminId();
    const { query } = data;
    if (!query || query.length < 2) return { users: [] };

    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        referralCode: users.referralCode,
        isActive: users.isActive,
        totalInvested: users.totalInvested,
      })
      .from(users)
      .where(
        or(
          like(users.name, `%${query}%`),
          like(users.email, `%${query}%`),
          like(users.referralCode, `%${query}%`),
          sql`CAST(${users.id} AS TEXT) LIKE ${`%${query}%`}`
        )
      )
      .limit(20);

    return { users: results };
  });

// ── Admin: Preview billing (weight-based) ──
export const adminPreviewPurchase = createServerFn({ method: "POST" })
  .validator((data: { carat: number; weight: number }) => data)
  .handler(async ({ data }) => {
    await getAdminId();
    const { carat, weight } = data;
    if (!weight || weight <= 0) throw new Error("Invalid weight");
    if (![18, 22, 24].includes(carat)) throw new Error("Invalid carat");

    const goldRate = await getLatestGoldRate();
    const billing = computeBilling(carat, weight, goldRate);
    const pkg = await findPackage(billing.total);
    const monthlyReturn = Math.round(billing.total * pkg.monthlyReturnPct / 100);

    return {
      ...billing,
      packageName: pkg.name,
      monthlyReturnPct: pkg.monthlyReturnPct,
      monthlyReturnAmount: monthlyReturn,
    };
  });

// ── Admin: Create purchase (weight-based, auto-approved) ──
export const adminCreatePurchaseWeight = createServerFn({ method: "POST" })
  .validator((data: { targetUserId: number; carat: number; weight: number; adminNote?: string }) => data)
  .handler(async ({ data }) => {
    const adminId = await getAdminId();
    const { targetUserId, carat, weight, adminNote } = data;

    // Verify target user exists
    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId));
    if (targetUser.length === 0) throw new Error("Target user not found");

    const goldRate = await getLatestGoldRate();
    const billing = computeBilling(carat, weight, goldRate);
    if (billing.total < MIN_PURCHASE) throw new Error(`Minimum purchase is ₹${MIN_PURCHASE.toLocaleString("en-IN")}`);

    const pkg = await findPackage(billing.total);
    const monthlyReturnAmount = Math.round(billing.total * pkg.monthlyReturnPct / 100);

    // Create purchase (auto-approved, created by admin)
    const [purchase] = await db
      .insert(purchases)
      .values({
        userId: targetUserId,
        carat: billing.carat,
        weight: billing.weight,
        goldRatePerGram: billing.goldRatePerGram,
        goldValue: billing.goldValue,
        makingCharges: billing.makingCharges,
        gst: billing.gst,
        hallmarkCharges: billing.hallmarkCharges,
        totalAmount: billing.total,
        status: "approved",
        approvedAt: new Date(),
        createdByAdmin: true,
        adminNote: adminNote || `Created by admin #${adminId}`,
      })
      .returning();

    // Create investment
    const [investment] = await db
      .insert(investments)
      .values({
        userId: targetUserId,
        purchaseId: purchase.id,
        packageId: pkg.id,
        amount: billing.total,
        monthlyReturnPct: pkg.monthlyReturnPct,
        monthlyReturnAmount,
        status: "active",
      })
      .returning();

    // Update user's totalInvested
    await db
      .update(users)
      .set({ totalInvested: sql`${users.totalInvested} + ${billing.total}` })
      .where(eq(users.id, targetUserId));

    return {
      success: true,
      purchaseId: purchase.id,
      investmentId: investment.id,
      totalAmount: billing.total,
      packageName: pkg.name,
      monthlyReturnAmount,
    };
  });

// ── Admin: Create purchase (amount-based, auto-approved) ──
export const adminCreatePurchaseAmount = createServerFn({ method: "POST" })
  .validator((data: { targetUserId: number; amount: number; adminNote?: string }) => data)
  .handler(async ({ data }) => {
    const adminId = await getAdminId();
    const { targetUserId, amount, adminNote } = data;

    if (!amount || amount < MIN_PURCHASE) throw new Error(`Minimum purchase is ₹${MIN_PURCHASE.toLocaleString("en-IN")}`);

    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId));
    if (targetUser.length === 0) throw new Error("Target user not found");

    const pkg = await findPackage(amount);
    const monthlyReturnAmount = Math.round(amount * pkg.monthlyReturnPct / 100);

    const [purchase] = await db
      .insert(purchases)
      .values({
        userId: targetUserId,
        carat: 24, // Default for amount-based
        weight: 0,
        goldRatePerGram: 0,
        goldValue: 0,
        makingCharges: 0,
        gst: 0,
        hallmarkCharges: 0,
        totalAmount: amount,
        status: "approved",
        approvedAt: new Date(),
        createdByAdmin: true,
        adminNote: adminNote || `Amount-based purchase by admin #${adminId}`,
      })
      .returning();

    const [investment] = await db
      .insert(investments)
      .values({
        userId: targetUserId,
        purchaseId: purchase.id,
        packageId: pkg.id,
        amount,
        monthlyReturnPct: pkg.monthlyReturnPct,
        monthlyReturnAmount,
        status: "active",
      })
      .returning();

    await db
      .update(users)
      .set({ totalInvested: sql`${users.totalInvested} + ${amount}` })
      .where(eq(users.id, targetUserId));

    return {
      success: true,
      purchaseId: purchase.id,
      investmentId: investment.id,
      totalAmount: amount,
      packageName: pkg.name,
      monthlyReturnAmount,
    };
  });

// ── Admin: Get all purchases ──
export const adminGetPurchases = createServerFn({ method: "GET" })
  .handler(async () => {
    await getAdminId();

    const all = await db
      .select({
        id: purchases.id,
        userId: purchases.userId,
        carat: purchases.carat,
        weight: purchases.weight,
        goldRatePerGram: purchases.goldRatePerGram,
        goldValue: purchases.goldValue,
        makingCharges: purchases.makingCharges,
        gst: purchases.gst,
        hallmarkCharges: purchases.hallmarkCharges,
        totalAmount: purchases.totalAmount,
        status: purchases.status,
        approvedAt: purchases.approvedAt,
        rejectedAt: purchases.rejectedAt,
        stoppedAt: purchases.stoppedAt,
        cancelledAt: purchases.cancelledAt,
        createdByAdmin: purchases.createdByAdmin,
        adminNote: purchases.adminNote,
        createdAt: purchases.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(purchases)
      .leftJoin(users, eq(purchases.userId, users.id))
      .orderBy(desc(purchases.createdAt))
      .limit(100);

    return { purchases: all };
  });

// ── Admin: Update purchase status ──
export const adminUpdatePurchase = createServerFn({ method: "POST" })
  .validator((data: { purchaseId: number; action: "approve" | "reject" | "stop" | "cancel"; adminNote?: string }) => data)
  .handler(async ({ data }) => {
    await getAdminId();
    const { purchaseId, action, adminNote } = data;

    const existing = await db.select().from(purchases).where(eq(purchases.id, purchaseId));
    if (existing.length === 0) throw new Error("Purchase not found");

    const purchase = existing[0]!;
    const now = new Date();

    // Determine new status
    let newStatus: string;
    const updates: Record<string, any> = {};

    switch (action) {
      case "approve":
        if (purchase.status !== "pending") throw new Error("Can only approve pending purchases");
        newStatus = "approved";
        updates.approvedAt = now;
        updates.status = newStatus;
        break;
      case "reject":
        if (purchase.status !== "pending") throw new Error("Can only reject pending purchases");
        newStatus = "rejected";
        updates.rejectedAt = now;
        updates.status = newStatus;
        break;
      case "stop":
        if (purchase.status !== "approved") throw new Error("Can only stop approved purchases");
        newStatus = "stopped";
        updates.stoppedAt = now;
        updates.status = newStatus;
        break;
      case "cancel":
        newStatus = "cancelled";
        updates.cancelledAt = now;
        updates.status = newStatus;
        break;
    }

    if (adminNote) updates.adminNote = adminNote;

    await db.update(purchases).set(updates).where(eq(purchases.id, purchaseId));

    // Handle investment for reject/stop/cancel
    if (["rejected", "stopped", "cancelled"].includes(newStatus)) {
      const inv = await db.select().from(investments).where(eq(investments.purchaseId, purchaseId));
      if (inv.length > 0) {
        await db
          .update(investments)
          .set({
            status: newStatus === "rejected" ? "cancelled" : (newStatus as any),
            stoppedAt: now,
          })
          .where(eq(investments.purchaseId, purchaseId));
      }
    }

    // If approving (shouldn't happen for user purchases which are auto-approved), create investment
    if (action === "approve") {
      const pkg = await findPackage(purchase.totalAmount);
      const monthlyReturnAmount = Math.round(purchase.totalAmount * pkg.monthlyReturnPct / 100);

      const [investment] = await db
        .insert(investments)
        .values({
          userId: purchase.userId,
          purchaseId: purchase.id,
          packageId: pkg.id,
          amount: purchase.totalAmount,
          monthlyReturnPct: pkg.monthlyReturnPct,
          monthlyReturnAmount,
          status: "active",
        })
        .returning();

      // Update user's totalInvested
      await db
        .update(users)
        .set({ totalInvested: sql`${users.totalInvested} + ${purchase.totalAmount}` })
        .where(eq(users.id, purchase.userId));
    }

    return { success: true, newStatus };
  });

// ── Admin: Get single purchase detail ──
export const adminGetPurchaseDetail = createServerFn({ method: "POST" })
  .validator((data: { purchaseId: number }) => data)
  .handler(async ({ data }) => {
    await getAdminId();

    const result = await db
      .select({
        purchase: purchases,
        userName: users.name,
        userEmail: users.email,
        userReferralCode: users.referralCode,
      })
      .from(purchases)
      .leftJoin(users, eq(purchases.userId, users.id))
      .where(eq(purchases.id, data.purchaseId))
      .limit(1);

    if (result.length === 0) throw new Error("Purchase not found");

    const inv = await db
      .select()
      .from(investments)
      .where(eq(investments.purchaseId, data.purchaseId))
      .limit(1);

    return {
      purchase: result[0]!.purchase,
      user: {
        name: result[0]!.userName,
        email: result[0]!.userEmail,
        referralCode: result[0]!.userReferralCode,
      },
      investment: inv[0] || null,
    };
  });
