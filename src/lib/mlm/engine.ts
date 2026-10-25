import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { users, pairs, income, wallet, matchingAwards, dailyPairs, dailyActivations } from "../db/schema";

// ── Constants ──────────────────────────────────────────
export const JOINING_AMOUNT = 2999;
const DIRECT_COMMISSION_PCT = 5;
const MATCHING_INCOME_PCT = 20;
const DAILY_PAIR_CAP = 3;

// ── Payout cutoff ──────────────────────────────────────
// 2026-09-15 rule set:
//   • direct (referral) — paid when the JOINER activated on/after the cutoff
//     (not when the referrer did).
//   • matching          — eligibility = min(L', R') where L'/R' count only
//     members activated on/after the cutoff; the counter counts pairs formed
//     on/after the cutoff; strict 3 pairs per user per IST day.
export const PAYOUT_CUTOFF = "2026-09-15";

// Business runs in IST (UTC+05:30). Every "which calendar day is it" decision
// must use the IST date — the UTC date only rolls over at 05:30 IST.
const IST_OFFSET_MS = 330 * 60_000;
const istDateOfMs = (t: number): string =>
  new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);

function istDateOf(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isNaN(t) ? null : istDateOfMs(t);
}

/** Today's calendar date in IST — use for every daily key/reset. */
export function istToday(): string {
  return istDateOfMs(Date.now());
}

export function isPayoutEligible(activatedAt: Date | string | null | undefined): boolean {
  const ist = istDateOf(activatedAt);
  // Users whose activation date was never recorded earn nothing.
  return ist != null && ist >= PAYOUT_CUTOFF;
}

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

// ── Distribute referral (direct) + matching income ────────────
// These two income types use their own split: a 10% admin charge is
// deducted at source and the remaining 90% lands in the withdrawable
// balance. Nothing is routed to the repurchase wallet.
export async function distributeCommission(userId: number, grossAmount: number) {
  const withdrawAmount = Math.round((grossAmount * 90) / 100); // 10% admin charge
  const existing = await db.select().from(wallet).where(eq(wallet.userId, userId));
  const current = existing[0];

  if (current) {
    await db
      .update(wallet)
      .set({
        incomeBalance: current.incomeBalance + withdrawAmount,
        totalEarned: current.totalEarned + grossAmount,
      })
      .where(eq(wallet.userId, userId));
  } else {
    await db.insert(wallet).values({
      userId,
      workingBalance: 0,
      incomeBalance: withdrawAmount,
      repurchaseBalance: 0,
      cashbackBalance: 0,
      totalEarned: grossAmount,
    });
  }

  return { grossAmount, withdrawAmount, adminCharge: grossAmount - withdrawAmount };
}

// ── Pay direct commission (5% one-time) ────────────────
export async function payDirectCommission(newUserId: number, referrerId: number) {
  // Rule (a): the gate is the JOINER's activation date, not the referrer's.
  // A referrer who activated before the cutoff still earns the 5% for a
  // downline who joined on/after it — and a joiner from before the cutoff
  // pays their referrer nothing.
  const joiner = await db
    .select({ isActive: users.isActive, activatedAt: users.activatedAt })
    .from(users)
    .where(eq(users.id, newUserId));
  const joinerRow = joiner[0];
  if (!joinerRow || !joinerRow.isActive || !isPayoutEligible(joinerRow.activatedAt)) return 0;

  const referrer = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, referrerId));
  if (!referrer[0]) return 0;

  const amount = Math.round(JOINING_AMOUNT * DIRECT_COMMISSION_PCT / 100);

  await db.insert(income).values({
    userId: referrerId,
    type: "direct",
    amount,
    description: `Direct commission for referring user #${newUserId}`,
  });

  await distributeCommission(referrerId, amount);

  return amount;
}

// ── Pay direct commission at most once per (referrer, joiner) pair ──
// Safe to call from re-entrant paths (admin toggle / bulk / reactivation)
// where the same join could otherwise be paid repeatedly.
export async function payDirectCommissionOnce(newUserId: number, referrerId: number) {
  const existing = await db
    .select({ description: income.description })
    .from(income)
    .where(and(eq(income.userId, referrerId), eq(income.type, "direct")));

  // Description format is `Direct commission for referring user #<id>` with the id
  // last, so an exact suffix match avoids `#24` falsely matching `#249`.
  const alreadyPaid = existing.some((row) => row.description?.endsWith(`#${newUserId}`));
  if (alreadyPaid) return 0;

  return payDirectCommission(newUserId, referrerId);
}

