// Print format for every card (family, member, family-member, agent / office-bearer):
//   1. society header   2. State Admin + Location Admin details (ID no., phone, area)   3. the card   4. footer
// One element list drives both the on-screen page and the PDF (same primitives as idcard.js).
import { h, toast, friendly, logAct } from './core.js';
import { THEMES, getCfg, prep, today } from './letterhead.js';
import { measurer, toHtml, drawPdf, CW, CH } from './idcard.js';
import { nameLine, officerLine } from './officers.js';

const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
export function scaleSpec(S, k, ox, oy) {
  return S.map(e => { const n = { ...e, x: ox + e.x * k, y: oy + e.y * k };
    if (e.w != null) n.w = e.w * k; if (e.h != null) n.h = e.h * k; if (e.r != null) n.r = e.r * k; if (e.lw != null) n.lw = e.lw * k; if (e.round != null) n.round = e.round * k; if (e.size != null) n.size = e.size * k; return n; });
}

// A4 portrait page: header, office bearers, card (scaled), note, footer
export function framedPage(cardS, { L, officers, title, m, k = 1.9, cw = CW, ch = CH, note }) {
  const W = 210, H = 297, th = L.th, S = [], R = (x, y, w, h2, o = {}) => S.push({ k: 'r', x, y, w, h: h2, ...o }), T = (x, y, s, o = {}) => S.push({ k: 't', x, y, s: String(s), size: o.size || 8, bold: !!o.bold, italic: !!o.italic, color: o.color || [20, 20, 20], align: o.align || 'left' });
  R(0, 0, W, H, { fill: th.cr });
  const N = 42; for (let i = 0; i < N; i++) R(W * i / N, 0, W / N + .3, 32, { fill: lerp(th.dg, th.lt, i / (N - 1)) });
  R(0, 32, W, 1.4, { fill: th.go }); R(0, 33.4, W, .7, { fill: th.lt });
  const cx = L.img ? 122 : W / 2, cwid = L.img ? 156 : 190;
  if (L.img) { S.push({ k: 'c', x: 18, y: 16, r: 10.4, fill: th.go }); S.push({ k: 'c', x: 18, y: 16, r: 9.4, fill: [255, 255, 255] }); S.push({ k: 'i', x: 10.2, y: 8.2, w: 15.6, h: 15.6, src: L.img }); }
  T(cx - (L.img ? 0 : 0), 13.2, m.fit(L.name, 16, true, cwid), { size: 16, bold: true, color: [255, 255, 255], align: 'center' });
  if (L.tag) T(cx, 19.8, m.fit(L.tag, 9, false, cwid), { size: 9, color: [255, 245, 200], align: 'center' });
  if (L.details) T(cx, 27.4, m.fit(L.details, 7.8, false, cwid), { size: 7.8, color: [255, 255, 255], align: 'center' });
  // office bearers
  const st = officers.filter(o => o.level === 'state_admin'), la = officers.filter(o => o.level !== 'state_admin'), rows = Math.max(1, Math.min(3, Math.max(st.length, la.length))), oh = 12 + rows * 8.8, oy = 39;
  R(8, oy, W - 16, oh, { fill: th.soft, stroke: th.go, lw: .4, round: 2 });
  T(W / 2, oy + 5.2, 'OFFICE BEARERS', { size: 8, bold: true, color: th.dg, align: 'center' }); R(W / 2 - .15, oy + 8, .3, oh - 10, { fill: th.go });
  [['STATE ADMIN', st, 12], ['LOCATION ADMIN', la, W / 2 + 4]].forEach(([lab, list, x]) => {
    T(x, oy + 10.2, lab, { size: 7, bold: true, color: th.dg });
    if (!list.length) T(x, oy + 15.6, '— not assigned —', { size: 7.4, color: [120, 120, 120] });
    list.slice(0, rows).forEach((o, i) => { const y = oy + 15.4 + i * 8.8; T(x, y, m.fit(nameLine(o), 8.4, true, W / 2 - 18), { size: 8.4, bold: true }); T(x, y + 3.9, m.fit(officerLine(o), 7.2, false, W / 2 - 18), { size: 7.2, color: [90, 90, 90] }); });
    if (list.length > rows) T(x + W / 2 - 22, oy + oh - 2.2, '+' + (list.length - rows) + ' more', { size: 6.6, color: [120, 120, 120], align: 'right' });
  });
  // title + card
  const py = oy + oh + 7; R(W / 2 - 42, py, 84, 9, { fill: th.dg, stroke: th.go, lw: .5, round: 4.5 }); T(W / 2, py + 6.1, title, { size: 11, bold: true, color: [255, 255, 255], align: 'center' });
  const ox = (W - cw * k) / 2, cy = py + 17;
  R(ox + 1.6, cy + 1.6, cw * k, ch * k, { fill: [215, 210, 195] });
  S.push(...scaleSpec(cardS, k, ox, cy));
  const ny = cy + ch * k + 10; if (note) note.forEach((ln, i) => T(W / 2, ny + i * 5, ln, { size: 8.4, color: [80, 80, 80], align: 'center' }));
  // footer
  for (let i = 0; i < N; i++) R(W * i / N, H - 12, W / N + .3, 12, { fill: lerp(th.lt, th.dg, i / (N - 1)) });
  R(0, H - 12, W, .8, { fill: th.go });
  const ft = L.cfg.footer || L.B.footer_text || ''; if (ft) T(W / 2, H - 5, m.fit(ft, 10, true, W - 80), { size: 10, bold: true, italic: true, color: [255, 255, 255], align: 'center' });
  T(8, H - 4.8, 'Printed ' + today(), { size: 7, color: [255, 255, 255] });
  R(2, 2, W - 4, H - 4, { stroke: th.go, lw: .8 });
  return S;
}

