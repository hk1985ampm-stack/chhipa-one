import { sb, h, ageText, state, logAct } from './core.js';
import { REL_LABELS } from './options.js';
import { brand, logoUrl } from './brand.js';
import { photoUrl } from './photo.js';
import { load, qrPng } from './pdf.js';
import { famParts, famSpec, FW, FH, duesFor } from './fcard.js';
import { measurer, toHtml, drawPdf } from './idcard.js';

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
  const rows = ms.data.filter(r => r.members && r.members.status === 'active').sort((a, b) => (b.relation === 'head') - (a.relation === 'head') || (a.created_at > b.created_at ? 1 : a.created_at < b.created_at ? -1 : (a.members.member_code || a.members.id) > (b.members.member_code || b.members.id) ? 1 : -1));
  const head = rows.find(r => r.relation === 'head'), hm = head && head.members, code = fam.family_code || 'PENDING';
  await load('qrcode.min.js');
  const text = [`*${B.name || 'Chhipa Jamat Barar Welfare Society'}*`, `Family ${fam.family_code || '(ID on approval)'}`, hm ? `Head: ${hm.full_name}` : null, `${fam.locations.city}, ${fam.locations.state}`, fam.address, `Members: ${rows.length}`].filter(Boolean).join('\n');
  const m = await measurer(), P = await famParts(fam, rows, await duesFor(fam)), pages = famSpec(fam, rows, P, m, ageText);
  const mm = 96 / 25.4, holder = h('div', { class: 'fc-pages' });
  const wraps = pages.map(S => { const c = toHtml(S, FW, FH); return h('div', { class: 'fpw' }, c); }); holder.append(...wraps);
  const fit = () => { const s = Math.min(1.6, ((main.clientWidth || innerWidth) - 4) / (FW * mm)); wraps.forEach(w => { w.firstChild.style.transform = 'scale(' + s + ')'; w.firstChild.style.transformOrigin = 'top left'; w.style.width = (FW * mm * s) + 'px'; w.style.height = (FH * mm * s) + 'px'; }); };
  const save = async () => { const d = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); pages.forEach((S, i) => { if (i) d.addPage(); drawPdf(d, S); }); logAct('DOWNLOAD', 'Family card ' + (fam.family_code || '')); d.save('FamilyCard_' + ((hm ? hm.full_name : 'family').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 40)) + '.pdf'); };
  main.append(...[
    h('style', {}, '@page{size:A4 landscape;margin:0}'),
    h('div', { class: 'noprint actions' }, h('a', { class: 'btn alt', href: '#family/' + id }, '← Back'),
      h('button', { class: 'btn alt', onclick: () => { logAct('PRINT', 'Family card ' + (fam.family_code || '')); window.print(); } }, '🖨 Print'), h('button', { class: 'btn', onclick: save }, '⬇ Save PDF'),
      h('a', { class: 'btn alt', target: '_blank', rel: 'noopener', href: 'https://wa.me/?text=' + encodeURIComponent(text) }, 'WhatsApp')),
    h('p', { class: 'muted s noprint' }, 'A4 landscape. This screen, Print and Save PDF all use the same layout.'), holder]);
  fit(); setTimeout(fit, 150); addEventListener('resize', fit);
}
