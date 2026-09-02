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

    // Check if admin — admin sees the full tree from root
    const me = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId));
    const isAdmin = me[0]?.isAdmin;

    // Admin sees deep tree (50 levels), users see 3 levels of their downline
    const depth = isAdmin ? 50 : 3;
    const rootId = isAdmin ? 1 : userId;
    const tree = await buildTree(rootId, depth);
    return { tree };
  });
