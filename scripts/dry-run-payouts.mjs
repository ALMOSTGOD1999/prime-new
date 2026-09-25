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

// ── Performance: 12 ranks, full bonus × 6 monthly ──────
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
const users = await sql`SELECT id, parent_id, position, name, referred_by, package_amount, created_at FROM users`;
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

console.log(`\n=== PERFORMANCE DRY RUN (last-30-day business, full bonus × 6 months) ===`);
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
    const monthly = bonus; // full bonus pays each of the 6 months
    run1Payout += monthly;
    rows.push({ id, name: nameOf.get(id), total, bonus, monthly });
  }
}
rows.sort((a, b) => b.total - a.total);
for (const r of rows.slice(0, 20)) {
  console.log(`  ${r.name} (id ${r.id}): last-month business ₹${r.total.toLocaleString("en-IN")} → ₹${r.monthly.toLocaleString("en-IN")}/mo × ${MONTHS} months (₹${(r.monthly * MONTHS).toLocaleString("en-IN")} total)`);
}
if (rows.length > 20) console.log(`  ... +${rows.length - 20} more`);
console.log(`Enrollments on first run: ${enrollments}`);
console.log(`First-run performance payout: ₹${run1Payout.toLocaleString("en-IN")} gross → 70/20/10 = ₹${Math.round(run1Payout * 0.7).toLocaleString("en-IN")} withdraw / ₹${Math.round(run1Payout * 0.2).toLocaleString("en-IN")} repurchase / ₹${Math.round(run1Payout * 0.1).toLocaleString("en-IN")} admin`);

// ── Level Income: rates, unlocks, last-month depth earnings ──
const RATE_TABLE = [
  { from: 1, to: 1, rate: 1 }, { from: 2, to: 2, rate: 0.5 }, { from: 3, to: 3, rate: 0.2 },
  { from: 4, to: 7, rate: 0.15 }, { from: 8, to: 11, rate: 0.1 },
  { from: 12, to: 19, rate: 0.05 }, { from: 20, to: 24, rate: 0.02 },
];
const UNLOCKS = [
  { directs: 1, biz: 0, open: 2 }, { directs: 2, biz: 200000, open: 4 },
  { directs: 3, biz: 500000, open: 8 }, { directs: 4, biz: 1000000, open: 12 },
  { directs: 5, biz: 1500000, open: 16 }, { directs: 6, biz: 2500000, open: 24 },
];
const rateForDepth = (d) => RATE_TABLE.find((r) => d >= r.from && d <= r.to)?.rate ?? 0;
const openLevelsFor = (d, b) => UNLOCKS.reduce((acc, t) => (d >= t.directs && b >= t.biz ? t.open : acc), 0);

// sponsorship children (referred_by) + placement team business (package_amount)
const sponsorKids = new Map();
const teamChildren = new Map();
const pkgOf = new Map();
for (const u of users) {
  pkgOf.set(u.id, u.package_amount ?? 0);
  if (u.referred_by != null) {
    if (!sponsorKids.has(u.referred_by)) sponsorKids.set(u.referred_by, []);
    sponsorKids.get(u.referred_by).push(u.id);
  }
  if (u.parent_id != null) {
    if (!teamChildren.has(u.parent_id)) teamChildren.set(u.parent_id, []);
    teamChildren.get(u.parent_id).push(u.id);
  }
}
const tmemo = new Map();
const teamSubtree = (id) => {
  if (tmemo.has(id)) return tmemo.get(id);
  tmemo.set(id, 0);
  let s = 0;
  for (const c of teamChildren.get(id) ?? []) { s += pkgOf.get(c) ?? 0; s += teamSubtree(c); }
  tmemo.set(id, s);
  return s;
};
const salesByBuyer = new Map(sales.map((s) => [s.user_id, Math.round(Number(s.amt))]));
const windowStart = new Date(Date.now() - 10 * 30 * 24 * 60 * 60 * 1000);
const createdAtOf = new Map(users.map((u) => [u.id, new Date(u.created_at)]));

let levelPayoutTotal = 0;
let levelUsers = 0;
const levelSamples = [];
for (const u of users) {
  const directs = (sponsorKids.get(u.id) ?? []).length;
  const teamBiz = teamSubtree(u.id);
  const open = openLevelsFor(directs, teamBiz);
  if (open <= 0) continue;
  // depth business (trailing 30d, members within 10-month window)
  let frontier = [u.id];
  const seen = new Set([u.id]);
  let earning = 0;
  for (let depth = 1; depth <= 24 && frontier.length > 0; depth++) {
    const next = [];
    for (const id of frontier) {
      for (const child of sponsorKids.get(id) ?? []) {
        if (seen.has(child)) continue;
        seen.add(child);
        next.push(child);
        if ((createdAtOf.get(child) ?? new Date(0)) >= windowStart && depth <= open) {
          const vol = salesByBuyer.get(child) ?? 0;
          earning += Math.round((vol * rateForDepth(depth)) / 100);
        }
      }
    }
    frontier = next;
  }
  if (earning > 0) {
    levelUsers++;
    levelPayoutTotal += earning;
    levelSamples.push({ name: u.name, directs, teamBiz, open, earning });
  }
}
console.log(`\n=== LEVEL INCOME DRY RUN (last-month depth volume, 10-month window) ===`);
console.log(`Users with level income this run: ${levelUsers}`);
levelSamples.sort((a, b) => b.earning - a.earning);
for (const s of levelSamples.slice(0, 10)) {
  console.log(`  ${s.name}: ${s.directs} directs, team ₹${s.teamBiz.toLocaleString("en-IN")} → ${s.open} levels open → ₹${s.earning.toLocaleString("en-IN")}`);
}
if (levelSamples.length > 10) console.log(`  ... +${levelSamples.length - 10} more`);
console.log(`First-run level income: ₹${levelPayoutTotal.toLocaleString("en-IN")} gross → 70/20/10 = ₹${Math.round(levelPayoutTotal * 0.7).toLocaleString("en-IN")} withdraw / ₹${Math.round(levelPayoutTotal * 0.2).toLocaleString("en-IN")} repurchase / ₹${Math.round(levelPayoutTotal * 0.1).toLocaleString("en-IN")} admin`);
console.log(`\nDRY RUN COMPLETE — no data was written.`);
