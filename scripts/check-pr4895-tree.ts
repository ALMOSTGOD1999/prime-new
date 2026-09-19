import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Get PR4895's info
  const meResult = await sql`SELECT id, referral_code, name, parent_id, position, referred_by FROM users WHERE referral_code = 'PR4895'`;
  const me = meResult[0];
  if (!me) { console.log('PR4895 not found!'); return; }
  console.log('PR4895:', JSON.stringify(me, null, 2));

  // Get all direct referrals of PR4895
  const directs = await sql`SELECT id, referral_code, name, parent_id, position, referred_by FROM users WHERE referred_by = ${me.id} ORDER BY id`;
  console.log('\nDirect referrals count:', directs.length);
  for (const d of directs) {
    console.log(`  ${d.referral_code} (id:${d.id}) -> parent_id:${d.parent_id} pos:${d.position}`);
  }

  // Check PR4895's direct tree children
  const leftChild = await sql`SELECT id, referral_code, name, parent_id, position FROM users WHERE parent_id = ${me.id} AND position = 'left'`;
  const rightChild = await sql`SELECT id, referral_code, name, parent_id, position FROM users WHERE parent_id = ${me.id} AND position = 'right'`;
  console.log('\nPR4895 direct tree children:');
  console.log('  Left:', leftChild.length > 0 ? JSON.stringify(leftChild[0]) : 'EMPTY');
  console.log('  Right:', rightChild.length > 0 ? JSON.stringify(rightChild[0]) : 'EMPTY');

  // Find misplaced directs (parent_id != PR4895's id)
  const directIds = new Set(directs.map(d => d.id));
  const misplaced = directs.filter(d => d.parent_id !== me.id);
  if (misplaced.length > 0) {
    console.log('\n*** MISPLACED directs (parent_id != PR4895):', misplaced.length);
    for (const d of misplaced) {
      const parent = await sql`SELECT referral_code, name FROM users WHERE id = ${d.parent_id}`;
      console.log(`  ${d.referral_code} -> actual parent: ${parent[0]?.referral_code || 'UNKNOWN'} (${parent[0]?.name || ''})`);
    }
  }

  // Walk left subtree
  if (leftChild.length > 0) {
    const lc = leftChild[0];
    console.log(`\n--- Left subtree from ${lc.referral_code} ---`);
    const leftDesc = await sql`WITH RECURSIVE tree AS (
      SELECT id, referral_code, parent_id, position, referred_by FROM users WHERE parent_id = ${lc.id}
      UNION ALL
      SELECT u.id, u.referral_code, u.parent_id, u.position, u.referred_by
      FROM users u JOIN tree t ON u.parent_id = t.id
    ) SELECT * FROM tree ORDER BY id`;
    console.log(`  Descendants: ${leftDesc.length}`);
    for (const d of leftDesc) {
      const tag = directIds.has(d.id) ? ' [DIRECT]' : '';
      console.log(`    ${d.referral_code} pos:${d.position} ref:${d.referred_by}${tag}`);
    }
  }

  // Walk right subtree
  if (rightChild.length > 0) {
    const rc = rightChild[0];
    console.log(`\n--- Right subtree from ${rc.referral_code} ---`);
    const rightDesc = await sql`WITH RECURSIVE tree AS (
      SELECT id, referral_code, parent_id, position, referred_by FROM users WHERE parent_id = ${rc.id}
      UNION ALL
      SELECT u.id, u.referral_code, u.parent_id, u.position, u.referred_by
      FROM users u JOIN tree t ON u.parent_id = t.id
    ) SELECT * FROM tree ORDER BY id`;
    console.log(`  Descendants: ${rightDesc.length}`);
    for (const d of rightDesc) {
      const tag = directIds.has(d.id) ? ' [DIRECT]' : '';
      console.log(`    ${d.referral_code} pos:${d.position} ref:${d.referred_by}${tag}`);
    }
  }

  // Summary
  const leftDescAll = leftChild.length > 0 ? await sql`WITH RECURSIVE tree AS (
    SELECT id FROM users WHERE parent_id = ${leftChild[0].id}
    UNION ALL
    SELECT u.id FROM users u JOIN tree t ON u.parent_id = t.id
  ) SELECT id FROM tree` : [];
  const rightDescAll = rightChild.length > 0 ? await sql`WITH RECURSIVE tree AS (
    SELECT id FROM users WHERE parent_id = ${rightChild[0].id}
    UNION ALL
    SELECT u.id FROM users u JOIN tree t ON u.parent_id = t.id
  ) SELECT id FROM tree` : [];

  const leftIds = new Set(leftDescAll.map(d => d.id));
  const rightIds = new Set(rightDescAll.map(d => d.id));

  const directsInLeft = directs.filter(d => leftIds.has(d.id));
  const directsInRight = directs.filter(d => rightIds.has(d.id));
  const directsElsewhere = directs.filter(d => !leftIds.has(d.id) && !rightIds.has(d.id));

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total directs: ${directs.length}`);
  console.log(`In left subtree: ${directsInLeft.length}`);
  console.log(`In right subtree: ${directsInRight.length}`);
  console.log(`Elsewhere: ${directsElsewhere.length}`);
  if (directsElsewhere.length > 0) {
    for (const d of directsElsewhere) {
      console.log(`  ${d.referral_code} -> parent_id:${d.parent_id} pos:${d.position}`);
    }
  }
}

main().catch(console.error);
