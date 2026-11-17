import { sb, ageText } from './core.js';
import { REL_LABELS } from './options.js';
import { photoUrl } from './photo.js';

const load = src => new Promise((ok, no) => { if (document.querySelector(`script[data-s="${src}"]`)) return ok();
  const s = document.createElement('script'); s.src = src; s.dataset.s = src; s.onload = ok; s.onerror = () => no(new Error('Could not load ' + src)); document.head.appendChild(s); });
const dataUrl = async u => { const r = await fetch(u); const b = await r.blob(); return new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); };
const safe = n => (n || 'family').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 40);
const REL_PDF = { head: 'Khud (Self)', spouse: 'Patni / Pati (Spouse)', son: 'Beta (Son)', daughter: 'Beti (Daughter)', 'daughter-in-law': 'Bahu (Daughter-in-law)', 'son-in-law': 'Damad (Son-in-law)',
  grandson: 'Pota (Grandson)', granddaughter: 'Poti (Granddaughter)', father: 'Walid (Father)', mother: 'Walida (Mother)', brother: 'Bhai (Brother)', sister: 'Behen (Sister)' };

function qrPng(text) {
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), s = 6, c = document.createElement('canvas'); c.width = c.height = (n + 2) * s;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#0d3220';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect((k + 1) * s, (r + 1) * s, s, s);
  return c.toDataURL('image/png');
}

