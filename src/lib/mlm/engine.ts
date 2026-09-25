import { eq, and, sql } from "drizzle-orm";
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
  parentId: number,
  position: "left" | "right",
) {
  await db
    .update(users)
    .set({ parentId, position })
    .where(eq(users.id, newUserId));
}

// ── Find extreme outer leaf on a given side ──
// Walk straight down the outer spine (always follow same side)
// until we hit a node whose `side` child is empty.
async function findExtremeSlot(
  sideRootId: number,
  side: "left" | "right",
): Promise<{ parentId: number; position: "left" | "right" }> {
  let currentId = sideRootId;
  while (true) {
    const child = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.parentId, currentId), eq(users.position, side)));
    if (child.length === 0) return { parentId: currentId, position: side };
    currentId = child[0].id;
  }
}

// ── Auto-place in binary tree with extreme-leg spillover ──
// Rule: first 2 directs fill left/right directly under referrer.
// All later directs spill ONE BY ONE to the BOTTOM of the
// extreme left leg or extreme right leg (outermost spine).
// If preferredLeg is given the user chooses the side;
// otherwise we alternate left/right so 22 directs → 11 each side.
export async function autoPlace(
  newUserId: number,
  referrerId: number,
  preferredLeg?: "left" | "right",
): Promise<"left" | "right"> {
  // Fetch both direct children
  const leftChild = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.parentId, referrerId), eq(users.position, "left")));
  const rightChild = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.parentId, referrerId), eq(users.position, "right")));

  const hasLeft = leftChild.length > 0;
  const hasRight = rightChild.length > 0;

  // Determine target side — preserve actual chosen position, never overwrite
  let targetLeg: "left" | "right";
  if (preferredLeg) {
    targetLeg = preferredLeg;
  } else if (!hasLeft && !hasRight) {
    targetLeg = "left";
  } else if (!hasLeft) {
    // Only left empty — if no preference, fill left; if preference is right, respect it (will spill)
    targetLeg = "left";
  } else if (!hasRight) {
    targetLeg = "right";
  } else {
    // Both occupied — alternate to balance, but still per stored intent
    const directs = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referredBy, referrerId));
    targetLeg = directs.length % 2 === 0 ? "left" : "right";
    // If user explicitly chose a leg, respect it even when both occupied
    if (preferredLeg) targetLeg = preferredLeg;
  }

  // If caller explicitly asked for a side, respect it even if opposite side is empty
  if (preferredLeg) targetLeg = preferredLeg;

  const hasTargetSlot = targetLeg === "left" ? !hasLeft : !hasRight;
  if (hasTargetSlot) {
    await placeInTree(newUserId, referrerId, targetLeg);
    return targetLeg;
  }

  const sideRootId = targetLeg === "left" ? leftChild[0]!.id : rightChild[0]!.id;
  const slot = await findExtremeSlot(sideRootId, targetLeg);
  await placeInTree(newUserId, slot.parentId, slot.position);
  return slot.position;
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

  // ── Leg truth = parent_id + position (never the rendered tree) ──
  // Load the placement graph once and count ACTIVE MEMBERS per leg subtree:
  // a direct child contributes its whole active subtree to its own side.
  const all = await db
    .select({ id: users.id, parentId: users.parentId, position: users.position, isActive: users.isActive })
    .from(users);
  const parentOf = new Map(all.map((u) => [u.id, u.parentId]));
  const activeById = new Map(all.map((u) => [u.id, u.isActive]));
  const childrenByParent = new Map<number, { id: number; position: string | null }[]>();
  for (const u of all) {
    if (u.parentId == null) continue;
    const list = childrenByParent.get(u.parentId) ?? [];
    list.push({ id: u.id, position: u.position });
    childrenByParent.set(u.parentId, list);
  }

  // Memoized active-member count of a subtree (cycle-safe).
  const sizeMemo = new Map<number, number>();
  const onPath = new Set<number>();
  const activeSizeOf = (id: number): number => {
    const cached = sizeMemo.get(id);
    if (cached != null) return cached;
    if (onPath.has(id)) return 0;
    onPath.add(id);
    let sum = activeById.get(id) ? 1 : 0;
    for (const c of childrenByParent.get(id) ?? []) sum += activeSizeOf(c.id);
    onPath.delete(id);
    sizeMemo.set(id, sum);
    return sum;
  };

  // Walk up the placement chain, checking each ancestor for pair matches
  let currentUserId: number | null = newUser[0]?.parentId ?? null;
  const seenAncestors = new Set<number>();
  while (currentUserId != null && !seenAncestors.has(currentUserId)) {
    seenAncestors.add(currentUserId);

    let leftLeg = 0;
    let rightLeg = 0;
    for (const child of childrenByParent.get(currentUserId) ?? []) {
      const size = activeSizeOf(child.id);
      if (child.position === "left") leftLeg += size;
      else if (child.position === "right") rightLeg += size;
    }
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

    currentUserId = parentOf.get(currentUserId) ?? null;
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

  const referral = allIncome
    .filter((i) => i.type === "referral")
    .reduce((sum, i) => sum + i.amount, 0);

  const awards = allIncome.filter((i) => i.type === "award");

  const walletRow = await db.select().from(wallet).where(eq(wallet.userId, userId));

  return {
    direct,
    matching,
    referral,
    totalIncome: direct + matching + referral,
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

// ── Monthly cashback ───────────────────────────────────
// Gold Purchase Cashback (tiered 2%–3% per approved purchase, capped at 60%
// of purchase value) lives in ./gold-cashback.ts — runGoldPurchaseCashbackPayout().

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
