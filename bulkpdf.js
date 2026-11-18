// Old-app PDFs, rebuilt: directory, all families, detailed, citywise, ID cards, QR sheet, address stickers, attendance sheet, notice.
import { sb, ageText } from './core.js';
import { brand, logoUrl } from './brand.js';
import { photoUrl } from './photo.js';
import { loadPdfLibs, qrPng, load } from './pdf.js';
import { REL_LABELS } from './options.js';
import { idSpec, drawPdf, cardParts, measurer, CW, CH } from './idcard.js';
import { prep, headFull, headSlim, footers, bodyBottom, getCfg, today as tday } from './letterhead.js';

const DG = [13, 50, 30], GO = [180, 140, 40], CR = [250, 248, 238];
const mobOf = m => { const c = m && m.member_contacts; return (Array.isArray(c) ? c[0] : c)?.mobile || ''; };
const dataUrl = async u => { const r = await fetch(u); const b = await r.blob(); return new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); };
const today = () => new Date().toLocaleDateString('en-IN');

// ---- data: every approved family with its active members (RLS decides what the caller may see)
export async function fetchFamilies(locationId, onProgress) {
  const out = [];
  for (let from = 0; ; from += 150) {
    let q = sb.from('families').select('id,family_code,address,gotra,family_type,taluka,pincode,phone,locations(code,city), family_memberships(relation,is_active, members(id,member_code,full_name,gender,dob,birth_year_est,status,education,occupation,marital_status,blood_group,photo_path,photo_pending,removed_at, member_contacts(mobile)))')
      .eq('status', 'approved').is('removed_at', null).order('family_code').range(from, from + 149);
    if (locationId) q = q.eq('location_id', locationId);
    const { data, error } = await q; if (error) throw error;
    out.push(...data); onProgress && onProgress(out.length); if (data.length < 150) break;
  }
  return out.map(f => { const act = (f.family_memberships || []).filter(r => r.is_active && r.members && r.members.status === 'active' && !r.members.removed_at);
    const head = act.find(r => r.relation === 'head'); return { ...f, rows: act.sort((a, b) => (b.relation === 'head') - (a.relation === 'head')), head: head && head.members, hmob: (head && mobOf(head.members)) || f.phone || '' }; });
}


async function newDoc(orientation, title, sub, o, format = 'a4') {
  await loadPdfLibs(); const doc = new window.jspdf.jsPDF({ orientation, unit: 'mm', format }), L = await prep(o && o.cfg ? o.cfg : getCfg());
  const y = headFull(doc, L, title, sub); return { doc, L, y, W: doc.internal.pageSize.getWidth(), H: doc.internal.pageSize.getHeight(), title };
}
const nextPage = (doc, L, title) => { doc.addPage(); return headSlim(doc, L, title); };
const tbl = (doc, L, title, opts) => doc.autoTable({ margin: { left: 8, right: 8, top: 18, bottom: 14 }, theme: 'grid', styles: { fontSize: 8, cellPadding: 2, lineColor: L.th.go, lineWidth: .15 }, headStyles: { fillColor: L.th.dg, textColor: 255, halign: 'center' },
  alternateRowStyles: { fillColor: L.th.soft }, didDrawPage: d => { if (d.pageNumber > 1) headSlim(doc, L, title); }, ...opts });
const addr = f => [f.address, f.taluka, f.locations && f.locations.city].filter(Boolean).join(', ');
const money = v => 'Rs. ' + Math.round(+v || 0);
const dueCols = (o, f) => o.dues ? [o.dues.get(f.id) ? money(o.dues.get(f.id).paid) : '—', o.dues.get(f.id) ? money(o.dues.get(f.id).due) : '—'] : [];
const dueHead = o => o.dues ? ['Paid ' + o.dues.fy, 'Due'] : [];

