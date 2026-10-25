import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const one = async (q) => (await q)[0];
const line = (k, v) => console.log(String(k).padEnd(38) + v);
const rupee = (n) => "\u20b9" + Number(n).toLocaleString("en-IN");

const M = 600, D = 150;
const REP = (g) => Math.round((g * 20) / 100);
const INC = (g) => Math.round((g * 70) / 100);

// Which pairs would get a matching income row
const orphanN = await one(sql`
  SELECT count(*)::int AS n FROM pairs p
  WHERE NOT EXISTS (SELECT 1 FROM income i WHERE i.pair_id = p.id)`);

// Which (referrer, joiner) pairs would get a direct income row
const directN = await one(sql`
  SELECT count(*)::int AS n FROM users u
  WHERE u.is_active = true AND u.referred_by IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM income i WHERE i.user_id = u.referred_by
                    AND i.type = 'direct' AND i.description LIKE '%#' || u.id)`);

// Wallet impact: update existing vs insert missing
const walletImpact = await one(sql`
  WITH orphan_owners AS (
    SELECT DISTINCT p.user_id AS uid FROM pairs p
    WHERE NOT EXISTS (SELECT 1 FROM income i WHERE i.pair_id = p.id)
  ), direct_referrers AS (
    SELECT DISTINCT u.referred_by AS uid FROM users u
    WHERE u.is_active = true AND u.referred_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM income i WHERE i.user_id = u.referred_by
                      AND i.type = 'direct' AND i.description LIKE '%#' || u.id)
  ), affected AS (
    SELECT uid FROM orphan_owners
    UNION
    SELECT uid FROM direct_referrers
  )
  SELECT count(*)::int AS affected,
         count(*) FILTER (WHERE w.user_id IS NULL)::int AS need_insert,
         count(*) FILTER (WHERE w.user_id IS NOT NULL)::int AS need_update
  FROM affected a LEFT JOIN wallet w ON w.user_id = a.uid`);

const before = await one(sql`SELECT
  coalesce(sum(working_balance),0)::int AS working,
  coalesce(sum(income_balance),0)::int AS income,
  coalesce(sum(repurchase_balance),0)::int AS repurchase,
  coalesce(sum(total_earned),0)::int AS earned,
  count(*)::int AS wallets FROM wallet`);

const grossM = orphanN.n * M, grossD = directN.n * D;
const dRep = (orphanN.n * REP(M)) + (directN.n * REP(D));
const dInc = (orphanN.n * INC(M)) + (directN.n * INC(D));
const dGross = grossM + grossD;

console.log("=== ROWS TO INSERT ===");
line("matching income rows", `${orphanN.n} x ${rupee(M)} = ${rupee(grossM)}`);
line("direct income rows", `${directN.n} x ${rupee(D)} = ${rupee(grossD)}`);
line("TOTAL income rows", `${orphanN.n + directN.n}`);
line("TOTAL gross credited", rupee(dGross));

console.log("\n=== WALLET IMPACT ===");
line("distinct wallets affected", walletImpact.affected);
line("  UPDATE (existing)", walletImpact.need_insert ? walletImpact.need_update : walletImpact.need_update);
line("  INSERT (missing wallet)", walletImpact.need_insert);

console.log("\n=== WALLET TOTALS ===");
line("working_balance", `${rupee(before.working)} -> ${rupee(before.working + dGross)}`);
line("income_balance", `${rupee(before.income)} -> ${rupee(before.income + dInc)}`);
line("repurchase_balance", `${rupee(before.repurchase)} -> ${rupee(before.repurchase + dRep)}`);
line("total_earned", `${rupee(before.earned)} -> ${rupee(before.earned + dGross)}`);
line("wallet rows", `${before.wallets} -> ${before.wallets + walletImpact.need_insert}`);
line("10% admin charge (wiped)", rupee(dGross - dRep - dInc));

console.log("\n=== TOP 8 WALLET DELTAS (spot check) ===");
const top = await sql`
  WITH orphan_agg AS (
    SELECT p.user_id AS uid, count(*)::int AS n, count(*)::int * ${M} AS gross
    FROM pairs p
    WHERE NOT EXISTS (SELECT 1 FROM income i WHERE i.pair_id = p.id)
    GROUP BY 1
  ), direct_agg AS (
    SELECT u.referred_by AS uid, count(*)::int AS n, count(*)::int * ${D} AS gross
    FROM users u
    WHERE u.is_active = true AND u.referred_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM income i WHERE i.user_id = u.referred_by
                      AND i.type = 'direct' AND i.description LIKE '%#' || u.id)
    GROUP BY 1
  ), comb AS (
    SELECT uid, sum(n) AS events, sum(gross) AS gross
    FROM (SELECT uid, n, gross FROM orphan_agg
          UNION ALL SELECT uid, n, gross FROM direct_agg) t
    GROUP BY uid
  )
  SELECT c.uid, u.referral_code, c.events, c.gross, w.income_balance
  FROM comb c JOIN users u ON u.id = c.uid
  LEFT JOIN wallet w ON w.user_id = c.uid
  ORDER BY c.gross DESC LIMIT 8`;
for (const r of top) {
  const g = Number(r.gross);
  line(`  ${r.referral_code} (#${r.uid})`, `${r.events} events, +${rupee(g)} gross, +${rupee(INC(g))} withdrawable (now ${rupee(r.income_balance ?? 0)})`);
}

console.log("\n=== ATOMICITY PLAN (single statement, neon-http has no transactions) ===");
console.log("WITH ins_m AS (INSERT ... SELECT orphan pairs RETURNING user_id, amount),");
console.log("     ins_d AS (INSERT ... SELECT owed directs RETURNING user_id, amount),");
console.log("     agg   AS (group by user_id -> gross/rep/inc),");
console.log("     upd   AS (UPDATE wallet ... FROM agg),");
console.log("     add   AS (INSERT wallet for missing) SELECT counts");
console.log("Postgres executes all data-modifying CTEs of one statement atomically.");
