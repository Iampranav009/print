// Isolated PostgreSQL regression check; never connects to the production database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PGlite } = require('../.agent-build/test-runtime/node_modules/@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
create role anon;
create role authenticated;
create role service_role bypassrls;
create table public.agents (id uuid primary key);
create table public.printers (id uuid primary key, os_printer_name text not null);
insert into agents values ('00000000-0000-0000-0000-000000000001');
insert into printers values ('00000000-0000-0000-0000-000000000002', 'Existing printer');
`);
await db.exec(fs.readFileSync('supabase/migrations/20260915041012_agent_pairing_and_printer_routing.sql', 'utf8'));
let rows = (await db.query('select bw_os_printer_name, color_os_printer_name from printers')).rows;
assert.equal(rows[0].bw_os_printer_name, 'Existing printer');
assert.equal(rows[0].color_os_printer_name, 'Existing printer');
await db.exec(`update printers set bw_os_printer_name='Mono printer', color_os_printer_name='Color printer'`);
rows = (await db.query('select bw_os_printer_name, color_os_printer_name from printers')).rows;
assert.equal(rows[0].bw_os_printer_name, 'Mono printer');
assert.equal(rows[0].color_os_printer_name, 'Color printer');
await db.query(`insert into agent_pairings values ($1, $2, now()+interval '10 minutes', null)`, ['00000000-0000-0000-0000-000000000001', 'a'.repeat(64)]);
await db.exec('set role service_role');
const consume = () => db.query(`update agent_pairings set used_at=now() where token_hash=$1 and used_at is null and expires_at > now() returning agent_id`, ['a'.repeat(64)]);
const results = await Promise.all([consume(), consume()]);
assert.equal(results.reduce((sum, r) => sum + r.rows.length, 0), 1);
await db.exec('reset role');
await db.exec(`update agent_pairings set used_at=null, expires_at=now()-interval '1 minute'`);
assert.equal((await consume()).rows.length, 0);
for (const role of ['anon', 'authenticated']) {
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query('select * from agent_pairings'), /permission denied/);
  await db.exec('reset role');
}
const rls = await db.query(`select relrowsecurity from pg_class where relname='agent_pairings'`);
assert.equal(rls.rows[0].relrowsecurity, true);
await db.close();
console.log('Postgres checks passed: existing settings preserved, split routing, single-use redemption, expiry, RLS and role isolation.');