// ── Count total pairs for a user (ancestors) ───────────
// Lifetime count — used for display and matching-award milestones.
async function getTotalPairs(userId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pairs)
    .where(eq(pairs.userId, userId));
  return result[0]?.count ?? 0;
}

// ── Count pairs formed ON/AFTER the payout cutoff ──────
// Option A: pre-cutoff pairs never paid out, so they are ignored by the
// matching counter. Only this figure is compared against min(L', R').
async function getInWindowPairs(userId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pairs)
    .where(
      and(
        eq(pairs.userId, userId),
        sql`(created_at + interval '5 hours 30 minutes')::date >= ${PAYOUT_CUTOFF}::date`,
      ),
    );
  return result[0]?.count ?? 0;
}

// ── Get today's pair count (IST day) ───────────────────
async function getTodayPairs(userId: number): Promise<number> {
  const today = istToday();
  const result = await db
    .select()
    .from(dailyPairs)
    .where(and(eq(dailyPairs.userId, userId), eq(dailyPairs.pairDate, today)));
  return result[0]?.pairsCount ?? 0;
}

// ── Increment today's pair count (IST day) ─────────────
async function incrementTodayPairs(userId: number): Promise<number> {
  const today = istToday();
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
  // L'/R' count only members who are active AND activated on/after the
  // cutoff: pre-cutoff members never produced matching income, so they
  // don't count toward forming a new pair either.
  const all = await db
    .select({
      id: users.id,
      parentId: users.parentId,
      position: users.position,
      isActive: users.isActive,
      activatedAt: users.activatedAt,
    })
    .from(users);
  const parentOf = new Map(all.map((u) => [u.id, u.parentId]));
  const isActiveById = new Map(all.map((u) => [u.id, u.isActive]));
  const activatedAtById = new Map(all.map((u) => [u.id, u.activatedAt]));
  const childrenByParent = new Map<number, { id: number; position: string | null }[]>();
  for (const u of all) {
    if (u.parentId == null) continue;
    const list = childrenByParent.get(u.parentId) ?? [];
    list.push({ id: u.id, position: u.position });
    childrenByParent.set(u.parentId, list);
  }

  const countsTowardLegs = (id: number): boolean =>
    isActiveById.get(id) === true && isPayoutEligible(activatedAtById.get(id));

  // Memoized eligible-member count of a subtree (cycle-safe).
  const sizeMemo = new Map<number, number>();
  const onPath = new Set<number>();
  const legSizeOf = (id: number): number => {
    const cached = sizeMemo.get(id);
    if (cached != null) return cached;
    if (onPath.has(id)) return 0;
    onPath.add(id);
    let sum = countsTowardLegs(id) ? 1 : 0;
    for (const c of childrenByParent.get(id) ?? []) sum += legSizeOf(c.id);
    onPath.delete(id);
    sizeMemo.set(id, sum);
    return sum;
  };

  // Members already consumed by an ancestor's earlier pairs, so a new pair
  // is always built from two members that have not been paired before.
  const allPairs = await db
    .select({
      userId: pairs.userId,
      leftUserId: pairs.leftUserId,
      rightUserId: pairs.rightUserId,
    })
    .from(pairs);
  const usedByOwner = new Map<number, Set<number>>();
  for (const p of allPairs) {
    let used = usedByOwner.get(p.userId);
    if (!used) {
      used = new Set<number>();
      usedByOwner.set(p.userId, used);
    }
    if (p.leftUserId != null) used.add(p.leftUserId);
    if (p.rightUserId != null) used.add(p.rightUserId);
  }

  // Collect the still-unpaired eligible members of one leg subtree.
  const collectFree = (
    id: number,
    out: number[],
    seen: Set<number>,
    used: Set<number>,
  ): void => {
    if (seen.has(id)) return;
    seen.add(id);
    if (countsTowardLegs(id) && !used.has(id)) out.push(id);
    for (const c of childrenByParent.get(id) ?? []) collectFree(c.id, out, seen, used);
  };

  // Walk up the placement chain, checking each ancestor for pair matches
  let currentUserId: number | null = newUser[0]?.parentId ?? null;
  const seenAncestors = new Set<number>();
  while (currentUserId != null && !seenAncestors.has(currentUserId)) {
    seenAncestors.add(currentUserId);

    // Deliberately NO gate on the earner's own activation date — eligibility
    // comes purely from the legs below them, so a pre-cutoff ancestor still
    // earns from post-cutoff members it has accumulated.
    let leftLeg = 0;
    let rightLeg = 0;
    for (const child of childrenByParent.get(currentUserId) ?? []) {
      const size = legSizeOf(child.id);
      if (child.position === "left") leftLeg += size;
      else if (child.position === "right") rightLeg += size;
    }
    const possiblePairs = Math.min(leftLeg, rightLeg);
    // Option A: only pairs formed on/after the cutoff consume a slot.
    const inWindowPairs = await getInWindowPairs(currentUserId);
    const lifetimePairs = await getTotalPairs(currentUserId);
    const todayPairsCount = await getTodayPairs(currentUserId);

    // Form one pair when another match is still available and the strict
    // cap of 3 pairs per user per IST day still has room.
    if (possiblePairs > inWindowPairs && todayPairsCount < DAILY_PAIR_CAP) {
      const used = usedByOwner.get(currentUserId) ?? new Set<number>();
      const free: { left: number[]; right: number[] } = { left: [], right: [] };
      const seenMembers = new Set<number>();
      for (const child of childrenByParent.get(currentUserId) ?? []) {
        if (child.position === "left") collectFree(child.id, free.left, seenMembers, used);
        else if (child.position === "right") collectFree(child.id, free.right, seenMembers, used);
      }

      if (free.left.length > 0 && free.right.length > 0) {
        const amount = Math.round(JOINING_AMOUNT * MATCHING_INCOME_PCT / 100);

        // Record the pair with one real member from each leg
        const [newPair] = await db
          .insert(pairs)
          .values({
            userId: currentUserId,
            leftUserId: free.left[0]!,
            rightUserId: free.right[0]!,
          })
          .returning();

        if (newPair) {
          // Record income
          await db.insert(income).values({
            userId: currentUserId,
            type: "matching",
            amount,
            pairId: newPair.id,
            description: `Matching income pair #${inWindowPairs + 1}`,
          });

          // Matching income: 10% admin charge, 90% withdrawable, 0% repurchase
          await distributeCommission(currentUserId, amount);

          // Increment daily pairs
          await incrementTodayPairs(currentUserId);

          events.push({ userId: currentUserId, amount, pairId: newPair.id });

          // Check matching awards (milestones track the lifetime count)
          const newTotalPairs = lifetimePairs + 1;
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
    .set({ isActive: true, packageAmount: JOINING_AMOUNT, activatedAt: new Date() })
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

  const investment = allIncome
    .filter((i) => i.type === "investment")
    .reduce((sum, i) => sum + i.amount, 0);

  const referral = allIncome
    .filter((i) => i.type === "referral")
    .reduce((sum, i) => sum + i.amount, 0);

  const awards = allIncome.filter((i) => i.type === "award");

  // Working income family (cashback + level + performance) → 70/20/10 split
  const workingGross = allIncome
    .filter((i) => i.type === "cashback" || i.type === "level" || i.type === "performance_incentive")
    .reduce((sum, i) => sum + i.amount, 0);
  // Referral + matching credit 90% straight into the withdrawable balance
  // (see distributeCommission), so surface them alongside the 70% working split.
  const commissionWithdraw = Math.round(((direct + matching) * 90) / 100);
  const workingWithdraw = Math.round((workingGross * 70) / 100) + commissionWithdraw;

  // Per-type totals for the Total Wallet card (performance incentive + level income only)
  const performanceTotal = allIncome
    .filter((i) => i.type === "performance_incentive")
    .reduce((sum, i) => sum + i.amount, 0);
  const levelTotal = allIncome
    .filter((i) => i.type === "level")
    .reduce((sum, i) => sum + i.amount, 0);

  const walletRow = await db.select().from(wallet).where(eq(wallet.userId, userId));

  return {
    direct,
    matching,
    investment,
    referral,
    totalIncome: direct + matching + investment + referral,
    workingGross,                                              // gross working income (cashback+level+performance)
    workingWithdraw,                                           // 70% of working income (withdrawable)
    performanceTotal,                                          // gross performance-incentive credits
    levelTotal,                                                // gross level-income credits
    workingBalance: walletRow[0]?.workingBalance ?? 0,   // Gross income (no deductions)
    incomeBalance: walletRow[0]?.incomeBalance ?? 0,      // Net income (after 20%+10% deductions)
    repurchaseBalance: walletRow[0]?.repurchaseBalance ?? 0, // 20% (spendable on products)
    cashbackBalance: walletRow[0]?.cashbackBalance ?? 0,     // Monthly cashback (spendable on products)
    paid: walletRow[0]?.paid ?? false,   // true after an admin paid out (zeroed) the spendable balances
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
  const today = istToday();
  
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
  const today = istToday();
  
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
