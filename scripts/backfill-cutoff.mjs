import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const APPLY = process.argv.includes("--apply");
const EXPORT = process.argv.includes("--export");

const CUTOFF = "2026-09-15";
const DIRECT_AMT = 150; // round(2999 * 5%)
const MATCH_AMT = 600; // round(2999 * 20%)
const DAILY_CAP = 3; // strict, per IST day
const WITHDRAW_PCT = 90; // distributeCommission: incomeBalance += round(gross*90/100)

const line = (k, v) => console.log(String(k).padEnd(56) + v);
const rupee = (n) => "\u20b9" + Number(n || 0).toLocaleString("en-IN");
const w = (g) => Math.round((g * WITHDRAW_PCT) / 100);

const log = APPLY ? console.log : () => {};
log("APPLY MODE — will write");
if (!APPLY) console.log("DRY RUN — no writes (pass --apply to write)\n");

// ══════════════════════════════════════════════════════════
// 1. LOAD — every date derived in SQL, never through the JS driver
// ══════════════════════════════════════════════════════════
const users = await sql`
  SELECT id, parent_id, position, is_active, referred_by, referral_code,
         to_char((activated_at + interval '5 hours 30 minutes')::date, 'YYYY-MM-DD') AS ist_date,
         to_char(activated_at + interval '5 hours 30 minutes', 'YYYY-MM-DD HH24:MI:SS') AS ist_dt
  FROM users`;
const byId = new Map(users.map((u) => [u.id, u]));

const [todayRow] =
  await sql`SELECT to_char((now() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS d`;
const TODAY = todayRow.d;

const [activeMismatch] = await sql`
  SELECT count(*)::int AS n FROM users
  WHERE is_active AND activated_at IS NULL`;
line("active users with no activated_at", `${activeMismatch.n} (excluded from replay)`);

// ══════════════════════════════════════════════════════════
// 2. REFERRAL — rule (a): gate on the JOINER's activation date
// ══════════════════════════════════════════════════════════
const referralTargets = users.filter(
  (u) =>
    u.is_active &&
    u.ist_date &&
    u.ist_date >= CUTOFF &&
    u.ist_date <= TODAY &&
    u.referred_by != null,
);
const referralNoReferrer = users.filter(
  (u) =>
    u.is_active &&
    u.ist_date &&
    u.ist_date >= CUTOFF &&
    u.ist_date <= TODAY &&
    u.referred_by == null,
);
const joinerOf = new Map(referralTargets.map((u) => [u.id, u.referred_by]));

const existingDirect = await sql`
  SELECT id, user_id, amount, description FROM income WHERE type = 'direct'`;
const directByJoiner = new Map(); // joinerId -> income row
for (const r of existingDirect) {
  const m = /#(\d+)$/.exec(r.description || "");
  if (m) directByJoiner.set(Number(m[1]), r);
}

const refInsert = []; // rows to create
const refSet150 = []; // existing rows -> 150
const refZero = []; // existing rows -> 0
for (const j of referralTargets) {
  const row = directByJoiner.get(j.id);
  if (!row) refInsert.push(j);
  else if (row.amount !== DIRECT_AMT) refSet150.push({ row, joiner: j });
}
for (const [joinerId, row] of directByJoiner) {
  const want = referralTargets.some((t) => t.id === joinerId) ? DIRECT_AMT : 0;
  if (row.amount !== want && !refSet150.find((x) => x.row.id === row.id)) refZero.push(row);
}

console.log("═══ REFERRAL (rule a: joiner's activation date) ═══");
line("joiners in window", `${referralTargets.length}`);
line("  of those, no referrer", `${referralNoReferrer.length}`);
line("rows to INSERT at ₹150", `${refInsert.length} = ${rupee(refInsert.length * DIRECT_AMT)}`);
line("rows to RAISE to ₹150", `${refSet150.length} = ${rupee(refSet150.length * DIRECT_AMT)}`);
line("rows to ZERO (pre-cutoff joiner)", `${refZero.length}`);
const refGrossAfter = referralTargets.length * DIRECT_AMT;

