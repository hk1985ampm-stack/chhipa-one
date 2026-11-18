// Old-app PDFs, rebuilt: directory, all families, detailed, citywise, ID cards, QR sheet, address stickers, attendance sheet, notice.
import { sb, ageText } from './core.js';
import { brand, logoUrl } from './brand.js';
import { photoUrl } from './photo.js';
import { loadPdfLibs, qrPng, load } from './pdf.js';
import { REL_LABELS } from './options.js';
import { idSpec, drawPdf, cardParts, measurer, CW, CH } from './idcard.js';

const DG = [13, 50, 30], GO = [180, 140, 40], CR = [250, 248, 238];
const mobOf = m => { const c = m && m.member_contacts; return (Array.isArray(c) ? c[0] : c)?.mobile || ''; };
const dataUrl = async u => { const r = await fetch(u); const b = await r.blob(); return new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); };
const today = () => new Date().toLocaleDateString('en-IN');

// ---- data: every approved family with its active members (RLS decides what the caller may see)
export async function fetchFamilies(locationId, onProgress) {
  const out = [];
  for (let from = 0; ; from += 150) {
    let q = sb.from('families').select('id,family_code,address,gotra,family_type,taluka,pincode,phone,locations(code,city), family_memberships(relation,is_active, members(id,member_code,full_name,gender,dob,birth_year_est,status,education,occupation,marital_status,photo_path,removed_at, member_contacts(mobile)))')
      .eq('status', 'approved').is('removed_at', null).order('family_code').range(from, from + 149);
    if (locationId) q = q.eq('location_id', locationId);
    const { data, error } = await q; if (error) throw error;
    out.push(...data); onProgress && onProgress(out.length); if (data.length < 150) break;
  }
  return out.map(f => { const act = (f.family_memberships || []).filter(r => r.is_active && r.members && r.members.status === 'active' && !r.members.removed_at);
    const head = act.find(r => r.relation === 'head'); return { ...f, rows: act.sort((a, b) => (b.relation === 'head') - (a.relation === 'head')), head: head && head.members, hmob: (head && mobOf(head.members)) || f.phone || '' }; });
}

async function newDoc(orientation, title, sub) {
  await loadPdfLibs(); const doc = new window.jspdf.jsPDF({ orientation, unit: 'mm', format: 'a4' }), W = doc.internal.pageSize.getWidth(), B = brand.data || {};
  const lg = logoUrl(B.logo_path); let img = null; if (lg) { try { img = await dataUrl(lg); } catch {} }
  const head = () => { doc.setFillColor(...DG); doc.rect(0, 0, W, 22, 'F'); doc.setFillColor(...GO); doc.rect(0, 22, W, .8, 'F');
    if (img) { doc.setFillColor(255, 255, 255); doc.circle(14, 11, 7.5, 'F'); try { doc.addImage(img, 'PNG', 7.5, 4.5, 13, 13); } catch {} }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(B.header_line1 || B.name || 'CHHIPA JAMAT BARAR WELFARE SOCIETY', W / 2, 10, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(200, 225, 200); doc.text(B.header_line2 || '', W / 2, 15.5, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(255, 255, 255); doc.text(title + (sub ? '  ·  ' + sub : ''), W / 2, 20, { align: 'center' }); };
  head(); return { doc, W, head, B };
}
const foot = (doc, B) => { const n = doc.internal.getNumberOfPages(), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(110, 110, 110); doc.setFont('helvetica', 'normal'); doc.text((B.footer_text || '') + '   ·   Printed ' + today(), 8, H - 5); doc.text('Page ' + i + ' of ' + n, W - 8, H - 5, { align: 'right' }); } };
const tbl = (doc, opts) => doc.autoTable({ margin: { left: 8, right: 8, top: 27, bottom: 12 }, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: DG, textColor: 255, halign: 'center' }, alternateRowStyles: { fillColor: [240, 250, 244] }, ...opts });
const addr = f => [f.address, f.taluka, f.locations && f.locations.city].filter(Boolean).join(', ');

