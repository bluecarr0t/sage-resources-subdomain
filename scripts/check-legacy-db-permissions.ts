#!/usr/bin/env npx tsx
/**
 * Check current user's permissions on the legacy camping database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { query, closeLegacyCampingPool, getLegacyCampingPool } from '../lib/legacy-camping-db';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🔐 Legacy Camping DB - Permission Check\n');

  try {
    // Current user
    const userResult = await query<{ current_user: string }>('SELECT current_user');
    console.log(`Connected as: ${userResult.rows?.[0]?.current_user}\n`);

    // Role membership
    const rolesResult = await query<{ rolname: string }>(
      `SELECT r.rolname FROM pg_roles r 
       JOIN pg_auth_members m ON r.oid = m.roleid 
       JOIN pg_roles u ON u.oid = m.member 
       WHERE u.rolname = current_user`
    );
    if (rolesResult.rows?.length) {
      console.log('Role memberships:', rolesResult.rows.map(r => r.rolname).join(', '));
    }

    // Table privileges for current user
    console.log('\n📋 Table privileges (sample from hipcamp & campspot):\n');
    const privResult = await query<{ table_schema: string; table_name: string; privilege_type: string }>(
      `SELECT table_schema, table_name, privilege_type
       FROM information_schema.table_privileges 
       WHERE grantee = current_user 
       AND table_schema IN ('hipcamp', 'campspot', 'public')
       ORDER BY table_schema, table_name, privilege_type
       LIMIT 50`
    );

    const byTable = new Map<string, string[]>();
    for (const row of privResult.rows || []) {
      const key = `${row.table_schema}.${row.table_name}`;
      if (!byTable.has(key)) byTable.set(key, []);
      byTable.get(key)!.push(row.privilege_type);
    }
    for (const [table, privs] of byTable) {
      console.log(`   ${table}: ${privs.join(', ')}`);
    }

    // Test: can we SELECT?
    console.log('\n🧪 Test SELECT on hipcamp.propertydetails (limit 1):');
    const testSelect = await query('SELECT id, name FROM hipcamp.propertydetails LIMIT 1');
    console.log(`   ✅ SELECT works: ${testSelect.rows?.length || 0} row(s) returned`);

    // Test: can we INSERT? (use a transaction we'll roll back)
    console.log('\n🧪 Test INSERT (will rollback):');
    const c = await getLegacyCampingPool().connect();
    try {
      await c.query('BEGIN');
      await c.query(`INSERT INTO hipcamp.imports (status, imported, duplicated) VALUES (false, 0, 0)`);
      await c.query('ROLLBACK');
      console.log('   ✅ INSERT allowed (test rolled back)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('permission') || msg.includes('denied')) {
        console.log('   ❌ INSERT denied');
      } else {
        console.log('   ⚠️  Error:', msg.slice(0, 80));
      }
      await c.query('ROLLBACK').catch(() => {});
    } finally {
      c.release();
    }

    // Test: can we SELECT and stream/download large result?
    console.log('\n📥 Download test: SELECT 100 rows from hipcamp.propertydetails:');
    const downloadTest = await query('SELECT * FROM hipcamp.propertydetails LIMIT 100');
    console.log(`   ✅ Retrieved ${downloadTest.rows?.length || 0} row(s) - download/export is possible`);

    console.log('\n✅ Permission check complete.');
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await closeLegacyCampingPool();
  }
}

main();
