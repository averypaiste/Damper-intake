// Run: serve the repo (python3 -m http.server 8765), then node tests/airtable-read.js
// Reading a big job: 250 dampers come back from (fake) Airtable 100 at a time, with one "slow down" (error 429)
// on the way. Every damper must show up in the list, in the chosen view.
const { chromium } = require('playwright');
const BASE = 'appTEST00000000001', TBL = 'tblTEST00000000001';
const fields = [{ id: 'fld1', name: 'Damper IDs', type: 'singleLineText' }, { id: 'fld2', name: 'Room/location', type: 'singleLineText' }];
const rows = Array.from({ length: 250 }, (_, i) => ({ id: 'rec' + String(i).padStart(14, '0'), fields: { 'Damper IDs': 'FD-1-' + String(i + 1).padStart(3, '0'), 'Room/location': 'Room ' + i } }));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block' }); const p = await ctx.newPage();
  let slowed = false; const views = new Set();
  await ctx.route(/airtable\.com/, async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === `/v0/meta/bases/${BASE}/tables`) return route.fulfill({ json: { tables: [{ id: TBL, name: 'Damper Survey', primaryFieldId: 'fld1', fields, views: [{ id: 'viwTECH', name: 'Tech View', type: 'grid', visibleFieldIds: ['fld1', 'fld2'] }] }] } });
    if (u.pathname.startsWith('/v0/meta')) return route.fulfill({ json: { bases: [] } });
    if (u.pathname.startsWith(`/v0/${BASE}/`)) {
      if (u.searchParams.get('offset') === '100' && !slowed) { slowed = true; return route.fulfill({ status: 429, json: { errors: [{ error: 'RATE_LIMIT_REACHED' }] } }); }
      views.add(u.searchParams.get('view') || '');
      const at = +(u.searchParams.get('offset') || 0), page = rows.slice(at, at + 100);
      return route.fulfill({ json: { records: page, ...(at + 100 < rows.length ? { offset: String(at + 100) } : {}) } });
    }
    return route.fulfill({ json: {} });
  });
  await p.addInitScript((base) => {
    localStorage.setItem('beta:cfg', JSON.stringify({ token: 'patFAKE', base, table: 'Damper Survey', view: 'Tech View' }));
    localStorage.setItem('beta:lock', JSON.stringify({ salt: 'AAAA', hash: 'x' })); sessionStorage.setItem('beta:lockSeen', String(Date.now()));
  }, BASE);
  await p.goto('http://localhost:8765/beta/');
  await p.waitForFunction(() => { try { return (getOpts()['Damper IDs'].choices || []).length > 0; } catch { return false; } }, null, { timeout: 20000 });
  const n = await p.evaluate(() => getOpts()['Damper IDs'].choices.length);
  console.log('dampers in the list:', n, '| slowed down once:', slowed, '| views asked for:', [...views].join(','));
  console.log(n === 250 && slowed && views.has('viwTECH') ? 'GREEN' : 'RED');
  await b.close();
})();
