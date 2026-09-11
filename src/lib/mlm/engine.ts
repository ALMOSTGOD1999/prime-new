import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "../db";
import { users, pairs, income, wallet, matchingAwards, dailyPairs, dailyActivations } from "../db/schema";

// ── Constants ──────────────────────────────────────────
const JOINING_AMOUNT = 2999;
const DIRECT_COMMISSION_PCT = 5;
const MATCHING_INCOME_PCT = 20;
const DAILY_PAIR_CAP = 3;

// Matching award milestones (left:right pairs → award)
const MATCHING_AWARDS: { threshold: number; name: string }[] = [
  { threshold: 100, name: "Bag" },
  { threshold: 200, name: "Micro Oven" },
  { threshold: 500, name: "Smart Phone" },
  { threshold: 1000, name: "Laptop" },
  { threshold: 2000, name: "Scooty or DP ₹40,000" },
  { threshold: 5000, name: "Bullet or DP ₹1 Lakh" },
  { threshold: 10000, name: "Alto Car or DP ₹2 Lakh" },
  { threshold: 20000, name: "Hyundai i20 or DP ₹4 Lakh" },
];

// ── Place a new user in the binary tree ────────────────
export async function placeInTree(
  newUserId: number,
  referrerId: number,
  position: "left" | "right",
) {
  const referrer = await db.select().from(users).where(eq(users.id, referrerId));
  if (referrer.length === 0) throw new Error("Referrer not found");

  await db
    .update(users)
    .set({ parentId: referrerId, position })
    .where(eq(users.id, newUserId));
}

// ── Auto-place in binary tree (fill left first, or use preferred leg) ──
export async function autoPlace(
  newUserId: number,
  referrerId: number,
  preferredLeg?: "left" | "right",
): Promise<"left" | "right"> {
  // If a preferred leg is specified, use it
  if (preferredLeg) {
    await placeInTree(newUserId, referrerId, preferredLeg);
    return preferredLeg;
  }

  // Otherwise auto-fill: smaller leg first; if equal, fill left first
  const leftCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.parentId, referrerId), eq(users.position, "left")));

  const rightCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.parentId, referrerId), eq(users.position, "right")));

  const left = leftCount[0]?.count ?? 0;
  const right = rightCount[0]?.count ?? 0;

  const position = left <= right ? "left" : "right";
  await placeInTree(newUserId, referrerId, position);
  return position;
}

// ── Distribute income across 4 wallets ──────────────────
// Every income event:
//   workingBalance  += grossAmount (shows ALL income, no deductions)
//   repurchaseBalance += 20% (spendable on products)
//   incomeBalance   += 70% (withdrawable)
//   10% admin charge → wiped from system (not stored)
export async function distributeIncome(userId: number, grossAmount: number) {
  const repurchaseAmount = Math.round(grossAmount * 20 / 100); // 20%
  const incomeAmount = Math.round(grossAmount * 70 / 100);     // 70%
  // 10% admin charge = grossAmount - repurchaseAmount - incomeAmount (wiped)

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

// ── Pay direct commission (5% one-time) ────────────────
export async function payDirectCommission(newUserId: number, referrerId: number) {
  const amount = Math.round(JOINING_AMOUNT * DIRECT_COMMISSION_PCT / 100);

  await db.insert(income).values({
    userId: referrerId,
    type: "direct",
    amount,
    description: `Direct commission for referring user #${newUserId}`,
  });

  // Distribute across wallets (20% repurchase, 10% admin wipe, 70% income)
  await distributeIncome(referrerId, amount);

  return amount;
}

// ── Count total pairs for a user (ancestors) ───────────
async function getTotalPairs(userId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pairs)
    .where(eq(pairs.userId, userId));
  return result[0]?.count ?? 0;
}

// ── Get today's pair count ─────────────────────────────
async function getTodayPairs(userId: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db
    .select()
    .from(dailyPairs)
    .where(and(eq(dailyPairs.userId, userId), eq(dailyPairs.pairDate, today)));
  return result[0]?.pairsCount ?? 0;
}

// ── Increment today's pair count ───────────────────────
async function incrementTodayPairs(userId: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db
    .select()
    .from(dailyPairs)
    .where(and(eq(dailyPairs.userId, userId), eq(dailyPairs.pairDate, today)));

  if (existing.length > 0) {
    const newCount = existing[0].pairsCount + 1;
    await db
      .update(dailyPairs)
      .set({ pairsCount: newCount })
      .where(eq(dailyPairs.id, existing[0].id));
    return newCount;
  } else {
    await db.insert(dailyPairs).values({ userId, pairDate: today, pairsCount: 1 });
    return 1;
  }
}

