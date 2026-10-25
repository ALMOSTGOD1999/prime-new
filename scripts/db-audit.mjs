import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const JOINING = 2999;
const DIRECT = Math.round((JOINING * 5) / 100); // 150
const MATCH = Math.round((JOINING * 20) / 100); // 600

const one = async (q) => (await q)[0];
const line = (k, v) => console.log(String(k).padEnd(34) + v);

console.log("=== 1. PAIR / INCOME INTEGRITY ===");
const totalPairs = await one(sql`SELECT count(*)::int AS n FROM pairs`);
const totalIncome = await one(sql`SELECT count(*)::int AS n FROM income`);
line("pairs rows", totalPairs.n);
line("income rows", totalIncome.n);

const byType = await sql`SELECT type, count(*)::int AS n FROM income GROUP BY type ORDER BY type`;
for (const r of byType) line(`  income type=${r.type}`, r.n);

const orphan = await one(sql`
  SELECT count(*)::int AS n, count(DISTINCT p.user_id)::int AS users
  FROM pairs p
  WHERE NOT EXISTS (SELECT 1 FROM income i WHERE i.pair_id = p.id)`);
line("ORPHAN pairs (no income row)", orphan.n);
line("  distinct pair owners", orphan.users);
line("  matching owed (600 ea)", "\u20b9" + (orphan.n * MATCH).toLocaleString("en-IN"));

const dangling = await one(sql`
  SELECT count(*)::int AS n FROM income i
  WHERE i.pair_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pairs p WHERE p.id = i.pair_id)`);
line("dangling income.pair_id", dangling.n);

console.log("\n--- top 15 orphaned pair owners ---");
const orphanByUser = await sql`
  SELECT p.user_id, u.referral_code, count(*)::int AS n
  FROM pairs p JOIN users u ON u.id = p.user_id
  WHERE NOT EXISTS (SELECT 1 FROM income i WHERE i.pair_id = p.id)
  GROUP BY 1, 2 ORDER BY n DESC LIMIT 15`;
for (const r of orphanByUser) line(`  ${r.referral_code} (#${r.user_id})`, r.n + " pairs = \u20b9" + (r.n * MATCH).toLocaleString("en-IN"));

console.log("\n=== 2. DIRECT COMMISSIONS OWED ===");
const directOwed = await one(sql`
  SELECT count(*)::int AS n, count(DISTINCT u.id)::int AS users
  FROM users u
  WHERE u.is_active = true
    AND u.referred_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM income i
      WHERE i.user_id = u.referred_by AND i.type = 'direct'
        AND i.description LIKE '%#' || u.id)`);
line("active users w/ referrer, unpaid", directOwed.n);
line("  distinct referrers", directOwed.users);
line("  direct owed (150 ea)", "\u20b9" + (directOwed.n * DIRECT).toLocaleString("en-IN"));

console.log("\n--- top 15 referrers owed direct ---");
const directByRef = await sql`
  SELECT u.referred_by AS rid, ru.referral_code, count(*)::int AS n
  FROM users u JOIN users ru ON ru.id = u.referred_by
  WHERE u.is_active = true AND u.referred_by IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM income i WHERE i.user_id = u.referred_by AND i.type = 'direct'
                    AND i.description LIKE '%#' || u.id)
  GROUP BY 1, 2 ORDER BY n DESC LIMIT 15`;
for (const r of directByRef) line(`  ${r.referral_code} (#${r.rid})`, r.n + " refs = \u20b9" + (r.n * DIRECT).toLocaleString("en-IN"));

console.log("\n=== 3. SANITY ===");
const act = await one(sql`SELECT min(activated_at)::text AS min_a, max(activated_at)::text AS max_a,
  count(*) FILTER (WHERE is_active)::int AS active FROM users`);
line("active users", act.active);
line("activated_at range", `${act.min_a} .. ${act.max_a}`);
const noPkg = await one(sql`SELECT count(*)::int AS n FROM users WHERE is_active = true AND package_amount = 0`);
const noAct = await one(sql`SELECT count(*)::int AS n FROM users WHERE is_active = true AND activated_at IS NULL`);
line("active w/ package_amount=0", noPkg.n);
line("active w/ activated_at NULL", noAct.n);
const seq = await one(sql`SELECT last_value::int AS n FROM income_id_seq`);
const pseq = await one(sql`SELECT last_value::int AS n FROM pairs_id_seq`);
line("income seq last_value", seq.n);
line("pairs seq last_value", pseq.n);

console.log("\n=== 4. WALLET TOTALS (BEFORE) ===");
const w = await one(sql`SELECT
  coalesce(sum(working_balance),0)::int AS working,
  coalesce(sum(income_balance),0)::int AS income,
  coalesce(sum(repurchase_balance),0)::int AS repurchase,
  coalesce(sum(total_earned),0)::int AS earned,
  count(*)::int AS wallets FROM wallet`);
line("wallets", w.wallets);
line("  working_balance", "\u20b9" + w.working.toLocaleString("en-IN"));
line("  income_balance", "\u20b9" + w.income.toLocaleString("en-IN"));
line("  repurchase_balance", "\u20b9" + w.repurchase.toLocaleString("en-IN"));
line("  total_earned", "\u20b9" + w.earned.toLocaleString("en-IN"));

console.log("\n=== 5. GRAND TOTAL OWED (Option B) ===");
line("matching", "\u20b9" + (orphan.n * MATCH).toLocaleString("en-IN"));
line("direct", "\u20b9" + (directOwed.n * DIRECT).toLocaleString("en-IN"));
line("TOTAL", "\u20b9" + (orphan.n * MATCH + directOwed.n * DIRECT).toLocaleString("en-IN"));
console.log(`\nper-event split (distributeIncome): gross -> repurchase round(g*0.2) + income round(g*0.7), 10% wiped`);
console.log(`matching gross=${MATCH} -> rep ${Math.round(MATCH * 0.2)} / inc ${Math.round(MATCH * 0.7)}`);
console.log(`direct   gross=${DIRECT} -> rep ${Math.round(DIRECT * 0.2)} / inc ${Math.round(DIRECT * 0.7)}`);
