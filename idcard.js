// Member ID card (85.6 × 54 mm, credit-card size). ONE layout list drives both the on-screen card and the PDF,
// so what you see is exactly what prints. Coordinates are millimetres; text y is the baseline (like the PDF).
import { sb, h, ageText } from './core.js';
import { REL_LABELS } from './options.js';
import { brand, logoUrl } from './brand.js';
import { photoUrl } from './photo.js';
import { loadPdfLibs, qrPng } from './pdf.js';
import { THEMES, getCfg } from './letterhead.js';

export const CW = 85.6, CH = 54;
const DG = [13, 50, 30], GO = [180, 140, 40], CR = [250, 248, 238], GREY = [100, 100, 100], INK = [20, 20, 20];
const rgb = c => `rgb(${c.join(',')})`;
export const dataUrl = async u => { const r = await fetch(u); const b = await r.blob(); return new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); };
const mobOf = m => { const c = m && m.member_contacts; return (Array.isArray(c) ? c[0] : c)?.mobile || ''; };

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const one = (split, s, size, bold, w) => { const l = split(String(s || '—'), size, bold, w); return l.length > 1 ? l[0].replace(/\s+\S*$/, '').slice(0, -1) + '…' : l[0] || '—'; };

// Elegant card shell shared by Member, Staff and Agent cards: gradient header, gold rule, framed photo, code pill, themed footer.
// p = { logo, photo, initials, title, code, footer }; returns { S, T, th } so the caller adds the details.
export function cardShell(p, split) {
  const th = THEMES[getCfg().theme] || THEMES.emerald, B = brand.data || {}, S = [], T = (x, y, s, o = {}) => S.push({ k: 't', x, y, s, size: o.size || 7, bold: !!o.bold, italic: !!o.italic, color: o.color || INK, align: o.align || 'left' });
  const R = (x, y, w, h2, o = {}) => S.push({ k: 'r', x, y, w, h: h2, ...o });
  R(0, 0, CW, CH, { fill: th.cr });
  S.push({ k: 'c', x: 72, y: 46, r: 30, fill: mix(th.cr, th.lt, .09) }); S.push({ k: 'c', x: 72, y: 46, r: 19, fill: mix(th.cr, th.lt, .14) });   // soft watermark rings
  const N = 28; for (let i = 0; i < N; i++) R(CW * i / N, 0, CW / N + .25, 13, { fill: mix(th.dg, th.lt, i / (N - 1) * .85) });
  R(0, 13, CW, .8, { fill: th.go }); R(0, 13.8, CW, .35, { fill: [255, 255, 255] });
  R(0, 14.2, 2.2, CH - 14.2, { fill: th.go });
  const cx = p.logo ? 50 : CW / 2;
  if (p.logo) { S.push({ k: 'c', x: 8.6, y: 6.6, r: 5.2, fill: th.go }); S.push({ k: 'c', x: 8.6, y: 6.6, r: 4.6, fill: [255, 255, 255] }); S.push({ k: 'i', x: 4.5, y: 2.5, w: 8.2, h: 8.2, src: p.logo }); }
  const org = split(B.header_line1 || B.name || 'CHHIPA JAMAT BARAR WELFARE SOCIETY', 6.6, true, p.logo ? 64 : 76).slice(0, 2);
  org.forEach((ln, i) => T(cx, (org.length > 1 ? 4.4 : 5.4) + i * 3, ln, { size: 6.6, bold: true, color: [255, 255, 255], align: 'center' }));
  T(cx, 10.6, p.title, { size: 5, bold: true, color: mix(th.go, [255, 255, 255], .55), align: 'center' });
  // framed photo
  R(5.2, 16.6, 23.6, 28.6, { fill: [255, 255, 255], stroke: th.go, lw: .5, round: 1 });
  R(6.3, 17.7, 21.4, 26.4, { fill: mix(th.cr, th.lt, .2) });
  if (p.photo) S.push({ k: 'i', x: 6.3, y: 17.7, w: 21.4, h: 26.4, src: p.photo }); else T(17, 33.6, p.initials || '', { size: 14, bold: true, color: th.dg, align: 'center' });
  R(5.2, 46.2, 23.6, 4.6, { fill: th.dg, round: 2.3 }); T(17, 49.4, p.code || '—', { size: 6.4, bold: true, color: [255, 255, 255], align: 'center' });
  // footer band
  R(0, 51.4, CW, 2.6, { fill: th.dg }); R(0, 51.2, CW, .3, { fill: th.go });
  if (p.footer) T(CW / 2 + 1, 53.3, p.footer, { size: 3.9, color: [225, 240, 228], align: 'center' });
  R(.25, .25, CW - .5, CH - .5, { stroke: th.go, lw: .5 });
  return { S, T, R, th };
}
// label + value rows (label grey, value bold) down the details column
export function detailRows(T, split, rows, x0, y0, step, vx, vw, th) {
  rows.filter(r => r[1]).forEach((r, i) => { const y = y0 + i * step; T(x0, y, r[0], { size: 4.6, bold: true, color: th.dg }); T(vx, y, one(split, r[1], 6.3, true, vw), { size: 6.3, bold: true }); });
}

