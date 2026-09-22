/**
 * Backfill script: restructure the binary tree with proper spillover.
 *
 * Strategy:
 *   1. Read every user ordered by id (oldest first = earliest joiner goes first).
 *   2. For each user who has a referredBy, find the correct spillover slot
 *      under the referrer's tree and place them there.
 *   3. Users with no referredBy stay as-is (root users).
 *
 * This fixes the legacy bug where placeInTree set parentId = referrerId
 * directly without spillover, causing all directs to stack on one node.
 *
 * Run with: npx tsx scripts/backfill-tree-spillover.ts
 */

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

type DBUser = {
  id: number;
  name: string;
  referred_by: number | null;
  parent_id: number | null;
  position: string | null;
};

type Slot = { parentId: number; position: "left" | "right" };

// ── Find extreme outer leaf on a given side (always follow same side) ──
function findExtremeSlotSync(
  sideRootId: number,
  side: "left" | "right",
  childrenMap: Map<number, { left: number | null; right: number | null }>
): Slot {
  let cur = sideRootId;
  while (true) {
    const slots = childrenMap.get(cur);
    if (!slots) return { parentId: cur, position: side };
    const sideChild = side === "left" ? slots.left : slots.right;
    if (sideChild === null || sideChild === undefined) return { parentId: cur, position: side };
    cur = sideChild;
  }
}

async function main() {
  console.log("=== Backfill: Restructure binary tree with spillover ===\n");

  // 1. Fetch ALL users ordered by id
  const allUsers = (await sql`
    SELECT id, name, referred_by, parent_id, position
    FROM users
    ORDER BY id ASC
  `) as unknown as DBUser[];

  console.log(`Total users: ${allUsers.length}`);

  // 2. Build a map of userId -> referredBy for quick lookup
  const referredByMap = new Map<number, number | null>();
  for (const u of allUsers) {
    referredByMap.set(u.id, u.referred_by);
  }

  // 3. Build children map as we go (tracks which slots are taken)
  const childrenMap = new Map<number, { left: number | null; right: number | null }>();

  // Helper: register a placement
  function registerPlacement(parentId: number, childId: number, position: "left" | "right") {
    let slots = childrenMap.get(parentId);
    if (!slots) {
      slots = { left: null, right: null };
      childrenMap.set(parentId, slots);
    }
    if (position === "left") slots.left = childId;
    else slots.right = childId;
  }

  // 4. Process each user — extreme outer-leg logic
  let placed = 0;
  let skipped = 0;
  let rootUsers = 0;
  const updates: { userId: number; parentId: number; position: string }[] = [];
  const directCountMap = new Map<number, number>(); // referrerId -> how many directs already placed

  for (const user of allUsers) {
    const referrerId = referredByMap.get(user.id);

    // Root users (no referrer) — keep as-is
    if (!referrerId) {
      rootUsers++;
      continue;
    }

    // Determine slot using extreme outer-leg rule:
    // 1st direct -> left under referrer, 2nd -> right, rest -> alternate extreme bottom
    const count = directCountMap.get(referrerId) ?? 0;
    let slot: Slot;
    try {
      if (count === 0) {
        slot = { parentId: referrerId, position: "left" };
      } else if (count === 1) {
        slot = { parentId: referrerId, position: "right" };
      } else {
        const targetSide: "left" | "right" = count % 2 === 0 ? "left" : "right";
        const refSlots = childrenMap.get(referrerId);
        const sideRootId = targetSide === "left" ? refSlots?.left : refSlots?.right;
        if (!sideRootId) throw new Error(`Referrer ${referrerId} missing ${targetSide} leg for extreme spill`);
        slot = findExtremeSlotSync(sideRootId, targetSide, childrenMap);
      }
    } catch (e: any) {
      console.log(`  SKIP user ${user.id} (${user.name}): ${e.message}`);
      skipped++;
      continue;
    }

    // If the user is already correctly placed, skip but still count it
    if (user.parent_id === slot.parentId && user.position === slot.position) {
      registerPlacement(slot.parentId, user.id, slot.position);
      directCountMap.set(referrerId, count + 1);
      continue;
    }

    // Track direct count for this referrer
    directCountMap.set(referrerId, count + 1);

    // Record the update
    updates.push({ userId: user.id, parentId: slot.parentId, position: slot.position });
    registerPlacement(slot.parentId, user.id, slot.position);
    placed++;
  }

  console.log(`\nUsers to update: ${placed}`);
  console.log(`Users skipped (already correct): ${skipped}`);
  console.log(`Root users (no referrer): ${rootUsers}`);

  if (updates.length === 0) {
    console.log("\nNo updates needed. Tree is already correct.");
    return;
  }

  // 5. Apply updates in a transaction
  console.log("\nApplying updates...");

  // Begin transaction
  await sql`BEGIN`;

  try {
    for (const update of updates) {
      await sql`
        UPDATE users
        SET parent_id = ${update.parentId}, position = ${update.position}
        WHERE id = ${update.userId}
      `;
    }
    await sql`COMMIT`;
    console.log(`Successfully updated ${updates.length} users.`);
  } catch (e: any) {
    await sql`ROLLBACK`;
    console.error("Transaction failed, rolled back:", e.message);
    throw e;
  }

  // 6. Print summary of some key users
  console.log("\n=== Sample: First few users' placements ===");
  const sample = updates.slice(0, 20);
  for (const u of sample) {
    console.log(`  User #${u.userId} → parent #${u.parentId} (${u.position})`);
  }
  if (updates.length > 20) {
    console.log(`  ... and ${updates.length - 20} more`);
  }

  // 7. Check specific user PR4895's tree
  console.log("\n=== PR4895's direct referrals (first 22) ===");
  const pr4895Directs = updates.filter((u) => {
    const ref = referredByMap.get(u.userId);
    return ref !== undefined && ref !== null;
  });

  // Find PR4895's id by looking at referral codes
  const pr4895Rows: any[] = await sql`SELECT id FROM users WHERE referral_code = 'PR4895'`;
  if (pr4895Rows.length > 0) {
    const pr4895Id = pr4895Rows[0].id;
    const directsPlaced = updates.filter((u) => {
      // These are users whose referredBy is pr4895Id
      const ref = referredByMap.get(u.userId);
      return ref === pr4895Id;
    });
    console.log(`PR4895 (id=${pr4895Id}) has ${directsPlaced.length} directs being restructured`);
    for (const d of directsPlaced) {
      console.log(`  User #${d.userId} → parent #${d.parentId} (${d.position})`);
    }
  } else {
    console.log("PR4895 not found in database");
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
