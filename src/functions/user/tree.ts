import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

async function isRealAdmin(): Promise<boolean> {
  const token = getCookie("auth_token");
  if (!token) return false;
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload) return false;
  const impersonatorId = payload["impersonatorId"] as number | undefined;
  if (impersonatorId) {
    const admin = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, impersonatorId));
    return !!admin[0]?.isAdmin;
  }
  const userId = payload["userId"] as number;
  const me = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  return !!me[0]?.isAdmin;
}

// ── Types ──
type TreeNode = {
  id: number;
  name: string;
  referralCode: string;
  isActive: boolean;
  rank: string;
  position: string | null;
  left: TreeNode | null;
  right: TreeNode | null;
};

type LevelUser = {
  id: number;
  name: string;
  referralCode: string;
  isActive: boolean;
  rank: string;
  position: string | null;
  parentId: number | null;
};

type FlatUser = {
  id: number;
  name: string;
  referralCode: string;
  isActive: boolean;
  rank: string | null;
  position: string | null;
  parentId: number | null;
  packageAmount: number | null;
};

// ── Efficient batch fetch: get all descendants of a root user via BFS ──
async function fetchAllDescendants(rootId: number): Promise<FlatUser[]> {
  // First, fetch the root user
  const rootResult = await db
    .select({
      id: users.id,
      name: users.name,
      referralCode: users.referralCode,
      isActive: users.isActive,
      rank: users.rank,
      position: users.position,
      parentId: users.parentId,
      packageAmount: users.packageAmount,
    })
    .from(users)
    .where(eq(users.id, rootId));

  if (rootResult.length === 0) return [];

  const allUsers: FlatUser[] = [rootResult[0]!];
  const seen = new Set<number>([rootId]);
  let queue = [rootId];

  // BFS to find all descendants
  while (queue.length > 0) {
    // Fetch children of all users in current queue
    const children = await db
      .select({
        id: users.id,
        name: users.name,
        referralCode: users.referralCode,
        isActive: users.isActive,
        rank: users.rank,
        position: users.position,
        parentId: users.parentId,
        packageAmount: users.packageAmount,
      })
      .from(users);

    // Filter to only children of queue members that we haven't seen
    const newChildren: FlatUser[] = [];
    const childIds: number[] = [];
    for (const child of children) {
      if (child.parentId && queue.includes(child.parentId) && !seen.has(child.id)) {
        newChildren.push(child);
        seen.add(child.id);
        childIds.push(child.id);
      }
    }

    allUsers.push(...newChildren);
    queue = childIds;
  }

  return allUsers;
}

// ── More efficient: fetch all users at once, filter in memory ──
async function fetchAllUsersInTree(rootId: number): Promise<FlatUser[]> {
  // Fetch ALL users in one query
  const allDbUsers = await db
    .select({
      id: users.id,
      name: users.name,
      referralCode: users.referralCode,
      isActive: users.isActive,
      rank: users.rank,
      position: users.position,
      parentId: users.parentId,
      packageAmount: users.packageAmount,
    })
    .from(users);

  // Build parent->children map and find all descendants of rootId via BFS
  const childrenOf = new Map<number, FlatUser[]>();
  const userMap = new Map<number, FlatUser>();

  for (const u of allDbUsers) {
    userMap.set(u.id, u);
    if (u.parentId) {
      const list = childrenOf.get(u.parentId) || [];
      list.push(u);
      childrenOf.set(u.parentId, list);
    }
  }

  // BFS from rootId to collect all descendants (including root itself)
  const rootUser = userMap.get(rootId);
  if (!rootUser) return [];
  const result: FlatUser[] = [rootUser];
  const visited = new Set<number>([rootId]);
  let queue = [rootId];

  while (queue.length > 0) {
    const nextQueue: number[] = [];
    for (const pid of queue) {
      const kids = childrenOf.get(pid) || [];
      for (const kid of kids) {
        if (!visited.has(kid.id)) {
          visited.add(kid.id);
          result.push(kid);
          nextQueue.push(kid.id);
        }
      }
    }
    queue = nextQueue;
  }

  return result;
}

