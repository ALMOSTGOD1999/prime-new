import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

const sql = neon(process.env.DATABASE_URL);
const OUT_DIR = path.join(process.cwd(), "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

const SAFE = /^[a-z_][a-z0-9_]*$/;
const line = (k, v) => console.log(String(k).padEnd(34) + v);

// ── 1. Discover public tables ──────────────────────────
const tableRows = await sql(`
  SELECT c.relname AS name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY 1`);

const names = tableRows.map((r) => r.name).filter((n) => SAFE.test(n));
if (names.length === 0) throw new Error("no tables discovered");

console.log(`Discovered ${names.length} public tables\n`);

// ── 2. Dump every table ────────────────────────────────
const data = {};
let totalRows = 0;
for (const t of names) {
  const rows = await sql(`SELECT * FROM "${t}"`);
  data[t] = rows;
  totalRows += rows.length;
  if (rows.length > 0) console.log(`  ${t.padEnd(30)} ${rows.length}`);
}

// ── 3. Sequences (so ids resume correctly on restore) ──
let sequences = [];
try {
  const seqNames = await sql(`
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S'
    ORDER BY 1`);
  for (const s of seqNames) {
    if (!SAFE.test(s.name)) continue;
    const v = await sql(`SELECT last_value, is_called FROM "${s.name}"`);
    sequences.push({ name: s.name, last_value: v[0].last_value, is_called: v[0].is_called });
  }
} catch (e) {
  console.log(`  (sequence capture failed: ${e.message})`);
}

// ── 4. Column definitions (schema safety net) ──────────
const columns = await sql(`
  SELECT table_name, column_name, ordinal_position, is_nullable, column_default, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position`);

// ── 5. Write ───────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, `db-backup-${stamp}.json`);
const payload = {
  generatedAt: new Date().toISOString(),
  source: "neon (logical dump of public schema)",
  tableCount: names.length,
  totalRows,
  tables: data,
  sequences,
  columns,
};
fs.writeFileSync(file, JSON.stringify(payload), "utf8");

const bytes = fs.statSync(file).size;
console.log(`\nWrote ${file}`);
line("tables", names.length);
line("total rows", totalRows);
line("sequences", sequences.length);
line("size", (bytes / 1024 / 1024).toFixed(2) + " MB");

// ── 6. Verify the file round-trips ─────────────────────
const reread = JSON.parse(fs.readFileSync(file, "utf8"));
let rtRows = 0;
const mismatches = [];
for (const t of names) {
  const n = reread.tables[t]?.length ?? -1;
  rtRows += Math.max(n, 0);
  if (n !== data[t].length) mismatches.push(`${t}: file=${n} mem=${data[t].length}`);
}
console.log(`\nVERIFICATION`);
line("reread rows", rtRows);
line("expected rows", totalRows);
line("row count match", rtRows === totalRows ? "PASS" : "FAIL");
line("table count match", Object.keys(reread.tables).length === names.length ? "PASS" : "FAIL");
line("column defs captured", reread.columns.length);
line("sequences captured", reread.sequences.length);
if (mismatches.length) console.log("MISMATCHES: " + mismatches.join(", "));

// spot-check: the two tables the backfill will touch
for (const t of ["income", "wallet"]) {
  const live = await sql(`SELECT count(*)::int AS n FROM "${t}"`);
  const snap = reread.tables[t]?.length ?? -1;
  line(`spot ${t}`, `live=${live[0].n} snapshot=${snap} ${live[0].n === snap ? "PASS" : "FAIL"}`);
}

// fingerprint a couple of rows we must be able to restore exactly
const w0 = (await sql(`SELECT * FROM wallet ORDER BY user_id LIMIT 1`))[0];
line("wallet sample", JSON.stringify(w0).slice(0, 110) + "...");
const snapWallet = reread.tables.wallet.find((r) => r.user_id === w0.user_id);
line("wallet sample match", JSON.stringify(snapWallet) === JSON.stringify(w0) ? "PASS" : "FAIL");

if (rtRows !== totalRows) {
  console.error("\nBACKUP FAILED VERIFICATION");
  process.exit(1);
}
console.log(`\nBACKUP OK -> ${file}`);
