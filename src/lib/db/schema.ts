import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex, real } from "drizzle-orm/pg-core";

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
  rank: text("rank", { enum: ["bronze", "silver", "gold", "platinum"] }).default("bronze").notNull(),
  phone: text("phone"),
  profileImage: text("profile_image"),
  onboardingDone: boolean("onboarding_done").default(false).notNull(),
  darkMode: boolean("dark_mode").default(false).notNull(),
  totalInvested: real("total_invested").default(0).notNull(),
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
  type: text("type", { enum: ["direct", "matching", "award", "cashback", "daily_activation"] }).notNull(),
  amount: integer("amount").notNull(),
  pairId: integer("pair_id").references(() => pairs.id),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Wallet ─────────────────────────────────────────────
// workingBalance  = gross income (user sees ALL income, no deductions)
// incomeBalance   = net income after 20% repurchase + 10% admin = 70% (withdrawable)
// repurchaseBalance = 20% of every income (spendable on products)
// cashbackBalance = monthly cashback = 30% of self business (spendable on products)
export const wallet = pgTable("wallet", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  workingBalance: integer("working_balance").default(0).notNull(),
  incomeBalance: integer("income_balance").default(0).notNull(),
  repurchaseBalance: integer("repurchase_balance").default(0).notNull(),
  cashbackBalance: integer("cashback_balance").default(0).notNull(),
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

// ── Withdrawals ───────────────────────────────────────
export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  adminNote: text("admin_note"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// ── Daily pair tracking (for 3-pair cap) ───────────────
export const dailyPairs = pgTable("daily_pairs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  pairDate: text("pair_date").notNull(),
  pairsCount: integer("pairs_count").default(0).notNull(),
}, (table) => ({
  userDateUnique: uniqueIndex("user_date_unique").on(table.userId, table.pairDate),
}));

// ── Notifications ──────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["referral", "pair_match", "commission", "award", "withdrawal", "kyc", "rank", "general", "announcement"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── KYC Verification ──────────────────────────────────
export const kyc = pgTable("kyc", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  panNumber: text("pan_number"),
  aadhaarNumber: text("aadhaar_number"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Share tracking ─────────────────────────────────────
export const shareClicks = pgTable("share_clicks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  platform: text("platform", { enum: ["whatsapp", "copy", "other"] }).notNull(),
  leg: text("leg", { enum: ["left", "right"] }),
  clickedAt: timestamp("clicked_at").defaultNow().notNull(),
});

// ── Achievements ───────────────────────────────────────
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  badge: text("badge").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// ── Announcements ──────────────────────────────────────
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority", { enum: ["normal", "important", "urgent"] }).default("normal").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Gold price alerts ──────────────────────────────────
export const goldPriceAlerts = pgTable("gold_price_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  targetPrice: integer("target_price").notNull(),
  direction: text("direction", { enum: ["below", "above"] }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  triggeredAt: timestamp("triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Gold rates (admin-set daily rates) ─────────────────
export const goldRates = pgTable("gold_rates", {
  id: serial("id").primaryKey(),
  price: real("price").notNull(),
  setBy: integer("set_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Daily activation tracking ──────────────────────────
export const dailyActivations = pgTable("daily_activations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  activationDate: text("activation_date").notNull(),
  rewardAmount: integer("reward_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userDateUnique: uniqueIndex("daily_activation_user_date_unique").on(table.userId, table.activationDate),
}));

// ── Activation Pins (admin-generated, user-activated) ──
export const activationPins = pgTable("activation_pins", {
  id: serial("id").primaryKey(),
  pin: text("pin").notNull().unique(),
  isUsed: boolean("is_used").default(false).notNull(),
  generatedBy: integer("generated_by").references(() => users.id).notNull(),
  usedBy: integer("used_by").references(() => users.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Investment Packages (tier-based monthly return rates) ──
export const investmentPackages = pgTable("investment_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  minAmount: real("min_amount").notNull(),
  maxAmount: real("max_amount").notNull(),
  monthlyReturnPct: real("monthly_return_pct").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Purchases (gold jewellery purchases) ──────────────
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  carat: integer("carat").notNull(),
  weight: real("weight").notNull(),
  goldRatePerGram: real("gold_rate_per_gram").notNull(),
  goldValue: real("gold_value").notNull(),
  makingCharges: real("making_charges").default(0).notNull(),
  gst: real("gst").notNull(),
  hallmarkCharges: real("hallmark_charges").default(0).notNull(),
  totalAmount: real("total_amount").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "stopped", "cancelled"] }).default("pending").notNull(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  stoppedAt: timestamp("stopped_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdByAdmin: boolean("created_by_admin").default(false).notNull(),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Investments (linked to purchases, monthly returns) ──
export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  purchaseId: integer("purchase_id").references(() => purchases.id).notNull(),
  packageId: integer("package_id").references(() => investmentPackages.id).notNull(),
  amount: real("amount").notNull(),
  monthlyReturnPct: real("monthly_return_pct").notNull(),
  monthlyReturnAmount: real("monthly_return_amount").notNull(),
  status: text("status", { enum: ["active", "completed", "stopped", "cancelled"] }).default("active").notNull(),
  totalReturnsPaid: real("total_returns_paid").default(0).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  stoppedAt: timestamp("stopped_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