// ── Build binary tree from flat user list (zero DB queries) ──
function buildTreeFromFlat(rootId: number, descendants: FlatUser[]): TreeNode | null {
  const userMap = new Map<number, FlatUser>();
  for (const u of descendants) {
    userMap.set(u.id, u);
  }
  // Also add root if not in descendants (shouldn't happen, but safety)
  // Build children position map
  const leftChild = new Map<number, number>();
  const rightChild = new Map<number, number>();

  for (const u of descendants) {
    if (u.parentId) {
      if (u.position === "left") leftChild.set(u.parentId, u.id);
      else if (u.position === "right") rightChild.set(u.parentId, u.id);
    }
  }

  function buildNode(id: number): TreeNode | null {
    const user = userMap.get(id);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      referralCode: user.referralCode,
      isActive: user.isActive,
      rank: user.rank || "bronze",
      position: user.position,
      left: leftChild.has(id) ? buildNode(leftChild.get(id)!) : null,
      right: rightChild.has(id) ? buildNode(rightChild.get(id)!) : null,
    };
  }

  return buildNode(rootId);
}

// ── Build level tree from flat user list (BFS grouping) ──
function buildLevelTree(rootId: number, descendants: FlatUser[]): LevelUser[][] {
  const userMap = new Map<number, FlatUser>();
  const childrenOf = new Map<number, FlatUser[]>();

  for (const u of descendants) {
    userMap.set(u.id, u);
    if (u.parentId) {
      const list = childrenOf.get(u.parentId) || [];
      list.push(u);
      childrenOf.set(u.parentId, list);
    }
  }

  const levels: LevelUser[][] = [];
  let queue = [rootId];

  while (queue.length > 0) {
    const levelUsers: LevelUser[] = [];
    const nextQueue: number[] = [];

    for (const id of queue) {
      const kids = childrenOf.get(id) || [];
      for (const kid of kids) {
        levelUsers.push({
          id: kid.id,
          name: kid.name,
          referralCode: kid.referralCode,
          isActive: kid.isActive,
          rank: kid.rank || "bronze",
          position: kid.position,
          parentId: kid.parentId,
        });
        nextQueue.push(kid.id);
      }
    }

    if (levelUsers.length === 0) break;
    levels.push(levelUsers);
    queue = nextQueue;
  }

  return levels;
}

// ══════════════════════════════════════════════════════════
// Server Functions
// ══════════════════════════════════════════════════════════

// Find the root of the org tree: user with no parentId, or user 1, or the earliest user
async function findOrgRoot(): Promise<number> {
  // Try user 1 first
  const u1 = await db.select({ id: users.id }).from(users).where(eq(users.id, 1));
  if (u1.length > 0) return 1;

  // Find user with no parent (the actual root)
  const root = await db.select({ id: users.id }).from(users).where(isNull(users.parentId)).limit(1);
  if (root.length > 0) return root[0]!.id;

  // Fallback: earliest user
  const first = await db.select({ id: users.id }).from(users).orderBy(users.id).limit(1);
  return first[0]?.id ?? 1;
}

// ── Get binary tree visualization ──
export const getTreeVisualization = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const admin = await isRealAdmin();
    const rootId = admin ? await findOrgRoot() : userId;
    const descendants = await fetchAllUsersInTree(rootId);
    const tree = buildTreeFromFlat(rootId, descendants);
    return { tree };
  });

// ── Get level tree visualization ──
export const getLevelTree = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const admin = await isRealAdmin();
    const rootId = admin ? await findOrgRoot() : userId;
    const descendants = await fetchAllUsersInTree(rootId);
    const levels = buildLevelTree(rootId, descendants);
    return { levels, rootId };
  });

// ── Get team stats ──
export const getTeamStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();
    const descendants = await fetchAllUsersInTree(userId);

    // Direct team = immediate children
    const directTeam = descendants.filter((u) => u.parentId === userId);

    // Total team = all descendants
    const totalTeam = descendants.length;

    // Active team
    const activeTeam = descendants.filter((u) => u.isActive).length;

    // Total business = sum of packageAmount of all descendants
    const totalBusiness = descendants.reduce((sum, u) => sum + (u.packageAmount || 0), 0);

    // Direct team left/right counts
    const leftCount = directTeam.filter((u) => u.position === "left").length;
    const rightCount = directTeam.filter((u) => u.position === "right").length;

    return {
      directTeam: directTeam.length,
      leftCount,
      rightCount,
      totalTeam,
      activeTeam,
      totalBusiness,
    };
  });