// split(text, size, bold, maxW) -> lines  (measured with jsPDF so screen and PDF break lines identically)
export function idSpec(p, split) {
  const sh = cardShell({ logo: p.logo, photo: p.photo, initials: p.initials, title: 'MEMBER IDENTITY CARD', code: p.mcode, footer: (p.city ? p.city + '  ·  ' : '') + 'Valid while membership is active' }, split), { S, T, R, th } = sh;
  const nm = split(p.name, 8.6, true, 50);
  const two = nm.length > 1, nl = two ? split(p.name, 7.4, true, 50).slice(0, 2) : nm;
  nl.forEach((ln, i) => T(32, 19.8 + i * 3.7, ln, { size: two ? 7.4 : 8.8, bold: true, color: th.dg }));
  const ny = 19.8 + (nl.length - 1) * 3.7;
  R(32, ny + 1.5, 50, .35, { fill: th.go });
  const rl = p.relToHead === 'Head of Family' ? 'Head of Family' : p.relToHead ? p.relToHead + ' of Head' : p.rel;
  detailRows(T, split, [['FAMILY ID', p.fcode], ['RELATION', rl], ['HEAD', p.headName], ['SEX · AGE', [p.gender, p.age].filter(Boolean).join(' · ')], ['BLOOD', p.blood], ['MOBILE', p.mobile]], 32, ny + 6, 3.9, 44, 20, th);
  R(63.6, 28.2, 18.8, 18.8, { fill: [255, 255, 255], stroke: th.go, lw: .4, round: 1.4 }); S.push({ k: 'i', x: 64.8, y: 29.4, w: 16.4, h: 16.4, src: p.qr });
  T(73, 49.4, 'SCAN TO VERIFY', { size: 3.6, bold: true, color: th.dg, align: 'center' });
  return S;
}

