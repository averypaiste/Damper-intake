// Run: serve the repo (python3 -m http.server 8765), then node tests/save-cancelled.js
// A save the phone cancels at the last moment (what a full phone does): it must fail with a message, not hang
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block' }); const p = await ctx.newPage();
  await ctx.route(/airtable\.com/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('beta:lock', JSON.stringify({ salt: 'AAAA', hash: 'x' })); sessionStorage.setItem('beta:lockSeen', String(Date.now())); });
  await p.goto('http://localhost:8765/beta/'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => Promise.race([
    tx('readwrite', (s) => { const q = s.put({ id: 'x', createdAt: 0 }); q.onsuccess = () => s.transaction.abort(); return q; }).then(() => 'resolved', () => 'rejected'),
    new Promise((res) => setTimeout(() => res('HUNG'), 2000)),
  ]));
  console.log('cancelled write ->', r); console.log(r === 'rejected' ? 'GREEN' : 'RED');
  await b.close();
})();
