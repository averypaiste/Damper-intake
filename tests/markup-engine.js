// Run: node tests/make-pdfs.js once, serve the repo (python3 -m http.server 8765), then node tests/markup-engine.js [url]
// Puts the same labels on a page, tidies them and exports a picture and a PDF. Prints a fingerprint of the picture,
// so two versions of Markup (before and after a change) can be compared: the same fingerprint = the same drawing.
const { chromium } = require('playwright');
const crypto = require('crypto');
(async () => {
  const url = process.argv[2] || 'http://localhost:8765/beta/markup/';
  const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 900, height: 700 } }); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url);
  await p.setInputFiles('#file', __dirname + '/a.pdf');
  await p.waitForFunction(() => document.getElementById('title').textContent === 'a.pdf' && document.getElementById('pfIn'));
  await p.evaluate(() => openPage(1)); await p.waitForFunction(() => S.page && S.pageNo === 1);
  const out = await p.evaluate(async () => {
    S.marks = []; $('idIn').value = 'FSD-1-12';
    for (const [x, y] of [[300, 200], [320, 210], [100, 300]]) addMark({ x, y });
    S.marks[1].style = 'circle'; S.marks[2].color = 'green'; S.marks[2].ink = 'red'; S.marks[2].note = 'Passed, new link';
    tidy();
    const o = await buildOut('page');
    const buf = new Uint8Array(await o.blob.arrayBuffer());
    const pdf = await buildPdf('marked');
    const L = await (await pdfWriter()).PDFDocument.load(await pdf.arrayBuffer());
    return { ids: S.marks.map((m) => m.id), boxes: S.marks.map((m) => [Math.round(m.bx), Math.round(m.by)]), png: Array.from(buf), w: o.w, h: o.h, pdfPages: L.getPageCount(), next: $('idIn').value, hitBox: !!hit(S.marks[0].bx + 2, S.marks[0].by + 2) };
  });
  const sha = crypto.createHash('sha256').update(Buffer.from(out.png)).digest('hex').slice(0, 16);
  console.log({ ids: out.ids, boxes: out.boxes, size: out.w + 'x' + out.h, picture: sha, pdfPages: out.pdfPages, next: out.next, hitBox: out.hitBox, errors });
  const ok = out.ids.join() === 'FSD-1-12,FSD-1-13,FSD-1-14' && out.next === 'FSD-1-15' && out.pdfPages === 1 && out.hitBox && !errors.length;
  console.log(ok ? 'GREEN' : 'RED');
  await b.close();
})();