// ══════════════════════════════════════════════════════════
// 3. MATCHING — replay activations chronologically
//    eligibility = min(L', R') over post-cutoff active members
//    counter = pairs formed IN WINDOW only (pre-cutoff pairs ignored)
//    cap = 3 per user per IST day, strict
// ══════════════════════════════════════════════════════════
const replay = users
  .filter((u) => u.is_active && u.ist_date && u.ist_date >= CUTOFF && u.ist_date <= TODAY)
  .sort((a, b) => (a.ist_dt < b.ist_dt ? -1 : a.ist_dt > b.ist_dt ? 1 : a.id - b.id));

const state = new Map(); // ancestorId -> {L,R,lq,rq,pairs,daily}
const get = (id) => {
  let s = state.get(id);
  if (!s) {
    s = { L: 0, R: 0, lq: [], rq: [], pairs: 0, daily: new Map() };
    state.set(id, s);
  }
  return s;
};

const newPairs = [];
for (const x of replay) {
  const day = x.ist_date;
  let child = x;
  let A = child.parent_id;
  const guard = new Set();
  while (A != null && !guard.has(A)) {
    guard.add(A);
    const s = get(A);
    if (child.position === "left") {
      s.L += 1;
      s.lq.push(x.id);
    } else if (child.position === "right") {
      s.R += 1;
      s.rq.push(x.id);
    } else {
      child = byId.get(A);
      A = child?.parent_id ?? null;
      continue;
    } // unknown leg: skip accounting

    const eligible = Math.min(s.L, s.R);
    const todayCount = s.daily.get(day) ?? 0;
    if (s.pairs < eligible && todayCount < DAILY_CAP && s.lq.length > 0 && s.rq.length > 0) {
      const leftMember = s.lq.shift();
      const rightMember = s.rq.shift();
      s.pairs += 1;
      s.daily.set(day, todayCount + 1);
      newPairs.push({ owner: A, leftMember, rightMember, istDt: x.ist_dt, day });
    }
    child = byId.get(A);
    A = child?.parent_id ?? null;
  }
}

// Current in-window rows (to be replaced)
const [pairAgg] = await sql`
  SELECT count(*)::int AS n FROM pairs WHERE (created_at + interval '5h30m')::date >= ${CUTOFF}::date`;
const [matchAgg] = await sql`
  SELECT count(*)::int AS n, coalesce(sum(amount),0)::int AS amt FROM income
  WHERE type = 'matching' AND (created_at + interval '5h30m')::date >= ${CUTOFF}::date`;
const [preCutMatching] = await sql`
  SELECT count(*)::int AS n, coalesce(sum(amount),0)::int AS amt FROM income
  WHERE type = 'matching' AND (created_at + interval '5h30m')::date < ${CUTOFF}::date`;

console.log("\n═══ MATCHING (replay) ═══");
line("post-cutoff activations replayed", `${replay.length}`);
line("in-window pairs NOW (to delete)", `${pairAgg.n}`);
line("in-window matching income NOW", `${matchAgg.n} rows, ${rupee(matchAgg.amt)}`);
line(
  "pre-cutoff matching income",
  `${preCutMatching.n} rows, ${rupee(preCutMatching.amt)} (must be 0)`,
);
line("NEW pairs to create", `${newPairs.length}`);
line(
  "NEW matching income",
  `${newPairs.length} x ${rupee(MATCH_AMT)} = ${rupee(newPairs.length * MATCH_AMT)}`,
);

