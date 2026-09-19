import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function check() {
  // Find PR2026
  const pr2026 = await db.select().from(users).where(eq(users.referralCode, "PR2026"));
  if (pr2026.length === 0) { console.log("PR2026 not found"); return; }
  const root = pr2026[0]!;
  console.log("Root:", root.id, root.name, root.referralCode, "parentId:", root.parentId);

  // Get ALL users
  const allUsers = await db.select().from(users);
  console.log("Total users in DB:", allUsers.length);

  // Build parent map
  const childrenOf = new Map<number, typeof allUsers>();
  for (const u of allUsers) {
    if (u.parentId) {
      if (!childrenOf.has(u.parentId)) childrenOf.set(u.parentId, []);
      childrenOf.get(u.parentId)!.push(u);
    }
  }

  // BFS from PR2026
  const visited = new Set<number>([root.id]);
  let queue = [root.id];
  let total = 0;
  let level = 0;
  while (queue.length > 0) {
    const next: number[] = [];
    let levelCount = 0;
    for (const pid of queue) {
      const kids = childrenOf.get(pid) || [];
      for (const k of kids) {
        if (!visited.has(k.id)) {
          visited.add(k.id);
          total++;
          levelCount++;
          next.push(k.id);
        }
      }
    }
    if (levelCount > 0) console.log(`  Level ${level}: ${levelCount} members`);
    level++;
    queue = next;
  }
  console.log("Total descendants of PR2026:", total);

  // Direct children
  const direct = childrenOf.get(root.id) || [];
  console.log("\nDirect children:", direct.length);
  for (const d of direct) {
    console.log(`  ${d.id} ${d.name} ${d.referralCode} pos=${d.position} active=${d.isActive} parentId=${d.parentId}`);
    // Check their children too
    const grandchildren = childrenOf.get(d.id) || [];
    console.log(`    -> ${grandchildren.length} children`);
    for (const gc of grandchildren) {
      console.log(`       ${gc.id} ${gc.name} ${gc.referralCode} pos=${gc.position} active=${gc.isActive} parentId=${gc.parentId}`);
    }
  }

  // Check for orphan parentId references
  const idSet = new Set(allUsers.map(u => u.id));
  let orphans = 0;
  for (const u of allUsers) {
    if (u.parentId && !idSet.has(u.parentId)) {
      console.log(`ORPHAN: ${u.id} ${u.name} has parentId=${u.parentId} which doesn't exist`);
      orphans++;
    }
  }
  console.log("\nOrphan parentId references:", orphans);
}

check().catch(console.error);