export function drawPdf(doc, S, ox = 0, oy = 0) {
  for (const e of S) {
    if (e.k === 'r') { if (e.fill) doc.setFillColor(...e.fill); if (e.stroke) { doc.setDrawColor(...e.stroke); doc.setLineWidth(e.lw || .3); }
      const m = e.fill && e.stroke ? 'FD' : e.fill ? 'F' : 'S'; e.round ? doc.roundedRect(ox + e.x, oy + e.y, e.w, e.h, e.round, e.round, m) : doc.rect(ox + e.x, oy + e.y, e.w, e.h, m); }
    else if (e.k === 'c') { doc.setFillColor(...e.fill); if (e.stroke) { doc.setDrawColor(...e.stroke); doc.setLineWidth(e.lw || .3); } doc.circle(ox + e.x, oy + e.y, e.r, e.stroke ? 'FD' : 'F'); }
    else if (e.k === 'i') { try { doc.addImage(e.src, e.src.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', ox + e.x, oy + e.y, e.w, e.h, undefined, 'FAST'); } catch {} }
    else if (e.k === 't') { doc.setFont('helvetica', e.bold && e.italic ? 'bolditalic' : e.bold ? 'bold' : e.italic ? 'italic' : 'normal'); doc.setFontSize(e.size); doc.setTextColor(...e.color); doc.text(e.s, ox + e.x, oy + e.y, { align: e.align }); }
  }
}

export function toHtml(S, W = CW, H = CH) {
  const el = h('div', { class: 'idc', style: `width:${W}mm;height:${H}mm` });
  for (const e of S) {
    let n;
    if (e.k === 'r') { const lw = e.stroke ? (e.lw || .3) : 0, o = lw / 2; n = h('div', { class: 'ide', style: `left:${e.x - o}mm;top:${e.y - o}mm;width:${e.w + lw}mm;height:${e.h + lw}mm;box-sizing:border-box;${e.fill ? 'background:' + rgb(e.fill) + ';' : ''}${e.stroke ? `border:${lw}mm solid ${rgb(e.stroke)};` : ''}${e.round ? `border-radius:${e.round + o}mm;` : ''}` }); }
    else if (e.k === 'c') { const lw = e.stroke ? (e.lw || .3) : 0, o = e.r + lw / 2; n = h('div', { class: 'ide', style: `left:${e.x - o}mm;top:${e.y - o}mm;width:${o * 2}mm;height:${o * 2}mm;box-sizing:border-box;border-radius:50%;background:${rgb(e.fill)};${e.stroke ? `border:${lw}mm solid ${rgb(e.stroke)};` : ''}` }); }
    else if (e.k === 'i') n = h('img', { class: 'ide', src: e.src, alt: '', style: `left:${e.x}mm;top:${e.y}mm;width:${e.w}mm;height:${e.h}mm;object-fit:fill` });
    else { const tx = e.align === 'center' ? '-50%' : e.align === 'right' ? '-100%' : '0'; n = h('div', { class: 'ide idt', style: `left:${e.x}mm;top:${e.y}mm;font-size:${e.size}pt;font-weight:${e.bold ? 700 : 400};font-style:${e.italic ? 'italic' : 'normal'};color:${rgb(e.color)};transform:translate(${tx},-.846em)` }, e.s); }
    el.append(n);
  }
  return el;
}

// Gather everything one card needs (photo/logo/QR as embedded images)
export async function cardParts(m, rel, fam, withPhoto = true, headName = '') {
  const B = brand.data || {}; let logo = null, photo = null;
  const lg = logoUrl(B.logo_path); if (lg) { try { logo = await dataUrl(lg); } catch {} }
  if (withPhoto && m.photo_path) { try { const u = await photoUrl(m.photo_path); if (u) photo = await dataUrl(u); } catch {} }
  if (withPhoto && !photo && m.photo_pending) photo = m.photo_pending;   // photo sent with the self-registration form, not yet saved
  return { logo, photo, qr: qrPng('CJBWS|MEMBER|' + (m.member_code || '') + '|ID:' + (fam.family_code || '')), initials: m.full_name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(), name: m.full_name, mcode: m.member_code, fcode: fam.family_code,
    rel: REL_LABELS[rel] || rel, relToHead: rel === 'head' ? 'Head of Family' : (REL_LABELS[rel] || rel), headName: headName || (rel === 'head' ? m.full_name : ''), gender: m.gender ? m.gender[0].toUpperCase() + m.gender.slice(1) : '', age: m.dob || m.birth_year_est ? ageText(m).replace('~', '') : '', city: fam.locations && fam.locations.city, mobile: mobOf(m), blood: m.blood_group || '' };
}
export async function measurer() { await loadPdfLibs(); const doc = new window.jspdf.jsPDF({ unit: 'mm', format: [CW, CH], orientation: 'landscape' }); return { doc, split: (t, size, bold, w) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); return doc.splitTextToSize(t, w); },
    fit: (t, size, bold, w) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); t = String(t); if (doc.getTextWidth(t) <= w) return t; while (t.length > 1 && doc.getTextWidth(t + '…') > w) t = t.slice(0, -1); return t + '…'; } }; }

