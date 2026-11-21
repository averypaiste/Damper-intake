// Run: serve the repo (python3 -m http.server 8765), then node tests/old-maps.js
// A map someone drew with the old Map maker (before it was removed) still shows up and opens in Markup.
const { chromium } = require('playwright');
const BASE = 'appTEST00000000001';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block' }); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await ctx.route(/airtable\.com/, (r) => r.abort());
  await p.addInitScript((base) => {
    localStorage.setItem('beta:cfg', JSON.stringify({ token: 'patFAKE', base, table: 'Damper Survey', view: '' }));
    localStorage.setItem('beta:mm', JSON.stringify({ [base]: [{ id: 'x1', name: 'Floor 2 plan', png: true, size: 1000 }] }));
    localStorage.setItem('beta:fmode', 'grid');
    localStorage.setItem('beta:lock', JSON.stringify({ salt: 'AAAA', hash: 'x' })); sessionStorage.setItem('beta:lockSeen', String(Date.now()));
  }, BASE);
  await p.goto('http://localhost:8765/beta/');
  await p.evaluate(async () => { // the picture the old Map maker saved
    const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 300); g.strokeRect(20, 20, 360, 260);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    await (await caches.open('beta-mapmaker')).put('https://local.invalid/mm/x1.png', new Response(blob, { headers: { 'Content-Type': 'image/png' } }));
  });
  const listed = await p.evaluate(async () => { const m = mapsHere(); return { n: m.length, fn: m[0] && m[0].fn, bytes: m[0] ? (await mapBlob(m[0])).size : 0 }; });
  await p.evaluate(() => document.getElementById('btnMU').click());
  await p.waitForURL(/markup\/#job/); await p.waitForFunction(() => document.getElementById('title').textContent !== 'Damper Markup', null, { timeout: 10000 });
  const title = await p.textContent('#title');
  console.log({ listed, markupOpened: title, errors });
  console.log(listed.n === 1 && listed.bytes > 0 && title === 'Floor 2 plan.png' && !errors.length ? 'GREEN' : 'RED');
  await b.close();
})();
