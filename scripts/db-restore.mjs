import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

const sql = neon(process.env.DATABASE_URL);
const APPLY = process.argv.includes("--apply");
const SAFE = /^[a-z_][a-z0-9_]*$/;

// Tables the Option-B backfill writes. Only these are rolled back.
const TARGETS = ["income", "wallet"];
// Allow selecting an explicit backup file: node tmp-restore.mjs <file> [--apply]
const argFile = process.argv.find((a) => a.endsWith(".json") && !a.startsWith("--"));

const line = (k, v) => console.log(String(k).padEnd(36) + v);
const fail = (m) => { console.error("ABORT: " + m); process.exit(1); };

// ── locate backup ──────────────────────────────────────
let file = argFile;
if (!file) {
  const dir = path.join(process.cwd(), "backups");
  const candidates = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.startsWith("db-backup-") && f.endsWith(".json")).sort()
    : [];
  if (candidates.length === 0) fail("no backup found in backups/");
  file = path.join(dir, candidates[candidates.length - 1]);
}
if (!fs.existsSync(file)) fail(`backup not found: ${file}`);

const snap = JSON.parse(fs.readFileSync(file, "utf8"));
console.log(`Backup : ${path.basename(file)}`);
console.log(`Created: ${snap.generatedAt}`);
console.log(`Mode   : ${APPLY ? "APPLY (will write)" : "DRY RUN (no writes)"}\n`);

// ── safety: confirm nothing outside our targets references them ──
const fks = await sql(`
  SELECT tc.table_name AS child, ccu.table_name AS parent
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.constraint_schema = tc.constraint_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'`);
const inbound = fks.filter((f) => TARGETS.includes(f.parent) && !TARGETS.includes(f.child));
if (inbound.length) {
  fail("tables reference our targets, would break FKs: " + JSON.stringify(inbound));
}
line("FK check", `nothing references ${TARGETS.join("/")} - PASS`);

// ── pre-state ──────────────────────────────────────────
const pre = {};
for (const t of TARGETS) {
  const r = await sql(`SELECT count(*)::int AS n FROM "${t}"`);
  pre[t] = r[0].n;
  const want = snap.tables[t]?.length ?? -1;
  if (pre[t] !== want) {
    console.log(`  NOTE ${t}: live=${pre[t]} vs snapshot=${want} (DB changed since backup)`);
  }
}
const preWallet = (await sql(`
  SELECT coalesce(sum(working_balance),0)::int AS w,
         coalesce(sum(income_balance),0)::int AS i,
         coalesce(sum(repurchase_balance),0)::int AS r,
         coalesce(sum(total_earned),0)::int AS e
  FROM wallet`))[0];
line("pre income rows", pre.income);
line("pre wallet rows", pre.wallet);
line("pre wallet totals", `work=${preWallet.w} inc=${preWallet.i} rep=${preWallet.r} earn=${preWallet.e}`);

if (!APPLY) {
  // dry run: show exactly what would be executed
  console.log("\nWould execute, in order:");
  for (const t of TARGETS) {
    const cols = snap.columns.filter((c) => c.table_name === t)
      .sort((a, b) => a.ordinal_position - b.ordinal_position).map((c) => c.column_name);
    const rows = snap.tables[t] ?? [];
    console.log(`  1. DELETE FROM "${t}";                       -- removes ${liveCount(pre[t])}`);
    console.log(`  2. INSERT INTO "${t}" (${cols.join(", ")}) ... -- ${rows.length} rows, ${cols.length} cols`);
    console.log(`     sample: ${JSON.stringify(rows[0] ?? null).slice(0, 90)}...`);
  }
  console.log(`\n  3. setval income_id_seq / wallet_id_seq to restored max(id)`);
  console.log(`\nDry run complete. Re-run with --apply to execute.`);
  process.exit(0);
}
function liveCount(n) { return `${n} row(s)`; }

// ── APPLY ──────────────────────────────────────────────
const BATCH = 250;
let insertedTotal = 0;

function placeholders(startIdx, ncols) {
  const out = [];
  for (let r = 0; r < startIdx.length; r++)
    for (let c = 0; c < ncols; c++) out.push(`$${r * ncols + c + 1}`);
  return out;
}

for (const t of TARGETS) {
  if (!SAFE.test(t)) fail(`unsafe table name ${t}`);
  const cols = snap.columns.filter((c) => c.table_name === t)
    .sort((a, b) => a.ordinal_position - b.ordinal_position).map((c) => c.column_name);
  const rows = snap.tables[t] ?? [];
  if (cols.length === 0) fail(`no column metadata for ${t} in backup`);

  await sql(`DELETE FROM "${t}"`);
  console.log(`  deleted ${t}: ${pre[t]} row(s)`);

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const params = [];
    for (const row of chunk) for (const c of cols) params.push(row[c] ?? null);
    const ph = placeholders(chunk.map((_, k) => k), cols.length);
    const valuesSql = chunk.map((_, k) =>
      `(${ph.slice(k * cols.length, (k + 1) * cols.length).join(",")})`).join(",");
    await sql(`INSERT INTO "${t}" (${cols.join(",")}) VALUES ${valuesSql}`, params);
    insertedTotal += chunk.length;
  }
  console.log(`  inserted ${t}: ${rows.length} row(s)`);

  // advance the id sequence past restored rows
  const maxId = (await sql(`SELECT coalesce(max(id),0)::int AS m FROM "${t}"`))[0].m;
  if (maxId > 0) await sql(`SELECT setval('${t}_id_seq', ${maxId}, true)`);
}

// ── verify ─────────────────────────────────────────────
console.log("\nVERIFICATION");
let ok = true;
for (const t of TARGETS) {
  const live = (await sql(`SELECT count(*)::int AS n FROM "${t}"`))[0].n;
  const want = snap.tables[t].length;
  const pass = live === want;
  ok = ok && pass;
  line(`${t} rows`, `live=${live} snapshot=${want} ${pass ? "PASS" : "FAIL"}`);
}
const postWallet = (await sql(`
  SELECT coalesce(sum(working_balance),0)::int AS w,
         coalesce(sum(income_balance),0)::int AS i,
         coalesce(sum(repurchase_balance),0)::int AS r,
         coalesce(sum(total_earned),0)::int AS e
  FROM wallet`))[0];
const snapWallet = (snap.tables.wallet ?? []).reduce((a, r) => ({
  w: a.w + (r.working_balance ?? 0), i: a.i + (r.income_balance ?? 0),
  r: a.r + (r.repurchase_balance ?? 0), e: a.e + (r.total_earned ?? 0),
}), { w: 0, i: 0, r: 0, e: 0 });
const totalsMatch = postWallet.w === snapWallet.w && postWallet.i === snapWallet.i
  && postWallet.r === snapWallet.r && postWallet.e === snapWallet.e;
ok = ok && totalsMatch;
line("wallet totals match", totalsMatch ? "PASS" : "FAIL");
line("post wallet totals", `work=${postWallet.w} inc=${postWallet.i} rep=${postWallet.r} earn=${postWallet.e}`);
line("total rows inserted", insertedTotal);

console.log(ok ? "\nRESTORE OK" : "\nRESTORE FAILED");
process.exit(ok ? 0 : 1);
