// Run: serve the repo (python3 -m http.server 8765), then node tests/damper-save.js clear|stale|unpick|pass|paste|cell|new
// Damper page: what gets sent to Airtable when a tech edits one field / clears one field.
// Fake Airtable (no real account is touched): every request to api.airtable.com is answered here.
const { chromium } = require('playwright');
const BASE = 'appTEST00000000001', TBL = 'tblTEST00000000001', REC = 'recTEST00000000001';
const F = (id, name, type, options) => ({ id, name, type, ...(options ? { options } : {}) });
const fields = [F('fld1', 'Damper IDs', 'singleLineText'), F('fld2', 'Room/location', 'singleLineText'), F('fld3', 'Inspection Field Notes', 'multilineText'),
  F('fld4', 'Operational Test', 'singleSelect', { choices: [{ name: 'Pass' }, { name: 'Fail' }] }), F('fld5', 'Inspection Date', 'date'), F('fld6', 'Barrier Rating', 'singleSelect', { choices: [{ name: '1 HR' }, { name: '2 HR' }] }), F('fld7', 'Inspector(s)', 'multipleSelects', { choices: [{ name: 'Avery P' }, { name: 'Sam T' }] })];
const server = { 'Damper IDs': 'FD-1-001', 'Room/location': 'Office 1', 'Inspection Field Notes': 'old note', 'Operational Test': 'Fail', 'Barrier Rating': '2 HR', 'Inspector(s)': ['Avery P', 'Sam T'] };
(async () => {
  const scenario = process.argv[2];
  const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block' }); const p = await ctx.newPage();
  const patches = [], posts = [];
  await ctx.route(/airtable\.com/, async (route) => {
    const r = route.request(), u = new URL(r.url());
    if (r.method() === 'POST' && u.hostname === 'api.airtable.com') { posts.push(JSON.parse(r.postData()).fields); return route.fulfill({ json: { id: 'recNEW0000000000001', fields: JSON.parse(r.postData()).fields } }); }
    if (r.method() === 'PATCH') { patches.push(JSON.parse(r.postData()).fields); return route.fulfill({ json: { id: REC, fields: server } }); }
    if (u.pathname === `/v0/meta/bases/${BASE}/tables`) return route.fulfill({ json: { tables: [{ id: TBL, name: 'Damper Survey', primaryFieldId: 'fld1', fields, views: [{ id: 'viw1', name: 'Tech View', type: 'grid', visibleFieldIds: fields.map((f) => f.id) }] }] } });
    if (u.pathname.startsWith('/v0/meta')) return route.fulfill({ json: { bases: [{ id: BASE, name: 'Test damper job', permissionLevel: 'create' }] } });
    if (u.pathname.startsWith(`/v0/${BASE}/`)) return route.fulfill({ json: { records: [{ id: REC, fields: server }] } });
    return route.fulfill({ json: {} });
  });
  await p.addInitScript(([base]) => {
    if (!localStorage.getItem('beta:cfg')) localStorage.setItem('beta:cfg', JSON.stringify({ token: 'patFAKE', base, table: 'Damper Survey', view: '' }));
    localStorage.setItem('beta:lock', JSON.stringify({ salt: 'AAAA', hash: 'x' })); sessionStorage.setItem('beta:lockSeen', String(Date.now()));
  }, [BASE]);
  await p.goto('http://localhost:8765/beta/');
  await p.waitForFunction(() => { try { return (getOpts()['Damper IDs'].choices || []).length > 0; } catch { return false; } }, null, { timeout: 15000 });
  const label = await p.evaluate(() => getOpts()['Damper IDs'].choices[0]);
  if (scenario === 'stale') server['Room/location'] = 'Office 2 (changed by the office)'; // office edits Airtable after the phone loaded the list
  if (scenario === 'new') { // a new damper is created with what was typed
    await p.evaluate(() => openNew(true)); await p.waitForTimeout(300);
    await p.fill('#' + await p.evaluate(() => fid('Damper ID #')), '099');
    await p.fill('#' + await p.evaluate(() => fid('Room/location')), 'New room');
    await p.evaluate(() => document.getElementById('detail').close()); await p.waitForTimeout(2500);
    console.log('POST bodies sent:', JSON.stringify(posts));
    const sent = posts[0] || {};
    console.log(sent['Damper ID #'] === '099' && sent['Room/location'] === 'New room' && !('Inspection Field Notes' in sent) ? 'GREEN' : 'RED'); await b.close(); return;
  }
  if (['pass', 'paste', 'cell'].includes(scenario)) { // the other screens that send a change
    if (scenario === 'pass') { await p.evaluate(([l, r]) => openPass(l, r), [label, REC]); await p.click('#psSave'); }
    if (scenario === 'paste') await p.evaluate(([l, r]) => { clip = { f: FIELDS.find((x) => x.key === 'Inspector(s)'), v: ['Sam T'] }; return pasteCell(l, r, document.createElement('div')); }, [label, REC]);
    if (scenario === 'cell') { await p.evaluate(async ([l, r]) => openQuick(l, 'Room/location', await loadDetail(), { [l]: r }), [label, REC]); await p.fill('#qBody input', 'Office 9'); await p.click('#qSave'); }
    await p.waitForTimeout(2500);
    const sent = Object.assign({}, ...patches);
    const shown = await p.evaluate(async (r) => (await loadDetail()).fill[r], REC);
    console.log('PATCH bodies sent:', JSON.stringify(patches), '| phone copy now:', JSON.stringify(shown));
    const want = { pass: { 'Operational Test': 'Pass' }, paste: { 'Inspector(s)': ['Sam T'] }, cell: { 'Room/location': 'Office 9' } }[scenario];
    const ok = Object.entries(want).every(([k, v]) => JSON.stringify(sent[k]) === JSON.stringify(v) && JSON.stringify(shown[k]) === JSON.stringify(v));
    console.log(ok ? 'GREEN' : 'RED'); await b.close(); return;
  }
  await p.evaluate((l) => openDamper(l), label); await p.waitForTimeout(500);
  const sel = await p.evaluate(() => ({ notes: document.getElementById(fid('Inspection Field Notes')).value, room: document.getElementById(fid('Room/location')).value }));
  console.log('form opened with', JSON.stringify(sel));
  if (scenario === 'unpick') await p.evaluate(() => { const el = document.getElementById(fid('Inspector(s)')); el.dataset.sel = JSON.stringify(['Sam T']); el.value = 'Sam T'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  else if (scenario === 'clear') await p.fill('#' + await p.evaluate(() => fid('Inspection Field Notes')), '');
  else await p.fill('#' + await p.evaluate(() => fid('Inspection Field Notes')), 'old note\nadded today');
  await p.evaluate(() => document.getElementById('detail').close());
  await p.waitForTimeout(2500);
  console.log('PATCH bodies sent:', JSON.stringify(patches));
  const sent = Object.assign({}, ...patches);
  let ok;
  if (scenario === 'unpick') ok = JSON.stringify(sent['Inspector(s)']) === '["Sam T"]' && !('Inspection Field Notes' in sent);
  else   if (scenario === 'clear') ok = 'Inspection Field Notes' in sent && !sent['Inspection Field Notes'];
  else ok = !('Room/location' in sent) && !('Barrier Rating' in sent) && !('Operational Test' in sent) && /added today/.test(sent['Inspection Field Notes'] || '');
  console.log(ok ? 'GREEN' : 'RED');
  await b.close();
})();
