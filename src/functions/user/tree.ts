import { createServerFn } from "@tanstack/react-start";
import { db } from "../../lib/db";
import { users } from "../../lib/db/schema";
import { eq } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

async function getAuthUserId(): Promise<number> {
  const token = getCookie("auth_token");
  if (!token) throw new Error("Not authenticated");
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload || typeof payload["userId"] !== "number") throw new Error("Not authenticated");
  return payload["userId"] as number;
}

// Check if the real user behind the session is admin (handles impersonation)
async function isRealAdmin(): Promise<boolean> {
  const token = getCookie("auth_token");
  if (!token) return false;
  const { verifyJwt } = await import("../../lib/auth");
  const payload = await verifyJwt(token);
  if (!payload) return false;

  // If impersonating, check if the impersonator (real admin) is admin
  const impersonatorId = payload["impersonatorId"] as number | undefined;
  if (impersonatorId) {
    const admin = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, impersonatorId));
    return !!admin[0]?.isAdmin;
  }

  // Not impersonating — check if current user is admin
  const userId = payload["userId"] as number;
  const me = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
  return !!me[0]?.isAdmin;
}

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

async function buildTree(userId: number, depth: number): Promise<TreeNode | null> {
  if (depth < 0) return null;

  const result = await db
    .select({ id: users.id, name: users.name, referralCode: users.referralCode, isActive: users.isActive, rank: users.rank, position: users.position })
    .from(users)
    .where(eq(users.id, userId));

  if (result.length === 0) return null;

  const user = result[0]!;

  // Find left and right children
  const leftChild = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.parentId, userId));

  let left: TreeNode | null = null;
  let right: TreeNode | null = null;

  for (const child of leftChild) {
    const childUser = await db.select({ position: users.position }).from(users).where(eq(users.id, child.id));
    const pos = childUser[0]?.position;
    if (pos === "left") {
      left = await buildTree(child.id, depth - 1);
    } else if (pos === "right") {
      right = await buildTree(child.id, depth - 1);
    }
  }

  return {
    id: user.id,
    name: user.name,
    referralCode: user.referralCode,
    isActive: user.isActive,
    rank: user.rank || "bronze",
    position: user.position,
    left,
    right,
  };
}

// ── Get tree visualization (admin: full tree, users: their downline only) ──
export const getTreeVisualization = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getAuthUserId();

    // Check if real user is admin (handles impersonation too)
    const admin = await isRealAdmin();

    // Admin sees deep tree (50 levels), users see 3 levels of their downline
    const depth = admin ? 50 : 3;
    const rootId = admin ? 1 : userId;
    const tree = await buildTree(rootId, depth);
    return { tree };
  });
