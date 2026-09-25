import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();
const sql = neon(process.env.DATABASE_URL);

const TIERS = [
  { min: 500000, rate: 3 },
  { min: 200000, rate: 2.5 },
  { min: 0, rate: 2 },
];
const rateFor = (v) => (TIERS.find((t) => v >= t.min) ?? TIERS[2]).rate;
const RANKS = [
  ["STARTER", 500000, 1999], ["STARTER ELITE", 1000000, 3499], ["BRONZE", 2500000, 9999],
  ["SILVER", 5000000, 19499], ["GOLD", 10000000, 39999], ["PLATINUM", 30000000, 79999],
  ["EMERALD", 50000000, 129999], ["RUBY", 100000000, 199999], ["SAPPHIRE", 250000000, 259999],
  ["TOPAZ", 500000000, 449999], ["DIAMOND", 1000000000, 799999], ["CROWN", 3000000000, 1499999],
];

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

console.log(`\n=== CASHBACK DRY RUN ===`);
console.log(`Approved purchases >= 10k: ${eligible.length} | already enrolled: ${eligible.length - newOnes.length} | would enroll: ${newOnes.length}`);
let monthlyTotal = 0;
for (const p of newOnes.slice(0, 15)) {
  const v = Math.round(Number(p.total_amount));
  const rate = rateFor(v);
  const monthly = Math.round((v * rate) / 100);
  const cap = Math.round(v * 0.6);
  monthlyTotal += monthly;
  console.log(`  #${p.id} ${p.name}: ₹${v.toLocaleString("en-IN")} @ ${rate}% → ₹${monthly.toLocaleString("en-IN")}/mo, cap ₹${cap.toLocaleString("en-IN")} (${Math.ceil(cap / monthly)} months)`);
}
if (newOnes.length > 15) console.log(`  ... +${newOnes.length - 15} more`);
console.log(`First-run monthly payout total (all ${newOnes.length}): ₹${monthlyTotal.toLocaleString("en-IN")}`);
const tierDist = {};
for (const p of eligible) tierDist[rateFor(Math.round(Number(p.total_amount)))] = (tierDist[rateFor(Math.round(Number(p.total_amount)))] ?? 0) + 1;
console.log(`Tier distribution over all eligible:`, tierDist);

// ── Performance incentive dry run ──
const users = await sql`SELECT id, parent_id, package_amount, name FROM users`;
const childrenOf = new Map();
const amountOf = new Map();
for (const u of users) {
  amountOf.set(u.id, Number(u.package_amount) || 0);
  if (u.parent_id != null) {
    if (!childrenOf.has(u.parent_id)) childrenOf.set(u.parent_id, []);
    childrenOf.get(u.parent_id).push(u.id);
  }
}
const memo = new Map();
const subtree = (id) => {
  if (memo.has(id)) return memo.get(id);
  memo.set(id, 0);
  let s = 0;
  for (const c of childrenOf.get(id) ?? []) { s += amountOf.get(c) ?? 0; s += subtree(c); }
  memo.set(id, s);
  return s;
};
console.log(`\n=== PERFORMANCE INCENTIVE DRY RUN ===`);
console.log(`Users: ${users.length}`);
let hits = 0;
for (const u of users) {
  const biz = subtree(u.id);
  if (biz <= 0) continue;
  const achieved = RANKS.filter(([, target]) => biz >= target);
  if (achieved.length > 0) {
    hits++;
    if (hits <= 15) {
      console.log(`  ${u.name} (id ${u.id}): business ₹${biz.toLocaleString("en-IN")} → ${achieved.map(([n, t, b]) => `${n}(₹${b.toLocaleString("en-IN")} bonus)`).join(", ")}`);
    }
  }
}
console.log(`Total users who would get milestones on first run: ${hits}`);
const top = users.map((u) => ({ name: u.name, biz: subtree(u.id) })).sort((a, b) => b.biz - a.biz).slice(0, 5);
console.log("Top 5 business:", top.map((t) => `${t.name}=₹${t.biz.toLocaleString("en-IN")}`).join(" | "));
console.log(`\nDRY RUN COMPLETE — no data was written.`);