const MAKERS = {
  async directory(fams, o) { const { doc, L, y } = await newDoc('portrait', 'Family Head Directory', o.place, o); let i = 0;
    tbl(doc, L, 'Family Head Directory', { startY: y, head: [['#', 'Family ID', 'Head of family', 'Mobile', 'Gotra', 'Address', 'Members', ...dueHead(o)]], body: fams.map(f => [++i, f.family_code, f.head ? f.head.full_name : '—', f.hmob || '—', f.gotra || '—', addr(f), f.rows.length, ...dueCols(o, f)]),
      columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 22 }, 6: { cellWidth: 16, halign: 'center' } } }); footers(doc, L); return doc; },
  async allfamilies(fams, o) { const { doc, L, y } = await newDoc('landscape', 'All Families', o.place, o); let i = 0;
    tbl(doc, L, 'All Families', { startY: y, head: [['#', 'Family ID', 'Head', 'City', 'Gotra', 'Type', 'Mobile', 'Address', 'Members', ...dueHead(o)]], body: fams.map(f => [++i, f.family_code, f.head ? f.head.full_name : '—', f.locations.city, f.gotra || '—', f.family_type || '—', f.hmob || '—', f.address || '—', f.rows.length, ...dueCols(o, f)]),
      columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 22 }, 8: { cellWidth: 16, halign: 'center' } } }); footers(doc, L); return doc; },
  async detailed(fams, o) { const { doc, L, y: y0 } = await newDoc('landscape', 'Detailed Family Records', o.place, o); let y = y0;
    for (const f of fams) {
      if (y > 165) y = nextPage(doc, L, 'Detailed Family Records');
      doc.setFillColor(...L.th.dg); doc.rect(8, y, 281, 7, 'F'); doc.setFillColor(...L.th.go); doc.rect(8, y + 7, 281, .5, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      const dd = o.dues && o.dues.get(f.id); doc.text(`${f.family_code}  ·  ${f.head ? f.head.full_name : '—'}  ·  ${f.locations.city}  ·  Gotra: ${f.gotra || '—'}  ·  ${f.hmob || ''}` + (dd ? `  ·  Paid ${money(dd.paid)} / Due ${money(dd.due)}` : ''), 10, y + 5);
      tbl(doc, L, 'Detailed Family Records', { startY: y + 8, head: [['Member ID', 'Name', 'Relation', 'Gender', 'Age', 'Education', 'Occupation', 'Marital', 'Blood', 'Mobile']],
        body: f.rows.map(r => { const m = r.members; return [m.member_code || '—', m.full_name, REL_LABELS[r.relation] || r.relation, m.gender || '', ageText(m).replace(' yrs', ''), m.education || '', m.occupation || '', m.marital_status || '', m.blood_group || '', mobOf(m)]; }), styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: L.th.go, lineWidth: .15 } });
      y = doc.lastAutoTable.finalY + 5; }
    footers(doc, L); return doc; },
  async citywise(fams, o) { const { doc, L, y: y0 } = await newDoc('portrait', 'City-wise Directory', o.place, o); const by = {}; fams.forEach(f => (by[f.locations.city] = by[f.locations.city] || []).push(f)); let y = y0;
    for (const city of Object.keys(by).sort()) { const list = by[city], mem = list.reduce((a, f) => a + f.rows.length, 0);
      if (y > 245) y = nextPage(doc, L, 'City-wise Directory');
      doc.setFillColor(...L.th.go); doc.roundedRect(8, y, 194, 8, 2, 2, 'F'); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(`${city}   —   ${list.length} families · ${mem} members`, 11, y + 5.5);
      tbl(doc, L, 'City-wise Directory', { startY: y + 9, head: [['Family ID', 'Head of family', 'Mobile', 'Gotra', 'Members', ...dueHead(o)]], body: list.map(f => [f.family_code, f.head ? f.head.full_name : '—', f.hmob || '—', f.gotra || '—', f.rows.length, ...dueCols(o, f)]), columnStyles: { 4: { halign: 'center', cellWidth: 18 } } });
      y = doc.lastAutoTable.finalY + 6; }
    footers(doc, L); return doc; },
  async idcards(fams, o) { await loadPdfLibs(); const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }), L = await prep(o.cfg || getCfg());
    const { split } = await measurer(); const people = []; fams.forEach(f => f.rows.forEach(r => people.push({ f, r, m: r.members })));
    const mx = 12, my = 10, gx = 6, gy = 3;
    for (let i = 0; i < people.length; i++) { if (i % 10 === 0) { if (i) doc.addPage(); doc.setFillColor(255, 255, 255); doc.rect(0, 0, 210, 297, 'F'); }
      const k = i % 10, x = mx + (k % 2) * (CW + gx), y = my + Math.floor(k / 2) * (CH + gy), { f, r, m } = people[i];
      drawPdf(doc, idSpec(await cardParts(m, r.relation, f, !!o.photos, f.head && f.head.full_name), split), x, y); }
    footers(doc, L); return doc; },
  async qrsheet(fams, o) { const { doc, L, y: y0 } = await newDoc('portrait', 'Family QR Sheet', o.place, o); const cw = 46, ch = 52, cols = 4, x0 = 9, per = 16; let n = 0, ty = y0;
    for (const f of fams) { if (n && n % per === 0) ty = nextPage(doc, L, 'Family QR Sheet'); const k = n % per, x = x0 + (k % cols) * (cw + 2), y = ty + Math.floor(k / cols) * (ch + 3);
      doc.setFillColor(...L.th.soft); doc.setDrawColor(...L.th.go); doc.setLineWidth(.4); doc.roundedRect(x, y, cw, ch, 2, 2, 'FD'); doc.addImage(qrPng('CJBWS|' + (f.head ? f.head.full_name : '') + '|ID:' + f.family_code), 'PNG', x + 5, y + 2, 36, 36, undefined, 'FAST');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...L.th.dg); doc.text(f.family_code || '', x + cw / 2, y + 43, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(40, 40, 40);
      doc.text(doc.splitTextToSize(f.head ? f.head.full_name : '—', cw - 4).slice(0, 2), x + cw / 2, y + 47, { align: 'center' }); n++; }
    footers(doc, L); return doc; },
  async stickers(fams, o) { await loadPdfLibs(); const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }), L = await prep(o.cfg || getCfg()), cw = 70, ch = 37, cols = 3, per = 24;
    fams.forEach((f, i) => { if (i % per === 0 && i) doc.addPage(); const k = i % per, x = (k % cols) * cw, y = Math.floor(k / cols) * ch;
      doc.setDrawColor(...L.th.go); doc.setLineWidth(.2); doc.rect(x + .5, y + .5, cw - 1, ch - 1, 'S'); doc.setFillColor(...L.th.lt); doc.rect(x + .5, y + .5, 2.2, ch - 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...L.th.dg); doc.text(f.family_code || '', x + 5, y + 8); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20); doc.text(doc.splitTextToSize(f.head ? f.head.full_name : '—', cw - 9).slice(0, 1), x + 5, y + 14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(doc.splitTextToSize(addr(f), cw - 9).slice(0, 3), x + 5, y + 19.5); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.text(f.hmob || '', x + 5, y + ch - 4); });
    return doc; },
  async attendance(fams, o) { const { doc, L, y } = await newDoc('portrait', o.title || 'Attendance Sheet', o.date || tday(), o); let i = 0;
    tbl(doc, L, o.title || 'Attendance Sheet', { startY: y, head: [['#', 'Family ID', 'Name of head', 'Mobile', 'Present', 'Signature']], body: fams.map(f => [++i, f.family_code, f.head ? f.head.full_name : '—', f.hmob || '', '', '']), styles: { fontSize: 8.5, cellPadding: 3.2, lineColor: L.th.go, lineWidth: .15 },
      columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 22 }, 4: { cellWidth: 18 }, 5: { cellWidth: 45 } } }); footers(doc, L); return doc; },
  async notice(fams, o) { return noticeDoc(o); }
};

