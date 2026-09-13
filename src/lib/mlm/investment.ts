import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { investments, purchases, wallet, income, investmentPackages } from "../db/schema";

// ── Monthly return split: 70% working, 20% repurchase, 10% admin ──
async function distributeToWallet(userId: number, grossAmount: number) {
  const repurchaseAmount = Math.round(grossAmount * 20 / 100);
  const incomeAmount = Math.round(grossAmount * 70 / 100);

  const existing = await db.select().from(wallet).where(eq(wallet.userId, userId));
  if (existing.length > 0) {
    await db
      .update(wallet)
      .set({
        workingBalance: existing[0].workingBalance + grossAmount,
        repurchaseBalance: existing[0].repurchaseBalance + repurchaseAmount,
        incomeBalance: existing[0].incomeBalance + incomeAmount,
        totalEarned: existing[0].totalEarned + grossAmount,
      })
      .where(eq(wallet.userId, userId));
  } else {
    await db.insert(wallet).values({
      userId,
      workingBalance: grossAmount,
      repurchaseBalance: repurchaseAmount,
      incomeBalance: incomeAmount,
      cashbackBalance: 0,
      totalEarned: grossAmount,
    });
  }

  return { grossAmount, repurchaseAmount, incomeAmount };
}

// ── Compute and credit monthly returns for all active investments ──
export async function computeMonthlyReturns() {
  // Get all active investments with their purchase details
  const activeInvestments = await db
    .select({
      investment: investments,
      purchase: purchases,
    })
    .from(investments)
    .innerJoin(purchases, eq(investments.purchaseId, purchases.id))
    .where(
      and(
        eq(investments.status, "active"),
        eq(purchases.status, "approved")
      )
    );

  const results: {
    userId: number;
    investmentId: number;
    returnAmount: number;
    split: { grossAmount: number; repurchaseAmount: number; incomeAmount: number };
  }[] = [];

  for (const row of activeInvestments) {
    const inv = row.investment;
    const returnAmount = inv.monthlyReturnAmount;

    if (returnAmount <= 0) continue;

    // Credit to wallet (70/20/10 split)
    const split = await distributeToWallet(inv.userId, returnAmount);

    // Record as income
    await db.insert(income).values({
      userId: inv.userId,
      type: "matching",
      amount: returnAmount,
      description: `Monthly investment return — Purchase #${inv.purchaseId} (${returnAmount / inv.amount * 100}% of ₹${inv.amount.toLocaleString("en-IN")})`,
    });

    // Update investment totalReturnsPaid
    await db
      .update(investments)
      .set({
        totalReturnsPaid: sql`${investments.totalReturnsPaid} + ${returnAmount}`,
      })
      .where(eq(investments.id, inv.id));

    results.push({
      userId: inv.userId,
      investmentId: inv.id,
      returnAmount,
      split,
    });
  }

  return {
    totalInvestments: activeInvestments.length,
    totalCredited: results.reduce((sum, r) => sum + r.returnAmount, 0),
    details: results,
  };
}

// ── Get user's active investments ──
export async function getUserInvestments(userId: number) {
  const userInvestments = await db
    .select({
      investment: investments,
      purchase: purchases,
      packageName: investmentPackages.name,
    })
    .from(investments)
    .innerJoin(purchases, eq(investments.purchaseId, purchases.id))
    .innerJoin(investmentPackages, eq(investments.packageId, investmentPackages.id))
    .where(eq(investments.userId, userId))
    .orderBy(sql`${investments.createdAt} DESC`);

  return userInvestments;
}

// ── Get investment summary for a user ──
export async function getInvestmentSummary(userId: number) {
  const all = await getUserInvestments(userId);

  const active = all.filter((r) => r.investment.status === "active");
  const totalInvested = active.reduce((sum, r) => sum + r.investment.amount, 0);
  const totalReturnsPaid = active.reduce((sum, r) => sum + r.investment.totalReturnsPaid, 0);
  const monthlyReturnPotential = active.reduce((sum, r) => sum + r.investment.monthlyReturnAmount, 0);

  return {
    totalInvested,
    totalReturnsPaid,
    monthlyReturnPotential,
    activeCount: active.length,
    investments: all,
  };
}
