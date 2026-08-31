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

// ── JWT (lightweight, Web Crypto API — no Node.js crypto dependency) ──
function base64url(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(data: string): string {
  let str = data.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

function base64urlBuf(data: string): Uint8Array {
  return Uint8Array.from(base64urlDecode(data), (c) => c.charCodeAt(0));
}

async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64url(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBuf = Uint8Array.from(base64urlDecode(signature), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, sigBuf, encoder.encode(data));
}

export async function signJwt(payload: Record<string, unknown>, expiresInSec = 60 * 60 * 24 * 7): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const data = `${header}.${body}`;
  const signature = await hmacSign(data);
  return `${data}.${signature}`;
}

export async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const data = `${header}.${body}`;
    const valid = await hmacVerify(data, signature);
    if (!valid) return null;
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

export async function getUserFromRequest(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== "number") return null;
  return payload;
}

// ── Generate referral code ─────────────────────────────
export function generateReferralCode(userId: number): string {
  return `PR${String(userId).padStart(4, "0")}`;
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
      referralCode: "PR0000",
      isActive: true,
      isAdmin: true,
      packageAmount: 2999,
    })
    .returning();

  await db.insert(wallet).values({ userId: admin.id, balance: 0, totalEarned: 0 });
  console.log(`[seed] Admin user created (id=${admin.id})`);
}