const matchGrossAfter = newPairs.length * MATCH_AMT;
const byUserDay = new Map();
for (const p of newPairs) {
  const k = `${p.owner}|${p.day}`;
  byUserDay.set(k, (byUserDay.get(k) ?? 0) + 1);
}
const overCap = [...byUserDay.entries()].filter(([, n]) => n > DAILY_CAP);
const earningDays = new Set([...byUserDay.keys()].map((k) => k.split("|")[1]));
line("distinct earning days", `${earningDays.size}`);
line(
  "user/day slots over cap 3 (invariant)",
  `${overCap.length === 0 ? "PASS (0)" : "FAIL (" + overCap.length + ")"}`,
);
for (const [k, n] of overCap.slice(0, 5)) {
  const [uid, day] = k.split("|");
  line(`    over cap: user #${uid} on ${day}`, `${n} pairs`);
}

// ══════════════════════════════════════════════════════════
// 4. WALLET DELTA — only direct + matching contributions move
// ══════════════════════════════════════════════════════════
const oldRows = await sql`
  SELECT user_id, coalesce(sum(amount),0)::int AS gross, coalesce(sum(round(amount * 0.9)),0)::int AS wd
  FROM income WHERE type IN ('direct','matching') GROUP BY user_id`;
const oldAgg = new Map(oldRows.map((r) => [r.user_id, { gross: r.gross, wd: r.wd }]));

const newAgg = new Map();
const add = (uid, gross) => {
  const cur = newAgg.get(uid) ?? { gross: 0, wd: 0 };
  cur.gross += gross;
  cur.wd += w(gross);
  newAgg.set(uid, cur);
};
for (const j of referralTargets) add(j.referred_by, DIRECT_AMT);
for (const p of newPairs) add(p.owner, MATCH_AMT);

const walletDelta = [];
const uids = new Set([...oldAgg.keys(), ...newAgg.keys()]);
for (const uid of uids) {
  const o = oldAgg.get(uid) ?? { gross: 0, wd: 0 };
  const n = newAgg.get(uid) ?? { gross: 0, wd: 0 };
  const dWd = n.wd - o.wd;
  const dGross = n.gross - o.gross;
  if (dWd || dGross) walletDelta.push({ uid, dWd, dGross });
}

const [walletBefore] = await sql`
  SELECT coalesce(sum(income_balance),0)::int AS inc, coalesce(sum(total_earned),0)::int AS earned,
         count(*)::int AS n FROM wallet`;

console.log("\n═══ WALLET DELTA ═══");
line("wallets changing", `${walletDelta.length}`);
line("total income_balance delta", `${rupee(walletDelta.reduce((s, d) => s + d.dWd, 0))}`);
line("total total_earned delta", `${rupee(walletDelta.reduce((s, d) => s + d.dGross, 0))}`);
line(
  "income_balance",
  `${rupee(walletBefore.inc)} -> ${rupee(walletBefore.inc + walletDelta.reduce((s, d) => s + d.dWd, 0))}`,
);
line(
  "total_earned",
  `${rupee(walletBefore.earned)} -> ${rupee(walletBefore.earned + walletDelta.reduce((s, d) => s + d.dGross, 0))}`,
);

const topWallet = [...walletDelta]
  .sort((a, b) => Math.abs(b.dGross) - Math.abs(a.dGross))
  .slice(0, 8);
console.log("\n  top wallet movers:");
for (const d of topWallet) {
  const u = byId.get(d.uid);
  line(
    `    ${u?.referral_code ?? "?"} (#${d.uid})`,
    `gross ${d.dGross >= 0 ? "+" : ""}${rupee(d.dGross)}, income ${d.dWd >= 0 ? "+" : ""}${rupee(d.dWd)}`,
  );
}

