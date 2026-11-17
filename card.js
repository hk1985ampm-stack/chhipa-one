import { sb, h, pill, ageText, state } from './core.js';
import { REL_LABELS } from './options.js';

const rl = r => REL_LABELS[r] || r;
const mobile = m => { const c = m.member_contacts; return (Array.isArray(c) ? c[0] : c)?.mobile || ''; };

// View & print only: read-only Family Card (no edit buttons). Print or save as PDF from the browser dialog.
export async function render(main, id) {
  const [f, ms] = await Promise.all([
    sb.from('families').select('*, locations(code,city,state)').eq('id', id).maybeSingle(),
    sb.from('family_memberships').select('relation,is_active,created_at, members(id,member_code,full_name,father_name,gender,dob,birth_year_est,status,education,occupation,marital_status, member_contacts(mobile))').eq('family_id', id).eq('is_active', true)]);
  if (f.error || ms.error) throw (f.error || ms.error);
  if (!f.data) return main.append(h('p', { class: 'err' }, 'Family not found, or you do not have access.'));
  const fam = f.data;
  const rows = ms.data.filter(r => r.members && r.members.status === 'active')
    .sort((a, b) => (b.relation === 'head') - (a.relation === 'head') || (a.created_at > b.created_at ? 1 : -1));
  const head = rows.find(r => r.relation === 'head');
  const showMobile = state.profile.role !== 'agent' || true;
  const text = [`*Chhipa Jamat Barar Welfare Society*`, `Family ${fam.family_code || '(ID on approval)'}`, head ? `Head: ${head.members.full_name}` : null,
    `${fam.locations.city}, ${fam.locations.state}`, fam.address, `Members: ${rows.length}`].filter(Boolean).join('\n');
  const tb = h('table', { class: 'ptable' },
    h('tr', {}, ['#', 'Member ID', 'Name', 'Relation', 'Gender', 'Age', 'Marital', 'Education', 'Occupation', 'Mobile'].map(t => h('th', {}, t))),
    rows.map((r, i) => { const m = r.members; return h('tr', {}, h('td', {}, i + 1), h('td', {}, m.member_code || '—'), h('td', {}, h('b', {}, m.full_name), m.father_name ? h('div', { class: 'muted s' }, 's/o ' + m.father_name) : null),
      h('td', {}, rl(r.relation)), h('td', {}, m.gender || ''), h('td', {}, ageText(m).replace(' yrs', '')), h('td', {}, m.marital_status || ''), h('td', {}, m.education || ''), h('td', {}, m.occupation || ''), h('td', {}, showMobile ? mobile(m) : '')); }));
  main.append(...[
    h('div', { class: 'noprint actions' }, h('a', { class: 'btn alt', href: '#family/' + id }, '← Back'),
      h('button', { class: 'btn', onclick: () => window.print() }, '🖨 Print / Save PDF'),
      h('a', { class: 'btn alt', target: '_blank', rel: 'noopener', href: 'https://wa.me/?text=' + encodeURIComponent(text) }, 'WhatsApp')),
    h('div', { class: 'card sheet' },
      h('div', { class: 'sheet-h' }, h('h2', {}, 'Chhipa Jamat Barar Welfare Society'), h('div', { class: 'muted' }, 'Chandur Bazar, Maharashtra · Family Card')),
      h('div', { class: 'kv' }, h('div', {}, h('span', {}, 'Family ID'), h('b', {}, fam.family_code || 'On approval')), h('div', {}, h('span', {}, 'Status'), pill(fam.status)),
        h('div', {}, h('span', {}, 'Location'), h('b', {}, fam.locations.city + ', ' + fam.locations.state)), h('div', {}, h('span', {}, 'Head'), h('b', {}, head ? head.members.full_name : '—')),
        h('div', {}, h('span', {}, 'Address'), h('b', {}, fam.address || '—')), h('div', {}, h('span', {}, 'Gotra / Type'), h('b', {}, [fam.gotra, fam.family_type].filter(Boolean).join(' · ') || '—'))),
      h('div', { class: 'tw' }, tb),
      h('div', { class: 'muted s', style: 'margin-top:10px' }, 'Printed ' + new Date().toLocaleDateString() + ' · Active members only'))].filter(Boolean));
}
