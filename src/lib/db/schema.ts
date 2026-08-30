import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// ── Users ──────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: integer("referred_by").references((): any => users.id),
  parentId: integer("parent_id").references((): any => users.id),
  position: text("position", { enum: ["left", "right"] }),
  isActive: boolean("is_active").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  packageAmount: integer("package_amount").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Pairs (matching income events) ────────────────────
export const pairs = pgTable("pairs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  leftUserId: integer("left_user_id").references(() => users.id).notNull(),
  rightUserId: integer("right_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Income ledger ──────────────────────────────────────
export const income = pgTable("income", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["direct", "matching", "award"] }).notNull(),
  amount: integer("amount").notNull(),
  pairId: integer("pair_id").references(() => pairs.id),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Wallet ─────────────────────────────────────────────
export const wallet = pgTable("wallet", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  balance: integer("balance").default(0).notNull(),
  totalEarned: integer("total_earned").default(0).notNull(),
});

// ── Matching awards ────────────────────────────────────
export const matchingAwards = pgTable("matching_awards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  totalPairs: integer("total_pairs").notNull(),
  awardName: text("award_name").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
});

// ── Daily pair tracking (for 3-pair cap) ───────────────
export const dailyPairs = pgTable("daily_pairs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  pairDate: text("pair_date").notNull(), // YYYY-MM-DD
  pairsCount: integer("pairs_count").default(0).notNull(),
}, (table) => ({
  userDateUnique: uniqueIndex("user_date_unique").on(table.userId, table.pairDate),
}));