export async function renderClassic(main, id) {
  const { data, error } = await sb.from('members').select('id,member_code,full_name,photo_path,photo_pending,status,gender,dob,birth_year_est,blood_group, member_contacts(mobile), family_memberships(relation,is_active, families(id,family_code,locations(city)))').eq('id', id).maybeSingle();
  if (error) throw error; if (!data) return main.append(h('p', { class: 'err' }, 'Member not found, or you do not have access.'));
  const fm = (data.family_memberships || []).find(x => x.is_active && x.families) || (data.family_memberships || [])[0]; if (!fm) return main.append(h('p', { class: 'err' }, 'This member is not in a family yet.'));
  const withPh = h('input', { type: 'checkbox', checked: true }), holder = h('div', { class: 'idc-wrap' }), note = h('p', { class: 'muted s noprint' }, 'Credit-card size (85.6 × 54 mm). The screen card and the PDF use the same layout.');
  const hq = await sb.from('family_memberships').select('members(full_name)').eq('family_id', fm.families.id).eq('relation', 'head').eq('is_active', true).maybeSingle(), headName = (hq.data && hq.data.members && hq.data.members.full_name) || '';
  let S; const { doc, split } = await measurer();
  const build = async () => { S = idSpec(await cardParts(data, fm.relation, fm.families, withPh.checked, headName), split); const card = toHtml(S); holder.replaceChildren(card); fit(); };
  const fit = () => { const c = holder.firstChild; if (!c) return; const px = 85.6 * 96 / 25.4, s = Math.min(3, ((main.clientWidth || innerWidth) - 8) / px); c.style.transform = 'scale(' + s + ')'; holder.style.height = (54 * 96 / 25.4 * s) + 'px'; };
  const pdf = async () => { const d = new window.jspdf.jsPDF({ unit: 'mm', format: [CW, CH], orientation: 'landscape' }); drawPdf(d, S); d.save('id-' + (data.member_code || 'card') + '.pdf'); };
  main.append(h('div', { class: 'backlink noprint' }, h('a', { href: '#family/' + fm.families.id }, '← Family')), h('h2', { class: 'noprint' }, 'ID Card · ' + data.full_name), holder, note,
    h('div', { class: 'card noprint' }, h('label', { class: 'chk' }, withPh, ' Show photo'), h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => window.print() }, '🖨 Print'), h('button', { class: 'btn', onclick: pdf }, '⬇ Save PDF'))),
    h('style', {}, '@page{size:85.6mm 54mm;margin:0}'));
  withPh.addEventListener('change', build); addEventListener('resize', fit); await build(); setTimeout(fit, 120);
}

// Framed print format: society header, State/Location admin details, the ID card, footer
export async function render(main, id) {
  main.append(h('p', { class: 'muted ld', style: 'text-align:center;padding:40px 10px' }, 'Preparing the card…'));
  const { data, error } = await sb.from('members').select('id,member_code,full_name,photo_path,photo_pending,status,gender,dob,birth_year_est,blood_group, member_contacts(mobile), family_memberships(relation,is_active, families(id,family_code,location_id,locations(city)))').eq('id', id).maybeSingle();
  if (error) throw error; if (!data) return main.append(h('p', { class: 'err' }, 'Member not found, or you do not have access.'));
  const fm = (data.family_memberships || []).find(x => x.is_active && x.families) || (data.family_memberships || [])[0]; if (!fm) return main.append(h('p', { class: 'err' }, 'This member is not in a family yet.'));
  const hq = await sb.from('family_memberships').select('members(full_name)').eq('family_id', fm.families.id).eq('relation', 'head').eq('is_active', true).maybeSingle(), headName = (hq.data && hq.data.members && hq.data.members.full_name) || '';
  const { officersFor } = await import('./officers.js'), { cardPageView } = await import('./cardframe.js'), officers = await officersFor(fm.families.location_id);
  const withPh = h('input', { type: 'checkbox', checked: true }); let v;
  v = await cardPageView(main, { heading: 'ID Card · ' + data.full_name, backHref: '#family/' + fm.families.id, backText: '← Family', officers, title: 'MEMBER ID CARD', fileName: 'id-' + (data.member_code || 'card'), logWhat: 'ID card ' + (data.member_code || data.full_name),
    build: async m => idSpec(await cardParts(data, fm.relation, fm.families, withPh.checked, headName), m.split), note: ['Present this card with a valid photo ID.', 'Issued by the society; valid while membership is active.'],
    extra: h('label', { class: 'chk' }, withPh, ' Show photo') });
  withPh.addEventListener('change', () => v.redraw());
}
