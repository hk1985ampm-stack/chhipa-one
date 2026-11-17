import { sb, h, ageText, state } from './core.js';
import { REL_LABELS } from './options.js';
import { brand, logoUrl } from './brand.js';
import { photoUrl } from './photo.js';
import { load, qrPng } from './pdf.js';

const REL_PDF = { head: 'Khud (Self)', spouse: 'Patni / Pati (Spouse)', son: 'Beta (Son)', daughter: 'Beti (Daughter)', 'daughter-in-law': 'Bahu (Daughter-in-law)', 'son-in-law': 'Damad (Son-in-law)',
  grandson: 'Pota (Grandson)', granddaughter: 'Poti (Granddaughter)', father: 'Walid (Father)', mother: 'Walida (Mother)', brother: 'Bhai (Brother)', sister: 'Behen (Sister)' };
const mob = m => { const c = m.member_contacts; return (Array.isArray(c) ? c[0] : c)?.mobile || ''; };
const dash = v => v || '—';

// View & print only: an exact on-screen copy of the Family Card PDF (same layout, A4 landscape). What you see is what prints.
export async function render(main, id) {
  const [f, ms] = await Promise.all([
    sb.from('families').select('*, locations(code,city,state)').eq('id', id).maybeSingle(),
    sb.from('family_memberships').select('relation,is_active,created_at, members(id,member_code,full_name,father_name,gender,dob,birth_year_est,status,education,occupation,marital_status,photo_path, member_contacts(mobile))').eq('family_id', id).eq('is_active', true)]);
  if (f.error || ms.error) throw (f.error || ms.error);
  if (!f.data) return main.append(h('p', { class: 'err' }, 'Family not found, or you do not have access.'));
  const fam = f.data, B = brand.data || {};
  const rows = ms.data.filter(r => r.members && r.members.status === 'active').sort((a, b) => (b.relation === 'head') - (a.relation === 'head') || (a.created_at > b.created_at ? 1 : -1));
  const head = rows.find(r => r.relation === 'head'), hm = head && head.members, code = fam.family_code || 'PENDING';
  await load('qrcode.min.js');
  const text = [`*${B.name || 'Chhipa Jamat Barar Welfare Society'}*`, `Family ${fam.family_code || '(ID on approval)'}`, hm ? `Head: ${hm.full_name}` : null, `${fam.locations.city}, ${fam.locations.state}`, fam.address, `Members: ${rows.length}`].filter(Boolean).join('\n');
  const logo = logoUrl(B.logo_path);
  const photo = h('div', { class: 'fc-photo' }, (hm ? hm.full_name : '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase());
  if (hm && hm.photo_path) photoUrl(hm.photo_path).then(u => { if (u) photo.replaceChildren(h('img', { src: u, alt: '' })); });
  const lab = (t, v, big) => h('div', { class: 'fc-f' }, h('small', {}, t), h('b', { class: big ? 'big' : '' }, v));
  const card = h('div', { class: 'fcard' },
    h('div', { class: 'fc-head' },
      h('div', { class: 'fc-logo' }, logo ? h('img', { src: logo, alt: '' }) : h('span', {}, 'ESTD.', h('br'), B.estd || '2016')),
      h('div', { class: 'fc-title' }, h('b', {}, B.header_line1 || 'CHHIPA JAMAT BARAR WELFARE SOCIETY'), h('small', {}, B.header_line2 || 'Chandur Bazar, Maharashtra  -  All India')),
      h('div', { class: 'fc-qr' }, h('img', { src: qrPng('CJBWS|' + (hm ? hm.full_name : '') + '|ID:' + code), alt: 'QR' }))),
    h('div', { class: 'fc-band' }, 'FAMILY CARD'),
    h('div', { class: 'fc-info' }, photo,
      h('div', { class: 'fc-c1' }, h('b', { class: 'fc-name' }, hm ? hm.full_name : '—'), lab('Family ID', code), lab('Address', dash(fam.address))),
      h('div', { class: 'fc-c2' }, lab('Mobile (Head of Family)', dash(hm && mob(hm) || fam.phone), true), lab('City / Taluka / State', [fam.locations.city, fam.taluka, fam.locations.state].filter(Boolean).join(' / '))),
      h('div', { class: 'fc-c3' }, lab('Gotra', dash(fam.gotra), true), lab('Family Type', dash(fam.family_type))),
      h('img', { class: 'fc-stamp', src: 'stamp.png', alt: '' })),
    h('div', { class: 'fc-pill' }, 'MEMBERS (' + rows.length + ')'),
    h('table', { class: 'fc-tb' }, h('thead', {}, h('tr', {}, ['S/N', 'Name', 'Age', 'Gender', 'Relation', 'Education', 'Occupation', 'Marital', 'Mobile'].map(t => h('th', {}, t)))),
      h('tbody', {}, rows.map((r, i) => { const m = r.members; return h('tr', {}, h('td', {}, i + 1), h('td', { class: 'l' }, dash(m.full_name)), h('td', {}, dash(ageText(m).replace(' yrs', '').replace('~', ''))), h('td', {}, dash((m.gender || '').replace(/^./, s => s.toUpperCase()))),
        h('td', {}, REL_PDF[r.relation] || REL_LABELS[r.relation] || r.relation), h('td', {}, dash(m.education)), h('td', {}, dash(m.occupation)), h('td', {}, dash(m.marital_status)), h('td', {}, dash(mob(m)))); }))),
    h('div', { class: 'fc-foot' }, (fam.quote || '').trim() || B.footer_text || 'Together We Build a Stronger Community'));

  const wrap = h('div', { class: 'fscale' }, card);
  const fit = () => { const w = Math.min(main.clientWidth || innerWidth, innerWidth) - 4, s = Math.min(1, w / 1123); card.style.transform = 'scale(' + s + ')'; wrap.style.height = Math.ceil(card.offsetHeight * s) + 'px'; wrap.style.width = Math.ceil(1123 * s) + 'px'; };
  main.append(...[
    h('style', {}, '@page{size:A4 landscape;margin:0}'),
    h('div', { class: 'noprint actions' }, h('a', { class: 'btn alt', href: '#family/' + id }, '← Back'),
      h('button', { class: 'btn', onclick: () => window.print() }, '🖨 Print / Save PDF'),
      h('a', { class: 'btn alt', target: '_blank', rel: 'noopener', href: 'https://wa.me/?text=' + encodeURIComponent(text) }, 'WhatsApp')),
    h('p', { class: 'muted s noprint' }, 'This is exactly how the printed card looks. Use landscape, margins “None”, and “Background graphics” ON for colours.'), wrap]);
  fit(); setTimeout(fit, 150); addEventListener('resize', fit);
}
