// Family Card (A4 landscape, 297 × 210 mm). ONE layout list drives both the on-screen card and the PDF,
// exactly like the ID card, so View & Print always equals the saved PDF. Coordinates are millimetres; text y is the baseline.
import { REL_LABELS } from './options.js';
import { brand, logoUrl } from './brand.js';
import { photoUrl } from './photo.js';
import { qrPng } from './pdf.js';
import { THEMES, getCfg } from './letterhead.js';
import { dataUrl } from './idcard.js';
import { sb, isStateOrSuper } from './core.js';

export const FW = 297, FH = 210;
const DG = [13, 50, 30], GO = [180, 140, 40], CR = [250, 248, 238], WH = [255, 255, 255], INK = [20, 20, 20], GREY = [100, 100, 100];
const REL_PDF = { head: 'Khud (Self)', spouse: 'Patni / Pati (Spouse)', son: 'Beta (Son)', daughter: 'Beti (Daughter)', 'daughter-in-law': 'Bahu (Daughter-in-law)', 'son-in-law': 'Damad (Son-in-law)',
  grandson: 'Pota (Grandson)', granddaughter: 'Poti (Granddaughter)', father: 'Walid (Father)', mother: 'Walida (Mother)', brother: 'Bhai (Brother)', sister: 'Behen (Sister)' };
const COLS = [['S/N', 12, 'c'], ['Name', 62, 'l'], ['Age', 12, 'c'], ['Gender', 18, 'c'], ['Relation', 44, 'l'], ['Education', 34, 'l'], ['Occupation', 38, 'l'], ['Marital', 28, 'l'], ['Mobile', 41, 'l']]; // = 289 = W-8
const HEAD_H = 8, ROW_H = 7.2, T1 = 89, T2 = 9, BOTTOM = FH - 11;
const mobOf = m => { const c = m && m.member_contacts; return (Array.isArray(c) ? c[0] : c)?.mobile || ''; };