// ══════════════════════════════════════════════════════════
// 5. EXPORT / APPLY
// ══════════════════════════════════════════════════════════
const plan = {
  generatedAt: new Date().toISOString(),
  cutoff: CUTOFF,
  today: TODAY,
  referral: {
    insert: refInsert.map((j) => ({ joiner: j.id, referrer: j.referred_by })),
    raiseTo150: refSet150.map((x) => x.row.id),
    zero: refZero.map((r) => r.id),
    grossAfter: refGrossAfter,
  },
  matching: {
    deletePairsInWindow: pairAgg.n,
    deleteMatchingIncomeInWindow: matchAgg.n,
    insert: newPairs,
    grossAfter: matchGrossAfter,
  },
  wallets: walletDelta,
};

if (EXPORT) {
  const fs = await import("node:fs");
  const path = `backfill-plan-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
  fs.mkdirSync("backups", { recursive: true });
  fs.writeFileSync(`backups/${path}`, JSON.stringify(plan, null, 2), "utf8");
  console.log(`\nPlan exported -> backups/${path}`);
}

if (!APPLY) {
  console.log("\n(no writes performed — rerun with --apply)");
  process.exit(0);
}

// ── APPLY ──────────────────────────────────────────────
console.log("\nAPPLYING...");

// 5a. Referral inserts
for (const j of refInsert) {
  await sql`
    INSERT INTO income (user_id, type, amount, description)
    VALUES (${j.referred_by}, 'direct', ${DIRECT_AMT},
            ${`Direct commission for referring user #${j.id}`})`;
}
log(`  inserted direct rows: ${refInsert.length}`);

// 5b. Referral amount fixes
for (const e of refSet150)
  await sql`UPDATE income SET amount = ${DIRECT_AMT} WHERE id = ${e.row.id}`;
for (const r of refZero) await sql`UPDATE income SET amount = 0 WHERE id = ${r.id}`;
log(`  raised: ${refSet150.length}, zeroed: ${refZero.length}`);

// 5c. Replace in-window matching: delete income first (FK to pairs), then pairs
await sql`DELETE FROM income WHERE type = 'matching' AND (created_at + interval '5h30m')::date >= ${CUTOFF}::date`;
await sql`DELETE FROM pairs WHERE (created_at + interval '5h30m')::date >= ${CUTOFF}::date`;
log(`  deleted in-window matching income + pairs`);

// 5d. Insert fresh pairs with real members and historical timestamps
for (const p of newPairs) {
  const [np] = await sql`
    INSERT INTO pairs (user_id, left_user_id, right_user_id, created_at)
    VALUES (${p.owner}, ${p.leftMember}, ${p.rightMember},
            (to_timestamp(${p.istDt}, 'YYYY-MM-DD HH24:MI:SS') - interval '5 hours 30 minutes'))
    RETURNING id`;
  await sql`
    INSERT INTO income (user_id, type, amount, pair_id, description)
    VALUES (${p.owner}, 'matching', ${MATCH_AMT}, ${np.id},
            ${`Matching income pair #${p.owner} / ${p.istDt}`})`;
}
log(`  inserted pairs + matching income: ${newPairs.length}`);

// 5e. Reset in-window daily pair counters (they will be rebuilt by the engine)
// pair_date is a TEXT column holding 'YYYY-MM-DD', so compare as text.
await sql`DELETE FROM daily_pairs WHERE pair_date >= ${CUTOFF}`;
log(`  cleared daily_pairs from ${CUTOFF}`);

// 5f. Wallet deltas
for (const d of walletDelta) {
  const [exists] = await sql`SELECT id FROM wallet WHERE user_id = ${d.uid}`;
  if (exists) {
    await sql`
      UPDATE wallet SET income_balance = income_balance + ${d.dWd},
                        total_earned = total_earned + ${d.dGross}
      WHERE user_id = ${d.uid}`;
  } else {
    await sql`
      INSERT INTO wallet (user_id, working_balance, income_balance, repurchase_balance, cashback_balance, total_earned)
      VALUES (${d.uid}, 0, ${d.dWd}, 0, 0, ${d.dGross})`;
  }
}
log(`  wallets updated: ${walletDelta.length}`);

console.log("\nAPPLY COMPLETE");
