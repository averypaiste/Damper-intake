// Run: node tests/make-pdfs.js once, then serve the repo (python3 -m http.server 8765) and run node tests/markup-search.js [url]
// Markup: searching a 2nd PDF must use the 2nd PDF's own text
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:8765/beta/markup/';
  const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.goto(url);
  const open = async (f) => { await p.setInputFiles('#file', __dirname + '/' + f); await p.waitForFunction((n) => document.getElementById('title').textContent === n && document.getElementById('pfIn'), f); };
  const find = async (q) => { await p.fill('#pfIn', q); await p.click('.pfind button[type=submit]'); await p.waitForFunction(() => !/Searching/.test(document.getElementById('pfRes').textContent)); return p.textContent('#pfRes'); };
  await open('a.pdf'); console.log('a.pdf ALPHA ->', await find('ALPHA'));
  await open('b.pdf'); const r = await find('GAMMA'); console.log('b.pdf GAMMA ->', r);
  console.log(/1 page:/.test(r) ? 'GREEN' : 'RED');
  await b.close();
})();