// Shared screen: format switch (full page / card only), preview, Print, Save PDF, WhatsApp-free
export async function cardPageView(main, { heading, backHref, backText, build, officers, title, fileName, logWhat, note, extra }) {
  const m = await measurer(), L = await prep(getCfg());
  const holder = h('div', { class: 'idc-wrap' }), style = h('style'), fmt = h('select', {}, h('option', { value: 'full' }, 'Full page · header + office bearers + card (A4)'), h('option', { value: 'card' }, 'Card only · credit-card size (85.6 × 54 mm)'));
  let S, W = 210, H = 297;
  const draw = async () => { const cardS = await build(m); if (fmt.value === 'card') { S = cardS; W = CW; H = CH; } else { S = framedPage(cardS, { L, officers, title, m, note }); W = 210; H = 297; }
    style.textContent = fmt.value === 'card' ? '@page{size:85.6mm 54mm;margin:0}' : '@page{size:A4 portrait;margin:0}'; holder.classList.toggle('full', fmt.value === 'full'); holder.replaceChildren(toHtml(S, W, H)); fit(); };
  const fit = () => { const c = holder.firstChild; if (!c) return; const px = W * 96 / 25.4, s = Math.min(fmt.value === 'card' ? 3 : 1.2, ((main.clientWidth || innerWidth) - 8) / px); c.style.transform = 'scale(' + s + ')'; c.style.transformOrigin = 'top center'; holder.style.height = (H * 96 / 25.4 * s) + 'px'; };
  const pdf = async () => { try { const d = new window.jspdf.jsPDF({ unit: 'mm', format: fmt.value === 'card' ? [CW, CH] : 'a4', orientation: fmt.value === 'card' ? 'landscape' : 'portrait' }); drawPdf(d, S); d.save(fileName + '.pdf'); logAct('DOWNLOAD', logWhat); } catch (e) { toast(friendly(e)); } };
  const print = () => { logAct('PRINT', logWhat); window.print(); };
  fmt.addEventListener('change', draw);
  main.append(h('div', { class: 'backlink noprint' }, h('a', { href: backHref }, backText || '← Back')), h('h2', { class: 'noprint' }, heading), holder,
    h('div', { class: 'card noprint' }, h('label', {}, 'Print format'), fmt, extra || null, h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: print }, '🖨 Print'), h('button', { class: 'btn', onclick: pdf }, '⬇ Save PDF'))), style);
  addEventListener('resize', fit); await draw(); setTimeout(fit, 120);
  return { redraw: draw };
}