// ── Calculate matching income for a new activation ─────
export async function calculateMatchingIncome(newUserId: number) {
  const newUser = await db.select().from(users).where(eq(users.id, newUserId));
  if (newUser.length === 0) return [];

  const events: { userId: number; amount: number; pairId: number }[] = [];
  let currentUserId = newUser[0].parentId;

  // Walk up the tree, checking each ancestor for pair matches
  while (currentUserId) {
    const ancestor = await db.select().from(users).where(eq(users.id, currentUserId));
    if (ancestor.length === 0) break;

    // Count left and right active legs under this ancestor
    const leftActive = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          sql` EXISTS (
            SELECT 1 FROM ${users} AS child
            WHERE child.parent_id = ${currentUserId} AND child.position = 'left'
            AND child.is_active = true
          ) `,
        ),
      );

    const rightActive = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          sql` EXISTS (
            SELECT 1 FROM ${users} AS child
            WHERE child.parent_id = ${currentUserId} AND child.position = 'right'
            AND child.is_active = true
          ) `,
        ),
      );

    const leftLeg = leftActive[0]?.count ?? 0;
    const rightLeg = rightActive[0]?.count ?? 0;
    const possiblePairs = Math.min(leftLeg, rightLeg);
    const totalPairs = await getTotalPairs(currentUserId);
    const todayPairsCount = await getTodayPairs(currentUserId);

    // Check if we can form a new pair
    if (possiblePairs > totalPairs) {
      // Check daily cap (3 pairs per day + 1 per salary milestone)
      const salaryMilestone = Math.floor(totalPairs / DAILY_PAIR_CAP);
      const dailyCap = DAILY_PAIR_CAP + salaryMilestone;

      if (todayPairsCount < dailyCap) {
        const amount = Math.round(JOINING_AMOUNT * MATCHING_INCOME_PCT / 100);

        // Record the pair
        const [newPair] = await db
          .insert(pairs)
          .values({
            userId: currentUserId,
            leftUserId: newUserId, // simplified — in production track actual leg members
            rightUserId: newUserId,
          })
          .returning();

        // Record income
        await db.insert(income).values({
          userId: currentUserId,
          type: "matching",
          amount,
          pairId: newPair.id,
          description: `Matching income pair #${totalPairs + 1}`,
        });

        // Distribute matching income across wallets (20% repurchase, 10% admin wipe, 70% income)
        await distributeIncome(currentUserId, amount);

        // Increment daily pairs
        await incrementTodayPairs(currentUserId);

        events.push({ userId: currentUserId, amount, pairId: newPair.id });

        // Check matching awards
        const newTotalPairs = totalPairs + 1;
        for (const award of MATCHING_AWARDS) {
          if (newTotalPairs === award.threshold) {
            // Check if already awarded
            const alreadyAwarded = await db
              .select()
              .from(matchingAwards)
              .where(
                and(
                  eq(matchingAwards.userId, currentUserId),
                  eq(matchingAwards.awardName, award.name),
                ),
              );
            if (alreadyAwarded.length === 0) {
              await db.insert(matchingAwards).values({
                userId: currentUserId,
                totalPairs: newTotalPairs,
                awardName: award.name,
              });
              await db.insert(income).values({
                userId: currentUserId,
                type: "award",
                amount: 0,
                description: `Award: ${award.name} at ${newTotalPairs} pairs`,
              });
            }
          }
        }
      }
    }

    currentUserId = ancestor[0].parentId;
  }

  return events;
}

// ── Full activation flow ───────────────────────────────
export async function activateUser(userId: number) {
  const user = await db.select().from(users).where(eq(users.id, userId));
  if (user.length === 0) throw new Error("User not found");
  if (user[0].isActive) throw new Error("User already active");

  // Activate the user
  await db
    .update(users)
    .set({ isActive: true, packageAmount: JOINING_AMOUNT })
    .where(eq(users.id, userId));

  // Create wallet with all 4 wallet fields
  const existingWallet = await db.select().from(wallet).where(eq(wallet.userId, userId));
  if (existingWallet.length === 0) {
    await db.insert(wallet).values({
      userId,
      workingBalance: 0,
      incomeBalance: 0,
      repurchaseBalance: 0,
      cashbackBalance: 0,
      totalEarned: 0,
    });
  }

  // Pay direct commission to referrer
  let directAmount = 0;
  if (user[0].referredBy) {
    directAmount = await payDirectCommission(userId, user[0].referredBy);
  }

  // Calculate matching income up the tree
  const matchingEvents = await calculateMatchingIncome(userId);

  return { directAmount, matchingEvents };
}

// ── Get user's team (binary tree) ──────────────────────
export async function getTeamTree(userId: number, depth: number = 3): Promise<any> {
  const user = await db.select().from(users).where(eq(users.id, userId));
  if (user.length === 0) return null;

  const children = await db.select().from(users).where(eq(users.parentId, userId));

  return {
    ...user[0],
    passwordHash: undefined,
    left: children.find((c) => c.position === "left")
      ? await getTeamTree(children.find((c) => c.position === "left")!.id, depth - 1)
      : null,
    right: children.find((c) => c.position === "right")
      ? await getTeamTree(children.find((c) => c.position === "right")!.id, depth - 1)
      : null,
  };
}

