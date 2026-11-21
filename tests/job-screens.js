// Run: serve the repo (python3 -m http.server 8765), then node tests/job-screens.js
// The screens read the job the same way: building and floor filters, linked notes shown by name (not record ID),
// the missing-info box and the result pill on a damper page.
const { chromium } = require('playwright');
const BASE = 'appTEST00000000001', TBL = 'tblTEST00000000001', NOTES = 'tblNOTES0000000001';
const F = (id, name, type, options) => ({ id, name, type, ...(options ? { options } : {}) });
const fields = [F('fld1', 'Damper IDs', 'singleLineText'), F('fld2', 'Building', 'singleLineText'), F('fld3', 'Operational Test', 'singleSelect', { choices: [{ name: 'Pass' }, { name: 'Fail' }] }),
  F('fld4', 'Inspection Note - Select', 'multipleRecordLinks', { linkedTableId: NOTES }), F('fld5', 'Missing Fields / Inconsistencies', 'multilineText')];
const rows = [
  { id: 'recA00000000000001', fields: { 'Damper IDs': 'FD-1-001', Building: 'A', 'Operational Test': 'Fail', 'Inspection Note - Select': ['recN00000000000001'], 'Missing Fields / Inconsistencies': 'No photo of the tag' } },
  { id: 'recA00000000000002', fields: { 'Damper IDs': 'FD-2-005', Building: 'A' } },
  { id: 'recB00000000000003', fields: { 'Damper IDs': 'FSD-3-010', Building: 'B' } },
];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block' }); const p = await ctx.newPage();
  await ctx.route(/airtable\.com/, async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === `/v0/meta/bases/${BASE}/tables`) return route.fulfill({ json: { tables: [
      { id: TBL, name: 'Damper Survey', primaryFieldId: 'fld1', fields, views: [{ id: 'viw1', name: 'Tech View', type: 'grid', visibleFieldIds: fields.map((f) => f.id) }] },
      { id: NOTES, name: 'Notes', primaryFieldId: 'fldN', fields: [F('fldN', 'Note', 'singleLineText')], views: [] }] } });
    if (u.pathname.startsWith('/v0/meta')) return route.fulfill({ json: { bases: [] } });
    if (u.pathname === `/v0/${BASE}/${NOTES}`) return route.fulfill({ json: { records: [{ id: 'recN00000000000001', fields: { Note: 'Fusible link missing' } }] } });
    if (u.pathname.startsWith(`/v0/${BASE}/`)) return route.fulfill({ json: { records: rows } });
    return route.fulfill({ json: {} });
  });
  await p.addInitScript((base) => {
    localStorage.setItem('beta:cfg', JSON.stringify({ token: 'patFAKE', base, table: 'Damper Survey', view: 'Tech View' }));
    localStorage.setItem('beta:fmode', 'grid');
    localStorage.setItem('beta:lock', JSON.stringify({ salt: 'AAAA', hash: 'x' })); sessionStorage.setItem('beta:lockSeen', String(Date.now()));
  }, BASE);
  await p.goto('http://localhost:8765/beta/');
  await p.waitForFunction(() => { try { return (getOpts()['Damper IDs'].choices || []).length === 3; } catch { return false; } }, null, { timeout: 15000 });
  await p.evaluate(() => renderHome()); await p.waitForTimeout(600);
  const opts = (id) => p.evaluate((i) => [...document.getElementById(i).options].map((o) => o.text), id);
  const bld = await opts('hBld'), flr = await opts('hFlr');
  await p.evaluate(() => document.querySelectorAll('.ggrp').forEach((g) => g.click())); await p.waitForTimeout(300);
  const grid = await p.textContent('.gridwrap');
  const label = await p.evaluate(() => getOpts()['Damper IDs'].choices.find((l) => l.includes('FD-1-001')));
  await p.evaluate((l) => openDamper(l), label); await p.waitForTimeout(600);
  const miss = await p.textContent('#missText'), pill = await p.textContent('#dOp');
  console.log({ bld, flr, label, noteByName: grid.includes('Fusible link missing'), idLeak: /recN0/.test(grid), miss, pill });
  const ok = bld.join() === 'All buildings,Bldg A,Bldg B' && flr.join() === 'Floor,Floor 1,Floor 2,Floor 3' && grid.includes('Fusible link missing') && !/recN0/.test(grid) && miss === 'No photo of the tag' && pill === 'Fail';
  console.log(ok ? 'GREEN' : 'RED');
  await b.close();
})();