// Notice / letter on the letterhead. Works without any family data. o: title, body, date, ref, to, category, sign_name, sign_title, size ('a4'|'a5'), cfg
export async function noticeDoc(o) {
  await loadPdfLibs(); const a5 = o.size === 'a5', doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: a5 ? 'a5' : 'a4' }), L = await prep(o.cfg || getCfg());
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), th = L.th, m = a5 ? 12 : 18, fs = a5 ? 10 : 11.5;
  let y = headFull(doc, L, (o.category || 'Notice'), o.ref ? 'Ref. No.: ' + o.ref : '', o.date || tday()); const bottom = H - 14; y += 3;
  if (o.to) { doc.setFont('helvetica', 'bold'); doc.setFontSize(fs); doc.setTextColor(20, 20, 20); const tl = doc.splitTextToSize('To: ' + o.to, W - 2 * m); doc.text(tl, m, y); y += tl.length * (fs * .5) + 3; }
  if (o.title) { doc.setFont('helvetica', 'bold'); doc.setFontSize(fs + 2.5); doc.setTextColor(...th.dg); const tl = doc.splitTextToSize(o.title, W - 2 * m); doc.text(tl, W / 2, y, { align: 'center' }); y += tl.length * ((fs + 2.5) * .5) + 2;
    doc.setDrawColor(...th.go); doc.setLineWidth(.7); doc.line(W / 2 - 30, y, W / 2 + 30, y); y += 8; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(25, 25, 25); const lh = fs * .56 * 1.45;
  for (const ln of doc.splitTextToSize(o.body || '', W - 2 * m)) { if (y + lh > bottom - 28) { doc.addPage(); y = headSlim(doc, L, o.category || 'Notice') + 4; doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(25, 25, 25); } doc.text(ln, m, y); y += lh; }
  if (y > bottom - 28) { doc.addPage(); y = headSlim(doc, L, o.category || 'Notice') + 4; }
  const sy = Math.max(y + 14, bottom - 22); doc.setDrawColor(...th.dg); doc.setLineWidth(.4); doc.line(W - m - 55, sy, W - m, sy);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(fs - .5); doc.setTextColor(20, 20, 20); doc.text(o.sign_name || '', W - m, sy + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(fs - 1.5); doc.text((o.sign_title || 'Secretary') + (L.B.short_name ? ', ' + L.B.short_name : ''), W - m, sy + 10, { align: 'right' });
  footers(doc, L); return doc;
}
export const DOCS = [['directory', '📒 Head Directory', 'Family ID, head, mobile, address'], ['allfamilies', '📋 All Families', 'One-page summary table'], ['detailed', '🗂 Detailed Records', 'Every family with all members'],
  ['citywise', '🏙 City-wise Directory', 'Grouped by city with counts'], ['idcards', '🪪 ID Cards', 'One card per member: head, relation, QR (10 per page)'], ['qrsheet', '▦ Family QR Sheet', 'QR code for every family'],
  ['stickers', '🏷 Address Stickers', '3 × 8 labels per A4 sheet'], ['attendance', '✍ Attendance Sheet', 'Head list with signature column']];
export const DUES_DOCS = ['directory', 'allfamilies', 'detailed', 'citywise'];
// mode 'save' downloads; 'view' returns a blob URL for the on-screen viewer
export async function makePdf(kind, fams, opts, mode = 'save') { const doc = await MAKERS[kind](fams, opts), name = 'chhipa-' + kind + '-' + new Date().toISOString().slice(0, 10) + '.pdf';
  if (mode === 'view') return { url: URL.createObjectURL(doc.output('blob')), name }; doc.save(name); }
export async function makeNotice(opts, mode = 'save') { const doc = await noticeDoc(opts), name = 'chhipa-notice-' + new Date().toISOString().slice(0, 10) + '.pdf';
  if (mode === 'view') return { url: URL.createObjectURL(doc.output('blob')), name }; doc.save(name); }
