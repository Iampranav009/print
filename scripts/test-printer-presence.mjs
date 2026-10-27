import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';

function load(file, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => imports[name], Response, console });
  return exports;
}
const routing = load('apps/web/lib/printer-routing.ts');
const { printerReady } = load('apps/web/lib/printer-presence.ts', { './printer-routing': routing });
const printer = { os_printer_name: 'BW', bw_os_printer_name: 'BW', color_os_printer_name: 'Color', color_enabled: false };
assert.equal(printerReady(printer, [{ name: 'BW', available: true }]), true, 'B&W is usable without a manual connection type');
assert.equal(printerReady(printer, [{ name: 'BW', available: false }]), false, 'Offline queue is not usable');
assert.equal(printerReady(printer, []), false, 'Removed queue is not usable');
assert.equal(printerReady(null, [{ name: 'BW' }]), false, 'Discovery does not silently choose a printer');
assert.equal(printerReady({ ...printer, color_enabled: true }, [{ name: 'BW' }]), false, 'Enabled color requires its assigned queue');
assert.equal(printerReady({ ...printer, color_enabled: true }, [{ name: 'BW' }, { name: 'Color' }]), true);
console.log('Printer readiness regression checks passed.');

async function heartbeatScenario({ offline = false, writeError = false, discoveryError = false } = {}) {
  const writes = [];
  const database = { from(table) {
    let update;
    const query = {
      select() { return query; }, eq() { return query; }, order() { return query; }, limit() { return query; },
      update(values) { update = values; writes.push({ table, values }); return query; },
      maybeSingle() { return Promise.resolve({ data: table === 'printers' ? printer : {}, error: null }); },
      then(resolve) { return Promise.resolve({ error: writeError && table === 'shops' && update ? { message: 'write failed' } : null }).then(resolve); },
    };
    return query;
  } };
  const { POST } = load('apps/web/app/api/agent/heartbeat/route.ts', {
    '@/lib/supabase': { getSupabase: () => database },
    '@/lib/agent-auth': { resolveAgentToken: async () => ({ shopId: 'shop', agentId: 'agent' }) },
    '@/lib/printer-presence': { printerReady },
  });
  const response = await POST({ headers: new Headers(), json: async () => discoveryError ? { discoveryError: true } : { discoveredPrinters: [{ name: 'BW', available: !offline, status: offline ? 'offline' : 'ready' }] } });
  return { response, writes };
}
const online = await heartbeatScenario();
assert.equal((await online.response.json()).printerOnline, true);
const offline = await heartbeatScenario({ offline: true });
assert.equal((await offline.response.json()).printerOnline, false);
assert.equal(offline.writes.find(w => w.table === 'shops').values.discovered_printers[0].available, false);
assert.equal((await heartbeatScenario({ writeError: true })).response.status, 503, 'Discovery persistence failures must reach the agent');
const failed = await heartbeatScenario({ discoveryError: true });
assert.equal(failed.writes.find(w => w.table === 'shops').values.discovered_at, null, 'Failed discovery expires prior readiness');
console.log('Heartbeat endpoint regression checks passed.');