// Same landscape A4 Family Card as the previous app: cream page, gold border, green header, QR, stamp, members table.
export async function familyCardPdf(fam, rows, ageOf = ageText) {
  await load('jspdf.min.js'); await load('jspdf-autotable.min.js'); await load('qrcode.min.js');
  const head = rows.find(r => r.relation === 'head'), hm = head && head.members;
  const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210, DG = [13, 50, 30], GO = [180, 140, 40], CR = [250, 248, 238];
  const T = (s, x, y, o) => doc.text(String(s), x, y, o);
  doc.setFillColor(...CR); doc.rect(0, 0, W, H, 'F'); doc.setDrawColor(...GO); doc.setLineWidth(.8); doc.rect(2, 2, W - 4, H - 4, 'S'); doc.setLineWidth(.3); doc.rect(4, 4, W - 8, H - 8, 'S');
  doc.setFillColor(...DG); doc.rect(2, 2, W - 4, 24, 'F'); doc.setDrawColor(...GO); doc.setLineWidth(.4); doc.line(2, 26, W - 2, 26);
  doc.setFillColor(255, 255, 255); doc.circle(18, 14, 8, 'F'); doc.circle(18, 14, 8, 'S');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(...DG); T('ESTD.', 18, 11, { align: 'center' }); T('2016', 18, 15.5, { align: 'center' });
  doc.setFontSize(14); doc.setTextColor(255, 255, 255); T('CHHIPA JAMAT BARAR WELFARE SOCIETY', W / 2, 13, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(200, 225, 200); T('Chandur Bazar, Maharashtra  -  All India', W / 2, 20, { align: 'center' });
  const code = fam.family_code || 'PENDING';
  try { doc.addImage(qrPng('CJBWS|' + (hm ? hm.full_name : '') + '|ID:' + code), 'PNG', W - 24, 2, 20, 20); } catch (e) {}
  doc.setFillColor(...DG); doc.rect(2, 26, W - 4, 9, 'F'); doc.setDrawColor(...GO); doc.setLineWidth(.5); doc.line(2, 26, W - 2, 26); doc.line(2, 35, W - 2, 35);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255); T('FAMILY CARD', W / 2, 32, { align: 'center' });
  doc.setFillColor(255, 255, 255); doc.rect(2, 35, W - 4, 42, 'F'); doc.setDrawColor(...GO); doc.setLineWidth(.3); doc.rect(2, 35, W - 4, 42, 'S');
  doc.setFillColor(220, 240, 230); doc.rect(5, 38, 30, 36, 'F'); doc.setLineWidth(.5); doc.rect(5, 38, 30, 36, 'S');
  let drawn = false;
  if (hm && hm.photo_path) { try { const u = await photoUrl(hm.photo_path); if (u) { doc.addImage(await dataUrl(u), 'JPEG', 5, 38, 30, 36, undefined, 'FAST'); drawn = true; } } catch (e) {} }
  if (!drawn) { doc.setFontSize(14); doc.setTextColor(...DG); T((hm ? hm.full_name : '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(), 20, 58, { align: 'center' }); }
  const lab = (t, x, y) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100); T(t, x, y); };
  const val = (t, x, y, sz = 9) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(sz); doc.setTextColor(20, 20, 20); T(t, x, y); };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20, 20, 20);
  const nl = doc.splitTextToSize(hm ? hm.full_name : '—', 88).slice(0, 2); T(nl, 39, 43); const ny = 43 + (nl.length - 1) * 5;
  lab('Family ID', 39, ny + 6); val(code, 39, ny + 11); lab('Address', 39, ny + 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(30, 30, 30); T(doc.splitTextToSize(fam.address || '—', 88).slice(0, 2), 39, ny + 22);
  doc.setDrawColor(220, 215, 200); doc.setLineWidth(.25); doc.line(133, 37, 133, 75); doc.line(220, 37, 220, 75);
  const mob = (hm && ((Array.isArray(hm.member_contacts) ? hm.member_contacts[0] : hm.member_contacts) || {}).mobile) || fam.phone || '—';
  lab('Mobile (Head of Family)', 137, 43); val(mob, 137, 50, 11); lab('City / Taluka / State', 137, 59);
  val([fam.locations.city, fam.taluka, fam.locations.state].filter(Boolean).join(' / '), 137, 65);
  lab('Gotra', 224, 43); val(fam.gotra || '—', 224, 50, 11); lab('Family Type', 224, 59); val(fam.family_type || '—', 224, 65, 10);
  try { doc.addImage('stamp.png', 'PNG', W - 44, 37, 36, 34, undefined, 'FAST'); } catch (e) {}
  doc.setFillColor(...DG); doc.roundedRect(W / 2 - 32, 79, 64, 8, 2, 2, 'F'); doc.setDrawColor(...GO); doc.setLineWidth(.4); doc.roundedRect(W / 2 - 32, 79, 64, 8, 2, 2, 'S');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255); T('MEMBERS (' + rows.length + ')', W / 2, 84.5, { align: 'center' });
  const d = v => v || '—';
  doc.autoTable({ startY: 89, margin: { left: 4, right: 4 }, tableWidth: W - 8, theme: 'grid',
    head: [['S/N', 'Name', 'Age', 'Gender', 'Relation', 'Education', 'Occupation', 'Marital', 'Mobile']],
    body: rows.map((r, i) => { const m = r.members, c = Array.isArray(m.member_contacts) ? m.member_contacts[0] : m.member_contacts;
      return [i + 1, d(m.full_name), d(ageOf(m).replace(' yrs', '').replace('~', '')), d((m.gender || '').replace(/^./, s => s.toUpperCase())), REL_PDF[r.relation] || REL_LABELS[r.relation] || r.relation, d(m.education), d(m.occupation), d(m.marital_status), d(c && c.mobile)]; }),
    headStyles: { fillColor: DG, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 2.5 },
    bodyStyles: { fontSize: 8, fontStyle: 'bold', textColor: [10, 10, 10], cellPadding: 2.5 }, alternateRowStyles: { fillColor: [240, 250, 244] },
    columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center', cellWidth: 12 }, 3: { halign: 'center', cellWidth: 16 }, 4: { cellWidth: 32 }, 5: { cellWidth: 26 }, 6: { cellWidth: 24 }, 7: { cellWidth: 22 }, 8: { cellWidth: 26 } },
    styles: { lineColor: GO, lineWidth: .2, overflow: 'linebreak' },
    willDrawPage: d => { if (d.pageNumber > 1) { doc.setFillColor(...CR); doc.rect(0, 0, W, H, 'F'); doc.setDrawColor(...GO); doc.setLineWidth(.8); doc.rect(2, 2, W - 4, H - 4, 'S'); } } });
  const pages = doc.internal.getNumberOfPages(), quote = (fam.quote || '').trim() || 'Together We Build a Stronger Community';
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFillColor(...DG); doc.rect(2, H - 10, W - 4, 8, 'F'); doc.setDrawColor(...GO); doc.setLineWidth(.3); doc.line(2, H - 10, W - 2, H - 10);
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(10); doc.setTextColor(255, 255, 255); T(quote, W / 2, H - 5, { align: 'center' }); }
  doc.save('FamilyCard_' + safe(hm && hm.full_name) + '.pdf');
}
