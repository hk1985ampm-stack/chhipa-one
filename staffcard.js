// Agent / Admin / office-bearer ID card in the same framed print format (header, office bearers, card, footer)
import { sb, h, ROLE_LABEL } from './core.js';
import { THEMES, getCfg } from './letterhead.js';
import { brand, logoUrl } from './brand.js';
import { CW, CH, dataUrl } from './idcard.js';
import { qrPng, load } from './pdf.js';
import { officersFor, allOfficers } from './officers.js';
import { cardPageView } from './cardframe.js';

function staffSpec(c, m, logo, qr) {
  const th = THEMES[getCfg().theme] || THEMES.emerald, S = [], B = brand.data || {};
  const R = (x, y, w, h2, o = {}) => S.push({ k: 'r', x, y, w, h: h2, ...o }), T = (x, y, s, o = {}) => S.push({ k: 't', x, y, s: String(s), size: o.size || 7, bold: !!o.bold, italic: !!o.italic, color: o.color || [20, 20, 20], align: o.align || 'left' });
  R(0, 0, CW, CH, { fill: th.cr }); R(0, 0, CW, 12, { fill: th.dg }); R(0, 12, CW, .7, { fill: th.go });
  if (logo) { S.push({ k: 'c', x: 7.5, y: 6, r: 4.6, fill: [255, 255, 255], stroke: th.go, lw: .3 }); S.push({ k: 'i', x: 3.4, y: 1.9, w: 8.2, h: 8.2, src: logo }); }
  T(logo ? 51 : CW / 2, 5.6, m.fit(B.header_line1 || B.name || 'CHHIPA JAMAT BARAR WELFARE SOCIETY', 6.5, true, 70), { size: 6.5, bold: true, color: [255, 255, 255], align: 'center' });
  T(logo ? 51 : CW / 2, 9.6, c.level_label, { size: 6, bold: true, color: [255, 235, 160], align: 'center' });
  const lines = [['Name', c.name, 10], ['Designation', c.designation || c.level_label, 7.5], ['ID No.', c.code, 9], ['Phone', c.phone || '—', 8.5], ['Area', c.area || '—', 7.5]];
  lines.forEach(([l, v, sz], i) => { const y = 18 + i * 7.4; T(5, y, l, { size: 5.5, color: [110, 110, 110] }); T(5, y + 3.6, m.fit(v, sz, true, 52), { size: sz, bold: true }); });
  R(61, 17, 22, 22, { fill: [255, 255, 255], stroke: th.go, lw: .3 }); S.push({ k: 'i', x: 62, y: 18, w: 20, h: 20, src: qr });
  T(72, 43, 'Scan to verify', { size: 5, color: [110, 110, 110], align: 'center' });
  R(0, CH - 4.5, CW, 4.5, { fill: th.dg }); T(CW / 2, CH - 1.5, m.fit(c.status || 'Authorised representative', 5.5, true, 80), { size: 5.5, bold: true, color: [255, 255, 255], align: 'center' });
  R(.25, .25, CW - .5, CH - .5, { stroke: th.go, lw: .5 });
  return S;
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
