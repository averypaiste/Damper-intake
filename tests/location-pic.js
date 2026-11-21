// Run: serve the repo (python3 -m http.server 8765), then node tests/location-pic.js
// Location Pic "Mark on map" with a screenshot: tap the damper's spot, the label is drawn (by the Markup engine)
// and the picture is added to Location Pic. Saves location-pic.png next to this file to look at.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 420, height: 800 } }); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await ctx.route(/airtable\.com/, (r) => r.abort());
  await p.addInitScript(() => { localStorage.setItem('beta:lock', JSON.stringify({ salt: 'AAAA', hash: 'x' })); sessionStorage.setItem('beta:lockSeen', String(Date.now())); });
  await p.goto('http://localhost:8765/beta/'); await p.waitForTimeout(500);
  await p.evaluate(async () => {
    openNew(true); document.getElementById(fid('Damper ID #')).value = '011';
    const c = document.createElement('canvas'); c.width = 1200; c.height = 800; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 1200, 800); g.strokeStyle = '#000'; g.lineWidth = 6; g.strokeRect(100, 100, 1000, 600); g.strokeRect(500, 100, 300, 300);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    locMarkup(new File([blob], 'plan.png', { type: 'image/png' }));
  });
  await p.waitForSelector('.mkdlg canvas'); await p.waitForTimeout(300);
  const box = await p.locator('.mkdlg canvas').boundingBox();
  await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.6);
  await p.waitForTimeout(200);
  await p.locator('.mkdlg').screenshot({ path: __dirname + '/location-pic.png' });
  await p.click('.mkdlg .mkbar button:last-child'); await p.waitForTimeout(600);
  const n = await p.evaluate(() => (pendingPhotos['Location Pic'] || []).length);
  console.log({ locationPics: n, errors });
  console.log(n === 1 && !errors.length ? 'GREEN' : 'RED');
  await b.close();
})();