const MAKERS = {
  async directory(fams, o) { const { doc, B } = await newDoc('portrait', 'Family Head Directory', o.place); let i = 0;
    tbl(doc, { startY: 27, head: [['#', 'Family ID', 'Head of family', 'Mobile', 'Gotra', 'Address', 'Members']], body: fams.map(f => [++i, f.family_code, f.head ? f.head.full_name : '—', f.hmob || '—', f.gotra || '—', addr(f), f.rows.length]),
      columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 22 }, 6: { cellWidth: 16, halign: 'center' } }, didDrawPage: () => {} }); foot(doc, B); return doc; },
  async allfamilies(fams, o) { const { doc, B } = await newDoc('landscape', 'All Families', o.place); let i = 0;
    tbl(doc, { startY: 27, head: [['#', 'Family ID', 'Head', 'City', 'Gotra', 'Type', 'Mobile', 'Address', 'Members']], body: fams.map(f => [++i, f.family_code, f.head ? f.head.full_name : '—', f.locations.city, f.gotra || '—', f.family_type || '—', f.hmob || '—', f.address || '—', f.rows.length]), columnStyles: { 0: { cellWidth: 9 }, 8: { cellWidth: 16, halign: 'center' } } }); foot(doc, B); return doc; },
  async detailed(fams, o) { const { doc, B } = await newDoc('landscape', 'Detailed Family Records', o.place); let y = 27;
    for (const f of fams) {
      if (y > 170) { doc.addPage(); y = 27; }
      doc.setFillColor(...DG); doc.rect(8, y, 281, 7, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(`${f.family_code}  ·  ${f.head ? f.head.full_name : '—'}  ·  ${f.locations.city}  ·  Gotra: ${f.gotra || '—'}  ·  ${f.hmob || ''}`, 10, y + 5);
      tbl(doc, { startY: y + 7, margin: { left: 8, right: 8, top: 27, bottom: 12 }, head: [['Member ID', 'Name', 'Relation', 'Gender', 'Age', 'Education', 'Occupation', 'Marital', 'Mobile']],
        body: f.rows.map(r => { const m = r.members; return [m.member_code || '—', m.full_name, REL_LABELS[r.relation] || r.relation, m.gender || '', ageText(m).replace(' yrs', ''), m.education || '', m.occupation || '', m.marital_status || '', mobOf(m)]; }), styles: { fontSize: 7.5, cellPadding: 1.5 } });
      y = doc.lastAutoTable.finalY + 5; }
    foot(doc, B); return doc; },
  async citywise(fams, o) { const { doc, B } = await newDoc('portrait', 'City-wise Directory', o.place); const by = {}; fams.forEach(f => (by[f.locations.city] = by[f.locations.city] || []).push(f)); let y = 27;
    for (const city of Object.keys(by).sort()) { const list = by[city], mem = list.reduce((a, f) => a + f.rows.length, 0);
      if (y > 250) { doc.addPage(); y = 27; }
      doc.setFillColor(...GO); doc.rect(8, y, 194, 8, 'F'); doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(`${city}   —   ${list.length} families · ${mem} members`, 10, y + 5.5);
      tbl(doc, { startY: y + 8, head: [['Family ID', 'Head of family', 'Mobile', 'Gotra', 'Members']], body: list.map(f => [f.family_code, f.head ? f.head.full_name : '—', f.hmob || '—', f.gotra || '—', f.rows.length]), columnStyles: { 4: { halign: 'center', cellWidth: 18 } } });
      y = doc.lastAutoTable.finalY + 6; }
    foot(doc, B); return doc; },
  async idcards(fams, o) { const { doc, B } = await newDoc('portrait', 'ID Cards', ''); doc.deletePage(1);
    const { split } = await measurer(); const people = []; fams.forEach(f => f.rows.forEach(r => people.push({ f, r, m: r.members })));
    const mx = 12, my = 10, gx = 6, gy = 3;
    for (let i = 0; i < people.length; i++) { if (i % 10 === 0) { doc.addPage(); doc.setFillColor(255, 255, 255); doc.rect(0, 0, 210, 297, 'F'); }
      const k = i % 10, x = mx + (k % 2) * (CW + gx), y = my + Math.floor(k / 2) * (CH + gy), { f, r, m } = people[i];
      drawPdf(doc, idSpec(await cardParts(m, r.relation, f, !!o.photos), split), x, y); }
    foot(doc, B); return doc; },
  async qrsheet(fams, o) { const { doc, B } = await newDoc('portrait', 'Family QR Sheet', o.place); const cw = 46, ch = 52, cols = 4, x0 = 9, y0 = 28; let n = 0;
    for (const f of fams) { if (n && n % 20 === 0) { doc.addPage(); } const k = n % 20, x = x0 + (k % cols) * (cw + 2), y = y0 + Math.floor(k / cols) * (ch + 3);
      doc.setDrawColor(...GO); doc.setLineWidth(.3); doc.rect(x, y, cw, ch, 'S'); doc.addImage(qrPng('CJBWS|' + (f.head ? f.head.full_name : '') + '|ID:' + f.family_code), 'PNG', x + 5, y + 2, 36, 36, undefined, 'FAST');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DG); doc.text(f.family_code || '', x + cw / 2, y + 43, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(40, 40, 40); doc.text(doc.splitTextToSize(f.head ? f.head.full_name : '—', cw - 4).slice(0, 2), x + cw / 2, y + 47.5, { align: 'center' }); n++; }
    foot(doc, B); return doc; },
  async stickers(fams, o) { const { doc } = await newDoc('portrait', '', ''); doc.deletePage(1); const cw = 70, ch = 37, cols = 3, per = 24;
    fams.forEach((f, i) => { if (i % per === 0) { doc.addPage(); } const k = i % per, x = (k % cols) * cw, y = Math.floor(k / cols) * ch;
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(.1); doc.rect(x + .5, y + .5, cw - 1, ch - 1, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...DG); doc.text(f.family_code || '', x + 4, y + 8); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20); doc.text(doc.splitTextToSize(f.head ? f.head.full_name : '—', cw - 8).slice(0, 1), x + 4, y + 14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(doc.splitTextToSize(addr(f), cw - 8).slice(0, 3), x + 4, y + 19.5); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.text(f.hmob || '', x + 4, y + ch - 4); });
    return doc; },
  async attendance(fams, o) { const { doc, B } = await newDoc('portrait', o.title || 'Attendance Sheet', o.date || today()); let i = 0;
    tbl(doc, { startY: 27, head: [['#', 'Family ID', 'Name of head', 'Mobile', 'Present', 'Signature']], body: fams.map(f => [++i, f.family_code, f.head ? f.head.full_name : '—', f.hmob || '', '', '']), styles: { fontSize: 8.5, cellPadding: 3.2 }, columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 22 }, 4: { cellWidth: 18 }, 5: { cellWidth: 40 } } }); foot(doc, B); return doc; },
  async notice(fams, o) { const { doc, W, B } = await newDoc('portrait', '', ''); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...DG); doc.text('NOTICE', W / 2, 42, { align: 'center' });
    doc.setDrawColor(...GO); doc.setLineWidth(.6); doc.line(70, 45, W - 70, 45); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(60, 60, 60); doc.text('Date: ' + (o.date || today()), W - 15, 55, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(20, 20, 20); doc.text(doc.splitTextToSize(o.title || '', W - 40), 20, 68);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.text(doc.splitTextToSize(o.body || '', W - 40), 20, 82, { lineHeightFactor: 1.5 });
    doc.setFontSize(11); doc.text('Secretary / President', W - 20, 255, { align: 'right' }); doc.setFont('helvetica', 'bold'); doc.text(B.short_name || B.name || '', W - 20, 262, { align: 'right' }); foot(doc, B); return doc; }
};
export const DOCS = [['directory', '📒 Head Directory', 'Family ID, head, mobile, address'], ['allfamilies', '📋 All Families', 'One-page summary table'], ['detailed', '🗂 Detailed Records', 'Every family with all members'],
  ['citywise', '🏙 City-wise Directory', 'Grouped by city with counts'], ['idcards', '🪪 ID Cards', 'One card per member, with QR (10 per page)'], ['qrsheet', '▦ Family QR Sheet', 'QR code for every family'],
  ['stickers', '🏷 Address Stickers', '3 × 8 labels per A4 sheet'], ['attendance', '✍ Attendance Sheet', 'Head list with signature column'], ['notice', '📣 Notice', 'Letterhead notice with your text']];
export async function makePdf(kind, fams, opts) { const doc = await MAKERS[kind](fams, opts); doc.save('chhipa-' + kind + '-' + new Date().toISOString().slice(0, 10) + '.pdf'); }
