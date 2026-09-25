import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();
const sql = neon(process.env.DATABASE_URL);

// ── Cashback: new tiers 3% / 3.5% / 4%, cap 60% ────────
const TIERS = [
  { min: 500000, rate: 4 },
  { min: 200000, rate: 3.5 },
  { min: 0, rate: 3 },
];
const rateFor = (v) => (TIERS.find((t) => v >= t.min) ?? TIERS[2]).rate;

// ── Performance: 12 ranks, installment mode ────────────
const RANKS = [
  ["STARTER", 500000, 1999], ["STARTER ELITE", 1000000, 3499], ["BRONZE", 2500000, 9999],
  ["SILVER", 5000000, 19499], ["GOLD", 10000000, 39999], ["PLATINUM", 30000000, 79999],
  ["EMERALD", 50000000, 129999], ["RUBY", 100000000, 199999], ["SAPPHIRE", 250000000, 259999],
  ["TOPAZ", 500000000, 449999], ["DIAMOND", 1000000000, 799999], ["CROWN", 3000000000, 1499999],
];
const MONTHS = 6;

// ── Cashback dry run ──
const eligible = await sql`
  SELECT p.id, p.user_id, p.total_amount, u.name
  FROM purchases p JOIN users u ON u.id = p.user_id
  WHERE p.status = 'approved' AND p.total_amount >= 10000
  ORDER BY p.total_amount DESC
`;
const enrolled = await sql`SELECT purchase_id FROM cashback_ledger`;
const enrolledSet = new Set(enrolled.map((r) => r.purchase_id));
const newOnes = eligible.filter((p) => !enrolledSet.has(p.id));

console.log(`\n=== CASHBACK DRY RUN (3% / 3.5% / 4%, cap 60%) ===`);
console.log(`Approved purchases >= 10k: ${eligible.length} | already enrolled: ${eligible.length - newOnes.length} | would enroll: ${newOnes.length}`);
let monthlyTotal = 0;
for (const p of newOnes) {
  const v = Math.round(Number(p.total_amount));
  const rate = rateFor(v);
  const monthly = Math.round((v * rate) / 100);
  const cap = Math.round(v * 0.6);
  monthlyTotal += monthly;
  console.log(`  #${p.id} ${p.name}: ₹${v.toLocaleString("en-IN")} @ ${rate}% → ₹${monthly.toLocaleString("en-IN")}/mo, cap ₹${cap.toLocaleString("en-IN")} (${Math.ceil(cap / monthly)} months)`);
}
console.log(`First-run monthly payout: ₹${monthlyTotal.toLocaleString("en-IN")} gross → 70/20/10 = ₹${Math.round(monthlyTotal * 0.7).toLocaleString("en-IN")} withdraw / ₹${Math.round(monthlyTotal * 0.2).toLocaleString("en-IN")} repurchase / ₹${Math.round(monthlyTotal * 0.1).toLocaleString("en-IN")} admin`);

// ── Performance: last-30-day team business ──
const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const sales = await sql`
  SELECT user_id, COALESCE(SUM(total_amount), 0) AS amt
  FROM purchases
  WHERE status = 'approved' AND created_at >= ${since}
  GROUP BY user_id
`;
const users = await sql`SELECT id, parent_id, position, name FROM users`;
const parentOf = new Map(users.map((u) => [u.id, u.parent_id]));
const positionOf = new Map(users.map((u) => [u.id, u.position]));
const nameOf = new Map(users.map((u) => [u.id, u.name]));
const biz = new Map(); // id -> {left,right}
for (const s of sales) {
  const amt = Math.round(Number(s.amt));
  if (amt <= 0) continue;
  let cur = s.user_id;
  const seen = new Set();
  while (cur != null && !seen.has(cur)) {
    seen.add(cur);
    const p = parentOf.get(cur);
    if (p == null) break;
    if (!biz.has(p)) biz.set(p, { left: 0, right: 0 });
    const b = biz.get(p);
    if (positionOf.get(cur) === "left") b.left += amt;
    else b.right += amt;
    cur = p;
  }
}

console.log(`\n=== PERFORMANCE DRY RUN (last-30-day business, installment mode) ===`);
console.log(`Buyers with approved purchases in last 30 days: ${sales.length} of ${users.length} users`);
let enrollments = 0;
let run1Payout = 0;
const rows = [];
for (const [id, b] of biz) {
  const total = b.left + b.right;
  const hits = RANKS.filter(([, target]) => total >= target);
  if (hits.length === 0) continue;
  for (const [name, target, bonus] of hits) {
    enrollments++;
    const monthly = Math.round(bonus / MONTHS);
    run1Payout += monthly;
    rows.push({ id, name: nameOf.get(id), total, bonus, monthly });
  }
}
rows.sort((a, b) => b.total - a.total);
for (const r of rows.slice(0, 20)) {
  console.log(`  ${r.name} (id ${r.id}): last-month business ₹${r.total.toLocaleString("en-IN")} → ${r.bonus} over ${MONTHS} mo = ₹${r.monthly.toLocaleString("en-IN")}/mo`);
}
if (rows.length > 20) console.log(`  ... +${rows.length - 20} more`);
console.log(`Enrollments on first run: ${enrollments}`);
console.log(`First-run performance payout: ₹${run1Payout.toLocaleString("en-IN")} gross → 70/20/10 = ₹${Math.round(run1Payout * 0.7).toLocaleString("en-IN")} withdraw / ₹${Math.round(run1Payout * 0.2).toLocaleString("en-IN")} repurchase / ₹${Math.round(run1Payout * 0.1).toLocaleString("en-IN")} admin`);
console.log(`\nDRY RUN COMPLETE — no data was written.`);
