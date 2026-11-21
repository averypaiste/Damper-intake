/* Damper Markup engine: how a damper label looks, where it goes and how it is saved.
   Shared by the Markup page inside the app (beta/markup/), the standalone Markup copy and the app's
   Location Pic "Mark on map". Change the look here once and all three follow.
   A mark: { id, note, color, ink, style: 'line' | 'circle', x, y (the spot), bx, by (box top-left), s (size), fw, fh (tidied box size) }
   in page units (PDF points or picture pixels). fill (a color) can replace color for a one-off box color. */
(function () {
'use strict';
const COLORS = [
  { key: 'pink', name: 'Pink', fill: '#fc9699' },
  { key: 'green', name: 'Green (pass)', fill: '#c9fcc0' },
  { key: 'yellow', name: 'Yellow', fill: '#ffe98a' },
  { key: 'blue', name: 'Blue', fill: '#b9dcff' },
  { key: 'white', name: 'White', fill: '#ffffff' },
];
const fillOf = (k) => (COLORS.find((c) => c.key === k) || COLORS[0]).fill;
const RED = '#e81e24';
// Line color: the leader line, the square on the spot and the label's border. Bright colors stand out over the black plan lines.
const INKS = [
  { key: 'black', name: 'Black', c: '#000000' },
  { key: 'red', name: 'Red', c: '#e81e24' },
  { key: 'blue', name: 'Blue', c: '#1460f0' },
  { key: 'magenta', name: 'Magenta', c: '#d6129b' },
  { key: 'orange', name: 'Orange', c: '#ff7a00' },
  { key: 'green', name: 'Green', c: '#0a9c3a' },
];
const inkOf = (k) => (INKS.find((c) => c.key === k) || INKS[0]).c;
const FONT = 'Arial, Helvetica, sans-serif';
const mctx = document.createElement('canvas').getContext('2d'); // for measuring text

/* ---------- geometry of one markup ---------- */
// A mark: { id, note, color, x, y (spot), bx, by (box top-left), s (size) } in page units.
const isLine = (m) => m.style === 'line'; // small label + thin line + square on the spot (older marks are circle + arrow)
function layout(m) {
  const s = m.s, line = isLine(m), pad = (line ? 7 : 6) * s, fs = (line ? 20 : 25) * s, nfs = (line ? 16 : 19) * s, lh = nfs * 1.2;
  mctx.font = 'bold ' + fs + 'px ' + FONT;
  const idW = mctx.measureText(m.id || ' ').width;
  let w = line ? idW + pad * 2 : Math.max(205 * s, idW + pad * 2 + 4 * s);
  const lines = [];
  if (m.note) {
    mctx.font = nfs + 'px ' + FONT;
    const maxW = Math.max(w, 150 * s) - pad * 2;
    let cur = '';
    for (const word of String(m.note).split(/\s+/)) {
      const t = cur ? cur + ' ' + word : word;
      if (cur && mctx.measureText(t).width > maxW) { lines.push(cur); cur = word; } else cur = t;
    }
    if (cur) lines.push(cur);
    for (const l of lines) w = Math.max(w, mctx.measureText(l).width + pad * 2);
  }
  let top = (line ? 4 : 5) * s, noteY = top + fs * 1.22;
  let h = line ? noteY + lines.length * lh + (lines.length ? 4 : 1) * s : Math.max(100 * s, noteY + lines.length * lh + pad);
  // "Tidy labels" gives every label on the page the same box size; the text is centered in it
  let idX = pad;
  if (m.fw && m.fw > w) { w = m.fw; if (line) idX = (w - idW) / 2; }
  if (m.fh && m.fh > h) { const d = (m.fh - h) / 2; top += d; noteY += d; h = m.fh; }
  const r = line ? 9 * s : 0;
  return { w, h, lines, rx: line ? r : 36 * s, ry: line ? r : 26 * s, pad, fs, nfs, lh, top, noteY, line, idX };
}
function leader(m, L) {
  const s = m.s, cx = m.bx + L.w / 2, cy = m.by + L.h / 2, dx = m.x - cx, dy = m.y - cy;
  let a, b; // a = on the box edge, b = end of the short stub
  if (Math.abs(dy) / L.h > Math.abs(dx) / L.w) { const d = dy > 0 ? 1 : -1; a = { x: cx, y: d > 0 ? m.by + L.h : m.by }; b = { x: cx, y: a.y + d * 25 * s }; }
  else { const d = dx > 0 ? 1 : -1; a = { x: d > 0 ? m.bx + L.w : m.bx, y: cy }; b = { x: a.x + d * 25 * s, y: cy }; }
  const ang = Math.atan2(m.y - b.y, m.x - b.x), back = ang + Math.PI;
  const t = 1 / Math.sqrt(Math.pow(Math.cos(back) / L.rx, 2) + Math.pow(Math.sin(back) / L.ry, 2)) + 4 * s;
  const e = { x: m.x + t * Math.cos(back), y: m.y + t * Math.sin(back) };
  const ok = Math.hypot(m.x - b.x, m.y - b.y) > t + 12 * s; // room for an arrow
  return { a, b, e, ang, ok };
}
function drawMark(c, m, selected) {
  const s = m.s, L = layout(m), fill = m.fill || fillOf(m.color), ink = inkOf(m.ink), bold = ink !== '#000000';
  c.lineCap = 'butt'; c.lineJoin = 'miter';
  const G = leader(m, L);
  if (L.line) {
    // thin line from the label to the spot, then a small square in the label's color on the spot
    c.strokeStyle = ink; c.lineWidth = (bold ? 2.4 : 1.6) * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(G.a.x, G.a.y); c.lineTo(m.x, m.y); c.stroke();
    c.lineCap = 'butt'; c.fillStyle = fill; c.lineWidth = (bold ? 2 : 1.4) * s;
    c.beginPath(); c.rect(m.x - L.rx * 0.72, m.y - L.ry * 0.72, L.rx * 1.44, L.ry * 1.44); c.fill(); c.stroke();
  } else {
    // red oval on the spot, arrow with a short stub off the box
    c.strokeStyle = RED; c.lineWidth = 4 * s;
    c.beginPath(); c.ellipse(m.x, m.y, L.rx, L.ry, 0, 0, Math.PI * 2); c.stroke();
    if (G.ok) {
      c.strokeStyle = ink; c.lineWidth = 3 * s; c.lineCap = 'round';
      c.beginPath(); c.moveTo(G.a.x, G.a.y); c.lineTo(G.b.x, G.b.y); c.lineTo(G.e.x, G.e.y); c.stroke();
      for (const d of [0.38, -0.38]) { c.beginPath(); c.moveTo(G.e.x, G.e.y); c.lineTo(G.e.x - 26 * s * Math.cos(G.ang + d), G.e.y - 26 * s * Math.sin(G.ang + d)); c.stroke(); }
    }
  }
  // box
  c.fillStyle = fill; c.strokeStyle = ink; c.lineWidth = (L.line ? (bold ? 2.6 : 2) : 3) * s; c.lineCap = 'butt';
  c.beginPath(); c.rect(m.bx, m.by, L.w, L.h); c.fill(); c.stroke();
  c.fillStyle = '#000'; c.textBaseline = 'top'; c.textAlign = 'left';
  c.font = 'bold ' + L.fs + 'px ' + FONT; c.fillText(m.id || '', m.bx + L.idX, m.by + L.top);
  c.font = L.nfs + 'px ' + FONT;
  L.lines.forEach((l, i) => c.fillText(l, m.bx + L.pad, m.by + L.noteY + i * L.lh));
  if (selected) {
    c.save(); c.strokeStyle = '#166ee1'; c.lineWidth = 2.5 * s; c.setLineDash([8 * s, 6 * s]);
    c.strokeRect(m.bx - 6 * s, m.by - 6 * s, L.w + 12 * s, L.h + 12 * s);
    c.beginPath(); c.ellipse(m.x, m.y, L.rx + 8 * s, L.ry + 8 * s, 0, 0, Math.PI * 2); c.stroke(); c.restore();
  }
}
function hit(marks, px, py, k) { // the label or spot under a point (page units); k = screen pixels per page unit
  const slop = 10 / k;
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i], L = layout(m);
    if (px >= m.bx - slop && px <= m.bx + L.w + slop && py >= m.by - slop && py <= m.by + L.h + slop) return { m, part: 'box' };
    const sp = L.line ? Math.max(slop, 16 / k - L.rx) : slop;
    const ex = (px - m.x) / (L.rx + sp), ey = (py - m.y) / (L.ry + sp);
    if (ex * ex + ey * ey <= 1) return { m, part: 'spot' };
  }
  return null;
}
function bump(id) { // FSD-1-12 -> FSD-1-13, keeps leading zeros
  const m = /^(.*?)(\d+)(\D*)$/.exec(id); if (!m) return id;
  const n = String(parseInt(m[2], 10) + 1); return m[1] + n.padStart(m[2].length, '0') + m[3];
}

