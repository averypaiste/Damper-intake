const { PDFDocument, StandardFonts } = require(__dirname + '/../beta/markup/pdf-lib.min.js');
const fs = require('fs');
(async () => {
  for (const [name, words] of [['a.pdf', ['ALPHA ROOM', 'BETA ROOM']], ['b.pdf', ['GAMMA ROOM', 'DELTA ROOM']]]) {
    const d = await PDFDocument.create(), f = await d.embedFont(StandardFonts.Helvetica);
    for (const w of words) { const p = d.addPage([600, 400]); p.drawText(w, { x: 50, y: 200, size: 30, font: f }); }
    fs.writeFileSync(__dirname + '/' + name, await d.save());
  }
})();
