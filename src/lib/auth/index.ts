import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, wallet } from "../db/schema";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ── Password hashing (Web Crypto API, no bcrypt dependency) ──────
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// ── JWT (lightweight, no jsonwebtoken dependency) ──────
function base64url(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(data: string): string {
  let str = data.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

export function signJwt(payload: Record<string, unknown>, expiresInSec = 60 * 60 * 24 * 7): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const data = `${header}.${body}`;
  // HMAC-SHA256 via Web Crypto — sync-ish for small payloads
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const data = `${header}.${body}`;
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    if (signature !== expected) return null;
    const payload = JSON.parse(base64urlDecode(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Session helpers ────────────────────────────────────
export function setAuthCookie(token: string): string {
  return `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearAuthCookie(): string {
  return "auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

export function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  return match ? match[1] : null;
}

export function getUserFromRequest(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload || typeof payload.userId !== "number") return null;
  return payload;
}

// ── Generate referral code ─────────────────────────────
export function generateReferralCode(userId: number): string {
  return `PJ${String(userId).padStart(5, "0")}`;
}

// ── Seed admin ─────────────────────────────────────────
export async function seedAdmin() {
  const existing = await db.select().from(users).where(eq(users.email, "admin"));
  if (existing.length > 0) return;

  const passwordHash = await hashPassword("Primenew@1111");
  const [admin] = await db
    .insert(users)
    .values({
      name: "Admin",
      email: "admin",
      passwordHash,
      referralCode: "ADMIN0",
      isActive: true,
      isAdmin: true,
      packageAmount: 2999,
    })
    .returning();

  await db.insert(wallet).values({ userId: admin.id, balance: 0, totalEarned: 0 });
  console.log(`[seed] Admin user created (id=${admin.id})`);
}
