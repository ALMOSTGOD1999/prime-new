import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { purchases, investments, investmentPackages, wallet, users, goldRates, income } from "../../lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

const MIN_PURCHASE = 10000;
const CGST_PCT = 9;
const SGST_PCT = 9;
const HALLMARK_CHARGES = 500;
const MAKING_CHARGES_PCT = 8; // 8% of gold value

// ── Auth helper ──
async function getUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== "number") throw new Error("Not authenticated");
  return payload.userId;
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
function computeBilling(carat: number, weight: number, goldRatePerGram: number, additionalCharges: number = 0) {
  // Carat adjustment: 24K = 100%, 22K = 91.67%, 18K = 75%
  const purityMap: Record<number, number> = { 24: 1.0, 22: 0.9167, 18: 0.75 };
  const purity = purityMap[carat];
  if (!purity) throw new Error("Invalid carat. Must be 18, 22, or 24.");

  const effectiveRate = goldRatePerGram * purity;
  const goldValue = effectiveRate * weight;
  const makingCharges = Math.round(goldValue * MAKING_CHARGES_PCT / 100);
  const subtotal = goldValue + makingCharges;
  const cgst = Math.round(subtotal * CGST_PCT / 100);
  const sgst = Math.round(subtotal * SGST_PCT / 100);
  const gst = cgst + sgst;
  const total = Math.round(subtotal + gst + HALLMARK_CHARGES + additionalCharges);

  return {
    carat,
    weight,
    goldRatePerGram,
    effectiveRate: Math.round(effectiveRate),
    goldValue: Math.round(goldValue),
    makingCharges,
    cgst,
    sgst,
    gst,
    additionalCharges,
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
    // Fallback: find the lowest tier
    const fallback = await db
      .select()
      .from(investmentPackages)
      .where(eq(investmentPackages.isActive, true))
      .orderBy(sql`${investmentPackages.minAmount} ASC`)
      .limit(1);
    if (fallback.length === 0) throw new Error("No investment packages configured");
    return fallback[0];
  }
  return pkgs[0];
}

// ── User: Preview billing (dry run) ──
export const previewPurchase = createServerFn({ method: "POST" })
  .validator((data: { carat: number; weight: number; additionalCharges?: number }) => data)
  .handler(async ({ data }) => {
    const { carat, weight, additionalCharges = 0 } = data;
    if (!weight || weight <= 0) throw new Error("Invalid weight");
    if (![18, 22, 24].includes(carat)) throw new Error("Invalid carat. Must be 18, 22, or 24.");

    const goldRate = await getLatestGoldRate();
    const billing = computeBilling(carat, weight, goldRate, additionalCharges);

    if (billing.total < MIN_PURCHASE) {
      throw new Error(`Minimum purchase is ₹${MIN_PURCHASE.toLocaleString("en-IN")}. Current total: ₹${billing.total.toLocaleString("en-IN")}`);
    }

    const pkg = await findPackage(billing.total);
    if (!pkg) throw new Error("No matching package found");
    const monthlyReturn = Math.round(billing.total * pkg.monthlyReturnPct / 100);

    return {
      ...billing,
      packageName: pkg.name,
      monthlyReturnPct: pkg.monthlyReturnPct,
      monthlyReturnAmount: monthlyReturn,
    };
  });

// ── User: Confirm purchase (auto-approved) ──
export const confirmPurchase = createServerFn({ method: "POST" })
  .validator((data: { carat: number; weight: number; additionalCharges?: number }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const { carat, weight, additionalCharges = 0 } = data;

    if (!weight || weight <= 0) throw new Error("Invalid weight");
    if (![18, 22, 24].includes(carat)) throw new Error("Invalid carat. Must be 18, 22, or 24.");

    const goldRate = await getLatestGoldRate();
    const billing = computeBilling(carat, weight, goldRate, additionalCharges);

    if (billing.total < MIN_PURCHASE) {
      throw new Error(`Minimum purchase is ₹${MIN_PURCHASE.toLocaleString("en-IN")}`);
    }

    const pkg = await findPackage(billing.total);
    if (!pkg) throw new Error("No matching package found");
    const monthlyReturnAmount = Math.round(billing.total * pkg.monthlyReturnPct / 100);

    // Create purchase record (auto-approved)
    const [purchase] = await db
      .insert(purchases)
      .values({
        userId,
        carat: billing.carat,
        weight: billing.weight,
        goldRatePerGram: billing.goldRatePerGram,
        goldValue: billing.goldValue,
        makingCharges: billing.makingCharges,
        gst: billing.gst,
        cgst: billing.cgst,
        sgst: billing.sgst,
        additionalCharges: billing.additionalCharges,
        hallmarkCharges: billing.hallmarkCharges,
        totalAmount: billing.total,
        status: "approved",
        approvedAt: new Date(),
        createdByAdmin: false,
      })
      .returning();

    // Create investment record
    const [investment] = await db
      .insert(investments)
      .values({
        userId,
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
      .where(eq(users.id, userId));

    // Update user's packageAmount (business) so uplines see it and cashback applies
    await db
      .update(users)
      .set({ packageAmount: sql`${users.packageAmount} + ${Math.round(billing.total)}` })
      .where(eq(users.id, userId));

    // Record as business income
    await db.insert(income).values({
      userId,
      type: "direct" as const,
      amount: Math.round(billing.total),
      description: `Gold purchase — ${carat}K ${weight}g · Invoice #${purchase.id}`,
    });

    return {
      success: true,
      purchaseId: purchase.id,
      investmentId: investment.id,
      totalAmount: billing.total,
      packageName: pkg.name,
      monthlyReturnAmount,
    };
  });

// ── User: Get purchase history ──
export const getMyPurchases = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getUserId();

    const history = await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.createdAt))
      .limit(50);

    return { purchases: history };
  });

// ── User: Get single purchase detail ──
export const getPurchaseDetail = createServerFn({ method: "POST" })
  .validator((data: { purchaseId: number }) => data)
  .handler(async ({ data }) => {
    const userId = await getUserId();

    const result = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.id, data.purchaseId), eq(purchases.userId, userId)))
      .limit(1);

    if (result.length === 0) throw new Error("Purchase not found");

    const inv = await db
      .select()
      .from(investments)
      .where(eq(investments.purchaseId, data.purchaseId))
      .limit(1);

    return {
      purchase: result[0],
      investment: inv[0] || null,
    };
  });
