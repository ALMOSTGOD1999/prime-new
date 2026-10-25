import "dotenv/config";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const CUT = "2026-09-15";
const line = (k, v) => console.log(String(k).padEnd(56) + v);
let fail = 0;
const check = (k, v, ok) => {
  line(k, `${v}  ${ok ? "PASS" : "**FAIL**"}`);
  if (!ok) fail++;
};

// 1. Referral: exactly 13 rows at ₹150, none pre-cutoff
const [d] = await sql`
  SELECT count(*) filter (WHERE amount = 150)::int AS paid,
         coalesce(sum(amount),0)::int AS total,
         count(*) filter (WHERE amount NOT IN (0,150))::int AS weird,
         count(*) filter (WHERE amount > 0 AND (created_at + interval '5h30m')::date < ${CUT}::date)::int AS precut_paid
  FROM income WHERE type='direct'`;
check(
  "direct rows paid at ₹150",
  `${d.paid} rows, ${d.total}`,
  d.paid === 13 && d.total === 1950 && d.weird === 0 && d.precut_paid === 0,
);

// 2. Matching: 12 in-window at ₹600, all 1210 pre-cutoff zeroed
const [m] = await sql`
  SELECT count(*) filter (WHERE amount = 600)::int AS paid600,
         count(*) filter (WHERE (created_at + interval '5h30m')::date >= ${CUT}::date)::int AS inwindow,
         coalesce(sum(amount) filter (WHERE (created_at + interval '5h30m')::date < ${CUT}::date),0)::int AS precut_amt,
         count(*) filter (WHERE amount NOT IN (0,600))::int AS weird
  FROM income WHERE type='matching'`;
check(
  "matching in-window / paid / pre-cut zeroed",
  `${m.inwindow} rows, ${m.paid600} at ₹600, pre-cut ₹${m.precut_amt}`,
  m.inwindow === 12 && m.paid600 === 12 && m.precut_amt === 0 && m.weird === 0,
);

// 3. Pair integrity: in-window pairs must carry two DISTINCT real members.
//    The 1210 pre-cutoff rows were written by the old "simplified" path
//    (left = right = newUserId) and are outside this backfill's scope.
const [pi] = await sql`
  SELECT count(*)::int AS n, count(*) filter (WHERE left_user_id = right_user_id)::int AS same
  FROM pairs WHERE (created_at + interval '5h30m')::date >= ${CUT}::date`;
check(
  "in-window pairs: distinct members",
  `${pi.n} pairs, ${pi.same} same-member`,
  pi.n === 12 && pi.same === 0,
);

const [orphan] = await sql`
  SELECT count(*)::int AS n FROM pairs p
  WHERE NOT EXISTS (SELECT 1 FROM income i WHERE i.pair_id = p.id)`;
check("pairs without an income row", `${orphan.n}`, orphan.n === 0);

// 4. Daily cap: no user exceeds 3 pairs on any IST day
const cap = await sql`
  SELECT user_id, to_char((created_at + interval '5h30m')::date,'YYYY-MM-DD') AS d, count(*)::int AS n
  FROM pairs WHERE (created_at + interval '5h30m')::date >= ${CUT}::date
  GROUP BY 1,2 HAVING count(*) > 3`;
check("daily cap 3/user/IST-day", `${cap.length} violations`, cap.length === 0);

// 5. Wallet consistency vs income for direct+matching
const [w] = await sql`
  SELECT coalesce(sum(income_balance),0)::int AS inc, coalesce(sum(total_earned),0)::int AS earned,
         coalesce(sum(working_balance),0)::int AS work, coalesce(sum(repurchase_balance),0)::int AS rep
  FROM wallet`;
check(
  "wallet totals",
  `inc ₹${w.inc}, earned ₹${w.earned}, work ₹${w.work}, rep ₹${w.rep}`,
  w.inc === 26889 && w.earned === 148577,
);

// 6. PR5997
const [me] = await sql`
  SELECT u.id, w.income_balance, w.total_earned,
         (SELECT count(*)::int FROM pairs WHERE user_id = u.id AND (created_at + interval '5h30m')::date >= ${CUT}::date) AS post_pairs
  FROM users u JOIN wallet w ON w.user_id = u.id WHERE u.referral_code = 'PR5997'`;
check(
  "PR5997: 2 in-window pairs, credited",
  `${me.post_pairs} pairs, inc ₹${me.income_balance}, earned ₹${me.total_earned}`,
  me.post_pairs === 2,
);

// 7. daily_pairs cleared
const [dp] = await sql`SELECT count(*)::int AS n FROM daily_pairs WHERE pair_date >= ${CUT}`;
check("daily_pairs cleared from cutoff", `${dp.n} rows`, dp.n === 0);

console.log(fail === 0 ? "\nALL CHECKS PASS" : `\n${fail} CHECK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
