// Agent / Admin / office-bearer ID card in the same framed print format (header, office bearers, card, footer)
import { sb, h, ROLE_LABEL } from './core.js';
import { getCfg } from './letterhead.js';
import { brand, logoUrl } from './brand.js';
import { CW, CH, dataUrl, cardShell, detailRows, measurer } from './idcard.js';
import { prep, today } from './letterhead.js';
import { qrPng, load } from './pdf.js';
import { officersFor, allOfficers } from './officers.js';
import { cardPageView } from './cardframe.js';

const initials = n => String(n || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export function staffSpec(c, m, logo, qr) {
  const { S, T, R, th } = cardShell({ logo, photo: c.photo, initials: initials(c.name), title: String(c.level_label || 'AUTHORISED REPRESENTATIVE').toUpperCase(), code: c.code, footer: 'Authorised representative of the society' }, m.split);
  const nl = m.split(c.name, 8.6, true, 50).length > 1 ? m.split(c.name, 7.4, true, 50).slice(0, 2) : m.split(c.name, 8.8, true, 50);
  nl.forEach((ln, i) => T(32, 19.8 + i * 3.7, ln, { size: nl.length > 1 ? 7.4 : 8.8, bold: true, color: th.dg }));
  const ny = 19.8 + (nl.length - 1) * 3.7; R(32, ny + 1.5, 50, .35, { fill: th.go });
  detailRows(T, m.split, [['DESIGNATION', c.designation || c.level_label], ['PHONE', c.phone], ['AREA', c.area], ['STATE', c.state]], 32, ny + 6, 4.4, 44, 20, th);
  R(63.6, 28.2, 18.8, 18.8, { fill: [255, 255, 255], stroke: th.go, lw: .4, round: 1.4 }); S.push({ k: 'i', x: 64.8, y: 29.4, w: 16.4, h: 16.4, src: qr });
  T(73, 49.4, 'SCAN TO VERIFY', { size: 3.6, bold: true, color: th.dg, align: 'center' });
  return S;
}

// All staff cards on A4 sheets, 2 × 5 per page, with the society letterhead
export async function bulkStaffPdf(list, mode = 'save') {
  await load('qrcode.min.js'); const m = await measurer(), L = await prep(getCfg()), { headFull, footers } = await import('./letterhead.js'), { drawPdf } = await import('./idcard.js');
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  let logo = null; const lg = logoUrl((brand.data || {}).logo_path); if (lg) { try { logo = await dataUrl(lg); } catch {} }
  let y0 = headFull(doc, L, 'Staff ID Cards', list.length + ' cards', today());
  list.forEach((c, i) => { const pg = Math.floor(i / 10), k = i % 10; if (k === 0 && pg > 0) { doc.addPage(); y0 = headFull(doc, L, 'Staff ID Cards', '', today()); }
    const col = k % 2, row = Math.floor(k / 2), x = 14 + col * 92, y = y0 + 4 + row * 46.5; const cc = { ...c, level_label: c.designation || ROLE_LABEL[c.level] || c.level, area: (c.locations || []).join(', ') };
    drawPdf(doc, staffSpec(cc, m, logo, qrPng('CJBWS|STAFF|' + (c.code || '') + '|' + c.name)), x, y); });
  footers(doc, L);
  if (mode === 'view') return doc.output('bloburl'); doc.save('staff-cards.pdf');
}

export async function render(main, id) {
  main.append(h('p', { class: 'muted ld', style: 'text-align:center;padding:40px 10px' }, 'Preparing the card…'));
  await load('qrcode.min.js');
  const { data, error } = await sb.rpc('staff_card', { p_user: id }); if (error) throw error;
  if (!data) return main.append(h('p', { class: 'err' }, 'Not found, or you do not have access.'));
  const c = { ...data, level_label: data.designation || ROLE_LABEL[data.level] || data.level, area: data.level === 'super_admin' ? 'All locations' : (data.locations || []).join(', ') || data.state || '', status: data.status === 'active' ? 'Authorised representative of the society' : 'Inactive' };
  let logo = null; const lg = logoUrl((brand.data || {}).logo_path); if (lg) { try { logo = await dataUrl(lg); } catch {} }
  const qr = qrPng('CJBWS|STAFF|' + (c.code || '') + '|' + c.name);
  const ids = data.location_ids || []; let officers = [];
  if (ids.length) officers = (await Promise.all(ids.map(officersFor))).flat().filter((o, i, a) => a.findIndex(x => x.admin_code === o.admin_code && x.full_name === o.full_name) === i); else officers = await allOfficers();
  await cardPageView(main, { heading: 'ID Card · ' + c.name, backHref: '#team', backText: '← Team', officers, title: 'OFFICIAL ID CARD', fileName: 'staff-' + (c.code || 'card'), logWhat: 'Staff card ' + (c.code || c.name),
    build: async m => staffSpec(c, m, logo, qr), note: ['This card identifies an authorised representative of the society.', 'Verify the ID number with the State Admin if in doubt.'] });
}