/* ---------- tidy labels ---------- */
// Gives every label on the page the same box size, then moves each box close to its own spot so that no
// boxes overlap, no box covers a spot, lines cross as little as possible, and boxes sit on blank parts of the plan.
function darkness(src, W, H) { // src: the drawn page (canvas or picture), W x H in page units
  try {
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const f = Math.min(1, 1000 / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * f)), h = Math.max(1, Math.round(sh * f));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g2 = c.getContext('2d'); g2.fillStyle = '#fff'; g2.fillRect(0, 0, w, h); g2.drawImage(src, 0, 0, w, h);
    const d = g2.getImageData(0, 0, w, h).data, I = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        row += 1 - (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
        I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row;
      }
    }
    const kx = w / W, ky = h / H;
    return (r) => { // how dark the plan is under a box, 0 (blank) to 1 (solid black)
      const x0 = Math.max(0, Math.min(w, Math.round(r.x0 * kx))), x1 = Math.max(0, Math.min(w, Math.round(r.x1 * kx)));
      const y0 = Math.max(0, Math.min(h, Math.round(r.y0 * ky))), y1 = Math.max(0, Math.min(h, Math.round(r.y1 * ky)));
      const a = (x1 - x0) * (y1 - y0); if (a <= 0) return 0;
      const W1 = w + 1; return (I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0]) / a;
    };
  } catch (e) { return () => 0; }
}
const rectsHit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const grow = (r, p) => ({ x0: r.x0 - p, y0: r.y0 - p, x1: r.x1 + p, y1: r.y1 + p });
function segsCross(p1, p2, p3, p4) {
  const d = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function segHitsRect(a, b, r) {
  if (Math.max(a.x, b.x) < r.x0 || Math.min(a.x, b.x) > r.x1 || Math.max(a.y, b.y) < r.y0 || Math.min(a.y, b.y) > r.y1) return false;
  const inside = (p) => p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1;
  if (inside(a) || inside(b)) return true;
  const c = [{ x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }, { x: r.x0, y: r.y1 }];
  for (let i = 0; i < 4; i++) if (segsCross(a, b, c[i], c[(i + 1) % 4])) return true;
  return false;
}
function tidy(ms, { W: PW, H: PH, dark = () => 0 }) { // moves the labels in ms; PW x PH = page size
  // 1. same size: the middle size of the labels on this page, and one box size that fits the longest ID
  const ss = ms.map((m) => m.s).sort((a, b) => a - b), s = ss[Math.floor(ss.length / 2)];
  for (const st of ['line', 'circle']) {
    const grp = ms.filter((m) => (m.style === 'line' ? 'line' : 'circle') === st); if (!grp.length) continue;
    let W = 0, H = 0;
    for (const m of grp) { m.s = s; delete m.fw; delete m.fh; const L = layout(m); W = Math.max(W, L.w); H = Math.max(H, L.h); }
    for (const m of grp) { m.fw = W; m.fh = H; }
  }
  // 2. place the boxes, the most crowded spots first so they get the closest places
  const info = ms.map((m) => { const L = layout(m); return { m, L, spot: { x0: m.x - L.rx, y0: m.y - L.ry, x1: m.x + L.rx, y1: m.y + L.ry } }; });
  const near = (a) => info.filter((b) => b !== a && Math.hypot(a.m.x - b.m.x, a.m.y - b.m.y) < 4 * a.L.w).length;
  info.forEach((a) => { a.crowd = near(a); });
  const order = info.slice().sort((a, b) => b.crowd - a.crowd || a.m.y - b.m.y || a.m.x - b.m.x);
  const placed = []; // { box, a (line start), p (spot) }
  const DIRS = 16;
  for (const it of order) {
    const { m, L } = it, W = L.w, H = L.h, gap = Math.max(H * 0.25, 6 * m.s);
    let best = null;
    for (let ring = 0; ring < 14; ring++) {
      const d = L.ry + H * 0.6 + ring * H * 0.55;
      for (let k = 0; k < DIRS; k++) {
        const ang = (k / DIRS) * Math.PI * 2 - Math.PI / 2, cx = m.x + Math.cos(ang) * (W / 2 + d), cy = m.y + Math.sin(ang) * (H / 2 + d);
        const box = { x0: cx - W / 2, y0: cy - H / 2, x1: cx + W / 2, y1: cy + H / 2 };
        if (box.x0 < 2 * m.s || box.y0 < 2 * m.s || box.x1 > PW - 2 * m.s || box.y1 > PH - 2 * m.s) continue;
        let score = d;
        const gb = grow(box, gap);
        for (const o of placed) if (rectsHit(gb, o.box)) score += 1e6;
        for (const o of info) if (rectsHit(gb, o.spot)) score += 1e6;
        if (score >= 1e6 && best && best.score < 1e6) continue;
        m.bx = box.x0; m.by = box.y0; const a = leader(m, L).a, p = { x: m.x, y: m.y };
        for (const o of placed) {
          if (segsCross(a, p, o.a, o.p)) score += H * 2.5;
          if (segHitsRect(a, p, grow(o.box, 2 * m.s))) score += 1e5;
          if (segHitsRect(o.a, o.p, grow(box, 2 * m.s))) score += 1e5;
        }
        for (const o of info) if (o !== it && segHitsRect(a, p, o.spot)) score += H * 3;
        score += dark(box) * H * 30;
        if (!best || score < best.score) best = { score, box, a, p };
      }
      if (best && best.score < 1e5 && ring >= 2) break; // good enough, stay close
    }
    if (best) { m.bx = best.box.x0; m.by = best.box.y0; placed.push({ box: best.box, a: best.a, p: best.p }); }
    else placed.push({ box: { x0: m.bx, y0: m.by, x1: m.bx + W, y1: m.by + H }, a: leader(m, L).a, p: { x: m.x, y: m.y } });
  }
}

function markedPages(P) { return Object.keys(P || {}).map(Number).filter((n) => P[n] && P[n].length).sort((a, b) => a - b); }
function markBox(m) { const L = layout(m), p = 8 * m.s; return { x0: Math.min(m.bx, m.x - L.rx) - p, y0: Math.min(m.by, m.y - L.ry) - p, x1: Math.max(m.bx + L.w, m.x + L.rx) + p, y1: Math.max(m.by + L.h, m.y + L.ry) + p }; }
// Puts the marks on top of the original PDF pages, so the plan stays as sharp as the original.
async function stampPdf(PL, bytes, pdfDoc, pages, mode) { // PL: pdf-lib; pdfDoc: the same PDF opened in pdf.js; pages: { pageNo: marks }; mode 'marked' | 'full'
  const P = pages;
  const src = await PL.PDFDocument.load(bytes, { ignoreEncryption: true });
  if (src.isEncrypted) throw new Error('locked');
  const nums = markedPages(P); let out = src, list;
  if (mode === 'marked') {
    out = await PL.PDFDocument.create();
    const cp = await out.copyPages(src, nums.map((n) => n - 1)); cp.forEach((p) => out.addPage(p));
    list = nums.map((n, i) => [n, out.getPage(i)]);
  } else list = nums.map((n) => [n, src.getPage(n - 1)]);
  for (const [n, pg] of list) {
    const pj = await pdfDoc.getPage(n), t = pj.getViewport({ scale: 1 }).transform;
    const det = t[0] * t[3] - t[1] * t[2];
    const inv = [t[3] / det, -t[1] / det, -t[2] / det, t[0] / det, (t[2] * t[5] - t[3] * t[4]) / det, (t[1] * t[4] - t[0] * t[5]) / det];
    for (const m of P[n]) {
      const B = markBox(m), bw = B.x1 - B.x0, bh = B.y1 - B.y0, q = Math.min(16, 1000 / Math.max(bw, bh));
      const c = document.createElement('canvas'); c.width = Math.ceil(bw * q); c.height = Math.ceil(bh * q);
      const g2 = c.getContext('2d'); g2.setTransform(q, 0, 0, q, -B.x0 * q, -B.y0 * q); drawMark(g2, m, false);
      const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
      const img = await out.embedPng(await blob.arrayBuffer());
      const name = pg.node.newXObject('Mk', img.ref);
      pg.pushOperators(PL.pushGraphicsState(), PL.concatTransformationMatrix(inv[0], inv[1], inv[2], inv[3], inv[4], inv[5]),
        PL.concatTransformationMatrix(bw, 0, 0, -bh, B.x0, B.y0 + bh), PL.drawObject(name), PL.popGraphicsState());
    }
  }
  return new Blob([await out.save()], { type: 'application/pdf' });
}

window.MarkupEngine = { COLORS, INKS, RED, FONT, fillOf, inkOf, layout, leader, drawMark, hit, bump, darkness, tidy, markedPages, markBox, stampPdf };
})();
