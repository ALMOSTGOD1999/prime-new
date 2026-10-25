import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

const sql = neon(process.env.DATABASE_URL);
const APPLY = process.argv.includes("--apply");

const line = (k, v) => console.log(String(k).padEnd(56) + v);
const rupee = (n) => "\u20b9" + Number(n || 0).toLocaleString("en-IN");
const w = (g) => Math.round((g * 90) / 100); // distributeCommission: incomeBalance += round(gross*0.9)

// ── baseline: the pre-apply snapshot ─────────────────────
const argFile = process.argv.find((a) => a.endsWith(".json") && !a.startsWith("--"));
let file = argFile;
if (!file) {
  const dir = path.join(process.cwd(), "backups");
  const cands = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("db-backup-") && f.endsWith(".json"))
    .sort();
  if (!cands.length) {
    console.error("no backup found");
    process.exit(1);
  }
  file = path.join(dir, cands[cands.length - 1]);
}
const snap = JSON.parse(fs.readFileSync(file, "utf8"));
console.log(`baseline : ${path.basename(file)}  (${snap.generatedAt})`);
console.log(`mode     : ${APPLY ? "APPLY (will write)" : "DRY RUN (no writes)"}\n`);

// ── aggregate direct+matching from a row set ────────────
const agg = (rows) => {
  const m = new Map();
  for (const r of rows) {
    if (r.type !== "direct" && r.type !== "matching") continue;
    const cur = m.get(r.user_id) ?? { gross: 0, wd: 0 };
    cur.gross += Number(r.amount ?? 0);
    cur.wd += w(Number(r.amount ?? 0));
    m.set(r.user_id, cur);
  }
  return m;
};

const oldAgg = agg(snap.tables.income ?? []);
const liveIncome = await sql`SELECT id, user_id, type, amount FROM income`;
const newAgg = agg(liveIncome);

const snapWallet = new Map((snap.tables.wallet ?? []).map((r) => [r.user_id, r]));
const liveWallet = await sql`SELECT user_id, income_balance, total_earned FROM wallet`;
const liveWb = new Map(liveWallet.map((r) => [r.user_id, r]));

const uids = new Set([...oldAgg.keys(), ...newAgg.keys(), ...snapWallet.keys()]);
const applyList = [],
  already = [],
  conflict = [],
  noWallet = [];

for (const uid of uids) {
  const o = oldAgg.get(uid) ?? { gross: 0, wd: 0 };
  const n = newAgg.get(uid) ?? { gross: 0, wd: 0 };
  const dWd = n.wd - o.wd;
  const dGross = n.gross - o.gross;
  if (!dWd && !dGross) continue;

  const sw = snapWallet.get(uid);
  const lw = liveWb.get(uid);
  if (!sw || !lw) {
    noWallet.push({ uid, dWd, dGross });
    continue;
  }

  const wantInc = Number(sw.income_balance) + dWd;
  const wantEarn = Number(sw.total_earned) + dGross;
  const isBaseline =
    Number(lw.income_balance) === Number(sw.income_balance) &&
    Number(lw.total_earned) === Number(sw.total_earned);
  const isApplied = Number(lw.income_balance) === wantInc && Number(lw.total_earned) === wantEarn;

  if (isApplied) already.push({ uid, dWd, dGross });
  else if (isBaseline) applyList.push({ uid, dWd, dGross, wantInc, wantEarn });
  else conflict.push({ uid, dWd, dGross, liveInc: lw.income_balance, baseInc: sw.income_balance });
}

console.log("═══ WALLET RECONCILE ═══");
line(
  "users with a direct/matching delta",
  `${applyList.length + already.length + conflict.length}`,
);
line("  already applied (skip)", `${already.length}`);
line("  NEEDS APPLY", `${applyList.length}`);
line("  CONFLICT (live != baseline, != target)", `${conflict.length}`);
line("  missing wallet row", `${noWallet.length}`);

const dInc = applyList.reduce((s, x) => s + x.dWd, 0);
const dEarn = applyList.reduce((s, x) => s + x.dGross, 0);
line("pending income_balance delta", rupee(dInc));
line("pending total_earned delta", rupee(dEarn));

const [base] = await sql`
  SELECT coalesce(sum(income_balance),0)::int AS i, coalesce(sum(total_earned),0)::int AS e FROM wallet`;
line("wallet income_balance now", `${rupee(base.i)} -> ${rupee(base.i + dInc)}`);
line("wallet total_earned now", `${rupee(base.e)} -> ${rupee(base.e + dEarn)}`);

if (conflict.length) {
  console.log("\n  CONFLICTS (left untouched):");
  for (const c of conflict.slice(0, 10)) {
    line(
      `    #${c.uid}`,
      `live inc=${c.liveInc} base=${c.baseInc} delta=${c.dWd} earn=${c.dGross}`,
    );
  }
}
if (applyList.length) {
  console.log("\n  top movers:");
  for (const a of [...applyList].sort((x, y) => y.dGross - x.dGross).slice(0, 8)) {
    line(`    #${a.uid}`, `inc +${rupee(a.dWd)}, earned +${rupee(a.dGross)}`);
  }
}

// ── daily_pairs cleanup (the step that crashed the apply) ─
const [dp] = await sql`SELECT count(*)::int AS n FROM daily_pairs WHERE pair_date >= '2026-09-15'`;
line("\ndaily_pairs rows >= cutoff (to clear)", `${dp.n}`);

if (!APPLY) {
  console.log("\n(no writes — rerun with --apply)");
  process.exit(0);
}

console.log("\nAPPLYING...");
for (const a of applyList) {
  await sql`
    UPDATE wallet SET income_balance = ${a.wantInc}, total_earned = ${a.wantEarn}
    WHERE user_id = ${a.uid}`;
}
line("wallets updated", `${applyList.length}`);

await sql`DELETE FROM daily_pairs WHERE pair_date >= '2026-09-15'`;
line("daily_pairs cleared", `${dp.n}`);

console.log("\nRECONCILE COMPLETE");