// ── Get user income summary ────────────────────────────
export async function getIncomeSummary(userId: number) {
  const allIncome = await db.select().from(income).where(eq(income.userId, userId));

  const direct = allIncome
    .filter((i) => i.type === "direct")
    .reduce((sum, i) => sum + i.amount, 0);

  const matching = allIncome
    .filter((i) => i.type === "matching")
    .reduce((sum, i) => sum + i.amount, 0);

  const awards = allIncome.filter((i) => i.type === "award");

  const walletRow = await db.select().from(wallet).where(eq(wallet.userId, userId));

  return {
    direct,
    matching,
    totalIncome: direct + matching,
    workingBalance: walletRow[0]?.workingBalance ?? 0,   // Gross income (no deductions)
    incomeBalance: walletRow[0]?.incomeBalance ?? 0,      // Net income (after 20%+10% deductions)
    repurchaseBalance: walletRow[0]?.repurchaseBalance ?? 0, // 20% (spendable on products)
    cashbackBalance: walletRow[0]?.cashbackBalance ?? 0,     // Monthly cashback (spendable on products)
    totalEarned: walletRow[0]?.totalEarned ?? 0,
    totalPairs: (await getTotalPairs(userId)),
    todayPairs: (await getTodayPairs(userId)),
    awards,
    recentIncome: allIncome.slice(-20).reverse(),
  };
}

// ── Monthly cashback: credit 30% of self business ──────
// Called by admin button. Credits cashbackBalance for all active users.
const CASHBACK_PCT = 30;

export async function creditMonthlyCashback() {
  // Get all active users with a package (self business = packageAmount)
  const activeUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.isActive, true), gte(users.packageAmount, 1)));

  const credited: { userId: number; name: string; selfBusiness: number; cashback: number }[] = [];

  for (const user of activeUsers) {
    const selfBusiness = user.packageAmount;
    const cashback = Math.round((selfBusiness * CASHBACK_PCT) / 100);

    if (cashback <= 0) continue;

    // Credit cashback wallet
    const existing = await db.select().from(wallet).where(eq(wallet.userId, user.id));
    if (existing.length > 0) {
      await db
        .update(wallet)
        .set({
          cashbackBalance: existing[0].cashbackBalance + cashback,
        })
        .where(eq(wallet.userId, user.id));
    } else {
      await db.insert(wallet).values({
        userId: user.id,
        workingBalance: 0,
        incomeBalance: 0,
        repurchaseBalance: 0,
        cashbackBalance: cashback,
        totalEarned: 0,
      });
    }

    // Record as income (type: "cashback")
    await db.insert(income).values({
      userId: user.id,
      type: "cashback",
      amount: cashback,
      description: `Monthly cashback — 30% of self business ₹${selfBusiness.toLocaleString("en-IN")}`,
    });

    credited.push({
      userId: user.id,
      name: user.name,
      selfBusiness,
      cashback,
    });
  }

  return { totalUsers: credited.length, credited };
}

// ── Daily ID activation reward ────────────────────────
// Users can activate their ID once daily between 12PM-12AM
// Reward: ₹100 credited to income wallet (withdrawable)
const DAILY_ACTIVATION_REWARD = 100;

export async function dailyActivationReward(userId: number) {
  const today = new Date().toISOString().slice(0, 10);
  
  // Check if user already activated today
  const existing = await db
    .select()
    .from(dailyActivations)
    .where(and(eq(dailyActivations.userId, userId), eq(dailyActivations.activationDate, today)));
  
  if (existing.length > 0) {
    throw new Error("Already activated today. Try again tomorrow!");
  }
  
  // Check if user is active
  const user = await db.select().from(users).where(eq(users.id, userId));
  if (user.length === 0) throw new Error("User not found");
  if (!user[0].isActive) throw new Error("Account not activated yet");
  
  // Record the activation
  await db.insert(dailyActivations).values({
    userId,
    activationDate: today,
    rewardAmount: DAILY_ACTIVATION_REWARD,
  });
  
  // Credit reward to income wallet (withdrawable)
  await db.insert(income).values({
    userId,
    type: "daily_activation",
    amount: DAILY_ACTIVATION_REWARD,
    description: `Daily ID activation reward — ${today}`,
  });
  
  // Distribute to wallets
  await distributeIncome(userId, DAILY_ACTIVATION_REWARD);
  
  return { rewardAmount: DAILY_ACTIVATION_REWARD, date: today };
}

// ── Get daily activation status ───────────────────────
export async function getDailyActivationStatus(userId: number) {
  const today = new Date().toISOString().slice(0, 10);
  
  const existing = await db
    .select()
    .from(dailyActivations)
    .where(and(eq(dailyActivations.userId, userId), eq(dailyActivations.activationDate, today)));
  
  // Check if within withdrawal hours (12PM-12AM)
  const now = new Date();
  const hours = now.getHours();
  const isWithdrawalTime = hours >= 12; // 12PM to 12AM
  
  return {
    activatedToday: existing.length > 0,
    lastActivation: existing[0]?.createdAt ?? null,
    rewardAmount: existing[0]?.rewardAmount ?? DAILY_ACTIVATION_REWARD,
    isWithdrawalTime,
    nextActivationTime: "12:00 PM",
  };
}