// Dues for the printed card: only when a State Admin / Super Admin ticked the box on the family page
export async function duesFor(fam) {
  try { if (!isStateOrSuper() || sessionStorage.getItem('chhipa_dues_' + fam.id) !== '1') return null;
    const { data, error } = await sb.rpc('family_dues', { p_family: fam.id }); if (error || !data || !data.years.length) return null; const y = data.years[0]; return { fy: y.fy, paid: y.paid, due: y.due }; } catch { return null; }
}
export async function famParts(fam, rows, dues = null) {
  const B = brand.data || {}, head = rows.find(r => r.relation === 'head'), hm = head && head.members; let logo = null, photo = null, stamp = null;
  const lg = logoUrl(B.logo_path); if (lg) { try { logo = await dataUrl(lg); } catch {} }
  if (hm && hm.photo_path) { try { const u = await photoUrl(hm.photo_path); if (u) photo = await dataUrl(u); } catch {} }
  try { stamp = await dataUrl('stamp.png'); } catch {}
  const code = fam.family_code || 'PENDING';
  return { logo, photo, stamp, hm, code, dues, qr: qrPng('CJBWS|' + (hm ? hm.full_name : '') + '|ID:' + code), initials: (hm ? hm.full_name : '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() };
}

// m = { split, fit } measuring helpers (jsPDF) so lines break and truncate identically on screen and in the PDF
export function famSpec(fam, rows, P, m, ageOf) {
  const th = THEMES[getCfg().theme] || THEMES.emerald, DG = th.dg, GO = th.go, CR = th.cr, B = brand.data || {}, W = FW, H = FH, hm = P.hm, pages = [];
  const quote = (fam.quote || '').trim() || B.footer_text || 'Together We Build a Stronger Community';
  const mk = () => { const S = []; pages.push(S); return S; };
  const R = (S, x, y, w, h, o = {}) => S.push({ k: 'r', x, y, w, h, ...o });
  const L = (S, x1, y1, x2, y2, lw, color) => R(S, Math.min(x1, x2) - (y1 === y2 ? 0 : lw / 2), Math.min(y1, y2) - (x1 === x2 ? 0 : lw / 2), Math.abs(x2 - x1) + (y1 === y2 ? 0 : lw), Math.abs(y2 - y1) + (x1 === x2 ? 0 : lw), { fill: color });
  const T = (S, x, y, s, o = {}) => S.push({ k: 't', x, y, s: String(s), size: o.size || 8, bold: !!o.bold, italic: !!o.italic, color: o.color || INK, align: o.align || 'left' });
  const footer = S => { R(S, 2, H - 10, W - 4, 8, { fill: DG }); L(S, 2, H - 10, W - 2, H - 10, .3, GO); T(S, W / 2, H - 5, m.fit(quote, 10, true, W - 20), { size: 10, bold: true, italic: true, color: WH, align: 'center' }); };
  const base = (S, inner) => { R(S, 0, 0, W, H, { fill: CR }); R(S, 2, 2, W - 4, H - 4, { stroke: GO, lw: .8 }); if (inner) R(S, 4, 4, W - 8, H - 8, { stroke: GO, lw: .3 }); };
  const tableHead = (S, y) => { let x = 4; for (const [t, w] of COLS) { R(S, x, y, w, HEAD_H, { fill: DG, stroke: GO, lw: .2 }); T(S, x + w / 2, y + 5.2, t, { size: 8, bold: true, color: WH, align: 'center' }); x += w; } };

  // ---- page 1 ----
  const S = mk(); base(S, true);
  R(S, 2, 2, W - 4, 24, { fill: DG }); L(S, 2, 26, W - 2, 26, .4, GO);
  S.push({ k: 'c', x: 18, y: 14, r: 8, fill: WH, stroke: GO, lw: .4 });
  if (P.logo) S.push({ k: 'i', x: 10.5, y: 6.5, w: 15, h: 15, src: P.logo });
  else { T(S, 18, 11, 'ESTD.', { size: 5, bold: true, color: DG, align: 'center' }); T(S, 18, 15.5, B.estd || '2016', { size: 5, bold: true, color: DG, align: 'center' }); }
  T(S, W / 2, 13, m.fit(B.header_line1 || 'CHHIPA JAMAT BARAR WELFARE SOCIETY', 14, true, 215), { size: 14, bold: true, color: WH, align: 'center' });
  T(S, W / 2, 20, m.fit(B.header_line2 || 'Chandur Bazar, Maharashtra  -  All India', 7, false, 215), { size: 7, color: [200, 225, 200], align: 'center' });
  R(S, W - 30, 4, 20, 20, { fill: WH, stroke: GO, lw: .4, round: 1.5 }); S.push({ k: 'i', x: W - 28.5, y: 5.5, w: 17, h: 17, src: P.qr });
  R(S, 2, 26, W - 4, 9, { fill: DG }); L(S, 2, 35.6, W - 2, 35.6, .5, th.lt); L(S, 2, 26, W - 2, 26, .5, GO); L(S, 2, 35, W - 2, 35, .5, GO);
  T(S, W / 2, 32, 'FAMILY CARD', { size: 13, bold: true, color: WH, align: 'center' });
  R(S, 2, 35, W - 4, 42, { fill: WH, stroke: GO, lw: .3 });
  R(S, 5, 38, 30, 36, { fill: [220, 240, 230], stroke: GO, lw: .5 });
  if (P.photo) S.push({ k: 'i', x: 5, y: 38, w: 30, h: 36, src: P.photo }); else T(S, 20, 58, P.initials, { size: 14, bold: true, color: DG, align: 'center' });
  const nl = m.split(hm ? hm.full_name : '—', 11, true, 88).slice(0, 2); nl.forEach((ln, i) => T(S, 39, 43 + i * 5, ln, { size: 11, bold: true }));
  const ny = 43 + (nl.length - 1) * 5, lab = (t, x, y) => T(S, x, y, t, { size: 6.5, color: GREY }), val = (t, x, y, sz = 9) => T(S, x, y, t, { size: sz, bold: true });
  lab('Family ID', 39, ny + 6); val(P.code, 39, ny + 11); lab('Address', 39, ny + 17);
  m.split(fam.address || '—', 7.5, false, 88).slice(0, 2).forEach((ln, i) => T(S, 39, ny + 22 + i * 3.2, ln, { size: 7.5, color: [30, 30, 30] }));
  L(S, 133, 37, 133, 75, .25, [220, 215, 200]); L(S, 220, 37, 220, 75, .25, [220, 215, 200]);
  const mob = mobOf(hm) || fam.phone || '—';
  lab('Mobile (Head of Family)', 137, 43); val(mob, 137, 50, 11); lab('City / Taluka / State', 137, 59);
  val(m.fit([fam.locations.city, fam.taluka, fam.locations.state].filter(Boolean).join(' / ') || '—', 9, true, 80), 137, 65);
  lab('Gotra', 224, 43); val(m.fit(fam.gotra || '—', 11, true, 36), 224, 50, 11); lab('Family Type', 224, 59); val(m.fit(fam.family_type || '—', 10, true, 36), 224, 65, 10);
  if (P.stamp) S.push({ k: 'i', x: W - 38, y: 47, w: 26, h: 25, src: P.stamp });
  R(S, W / 2 - 32, 79, 64, 8, { fill: DG, stroke: GO, lw: .4, round: 2 });
  T(S, W / 2, 84.5, 'MEMBERS (' + rows.length + ')', { size: 10, bold: true, color: WH, align: 'center' });
  if (P.dues) { R(S, 186, 79, 105, 8, { fill: [255, 244, 214], stroke: GO, lw: .4, round: 2 }); T(S, 238.5, 84.4, 'Annual donation ' + P.dues.fy + ':  Paid Rs. ' + Math.round(P.dues.paid) + '   |   Due Rs. ' + Math.round(P.dues.due), { size: 8, bold: true, color: DG, align: 'center' }); }

  // ---- members table (fixed row height, so every page lines up) ----
  const d = v => v || '—', cell = r => { const mm = r.members; return [d(''), d(mm.full_name), d(String(ageOf(mm)).replace(' yrs', '').replace('~', '')), d((mm.gender || '').replace(/^./, s => s.toUpperCase())), REL_PDF[r.relation] || REL_LABELS[r.relation] || r.relation, d(mm.education), d(mm.occupation), d(mm.marital_status), d(mobOf(mm))]; };
  let cur = S, y = T1, first = true; tableHead(cur, y); y += HEAD_H;
  rows.forEach((r, i) => {
    if (y + ROW_H > BOTTOM) { footer(cur); cur = mk(); base(cur, false); y = T2; tableHead(cur, y); y += HEAD_H; first = false; }
    const vals = cell(r); vals[0] = String(i + 1); let x = 4;
    COLS.forEach(([, w, al], c) => { R(cur, x, y, w, ROW_H, { fill: i % 2 ? th.soft : WH, stroke: GO, lw: .2 });
      T(cur, al === 'c' ? x + w / 2 : x + 2, y + 4.7, m.fit(vals[c], 8, true, w - 4), { size: 8, bold: true, color: [10, 10, 10], align: al === 'c' ? 'center' : 'left' }); x += w; });
    y += ROW_H;
  });
  footer(cur);
  return pages;
}
