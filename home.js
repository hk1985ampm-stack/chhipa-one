import { sb, h, hi, state, ROLE_LABEL } from './core.js';
import { logoImg, brandName, brandSub, brand } from './brand.js';

const APP_VERSION = 'v15 · Branding';
const tile = (href, en, hindi, soon, badge) =>
  h(soon ? 'div' : 'a', { class: 'tile' + (soon ? ' soon' : ''), href: soon ? null : href },
    h('span', {}, en), h('span', { class: 'hi' }, hindi), soon ? h('span', { class: 'tag' }, 'Coming in Phase ' + soon) : null, badge ? h('span', { class: 'badge' }, String(badge)) : null);

export async function render(main) {
  let unread = 0, pend = 0;
  try {
    const r = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false); unread = r.count || 0;
    if (['super_admin', 'location_admin'].includes(state.profile.role)) { const q = await sb.from('families').select('id', { count: 'exact', head: true }).eq('status', 'pending'); pend = q.count || 0; }
  } catch {}
  const p = state.profile, sup = p.role === 'super_admin', appr = ['super_admin', 'location_admin'].includes(p.role);
  const SECTIONS = [
    ['families', '👨‍👩‍👧 Families', [
      tile('#registry', 'Family Registry', 'परिवार रजिस्टर'), tile('#add', 'Add Family', 'परिवार जोड़ें'),
      tile('#events', 'Life Events', 'जीवन घटनाएँ'), tile('#notifications', 'Notifications', 'सूचनाएँ', false, unread),
      tile('#reports', 'Reports', 'रिपोर्ट'), tile('#reports/quality', 'Data Quality', 'डेटा जाँच'),
      appr ? tile('#registry/removed', 'Removed Entries', 'हटाई गई प्रविष्टियाँ') : null]],
    ...(appr ? [['office', '🏢 Office', [
      tile('#registry/pending', 'Pending Approvals', 'लंबित स्वीकृति', false, pend),
      sup ? tile('#communities', 'Communities', 'समुदाय') : null, sup ? tile('#staff', 'Staff & Agents', 'स्टाफ / एजेंट') : null,
      tile('#excel', 'Excel Import / Export', 'एक्सेल'), tile('#tools', 'Duplicates & Bulk Edit', 'डुप्लिकेट / बल्क एडिट'), sup ? tile('#lists', 'Dropdown Lists', 'ड्रॉपडाउन सूची') : null, sup ? tile('#backup', 'Backup', 'बैकअप') : null, sup ? tile('#audit', 'Audit Log', 'ऑडिट लॉग') : null]]] : [])];
  let cur = sessionStorage.getItem('home_tab'); if (!SECTIONS.some(s => s[0] === cur)) cur = 'families';
  const body = h('div'), tabs = h('div', { class: 'chips' });
  const draw = () => {
    tabs.replaceChildren(...SECTIONS.map(([k, t]) => h('button', { class: 'btn ' + (cur === k ? '' : 'alt'), onclick: () => { cur = k; sessionStorage.setItem('home_tab', k); draw(); } }, t)));
    body.replaceChildren(h('div', { class: 'grid' }, SECTIONS.find(s => s[0] === cur)[2].filter(Boolean)));
  };
  draw();
  const bk = h('a', { href: '#backup', class: 'card muted', style: 'display:block;font-size:13px' }, 'Backup: checking…');
  if (sup) sb.from('backup_log').select('kind,created_at').eq('status', 'ok').order('created_at', { ascending: false }).limit(1).then(({ data }) => {
    const d = data && data[0]; if (!d) { bk.textContent = '⚠ No backup yet — tap to take one'; bk.style.color = '#b3261e'; return; }
    const days = Math.floor((Date.now() - new Date(d.created_at)) / 864e5);
    bk.textContent = (days > 7 ? '⚠ ' : '✔ ') + 'Last backup: ' + (days === 0 ? 'today' : days + ' day(s) ago') + ' (' + d.kind + ')'; if (days > 7) bk.style.color = '#b3261e';
  });
  main.append(h('div', { class: 'hero' }, logoImg(64), h('div', {}, h('b', {}, brandName()), brandSub() ? h('small', {}, brandSub()) : null, h('div', { class: 'gold' }, (brand.data && brand.data.estd ? 'ESTD ' + brand.data.estd + ' · ' : '') + (ROLE_LABEL[p.role] || '').toUpperCase()))),
    h('h2', {}, 'Welcome, ' + p.full_name),
    h('div', { class: 'card' }, h('input', { type: 'search', placeholder: 'Search name, Family ID, Member ID, mobile… · खोजें', onfocus: () => (location.hash = 'registry') })),
    sup ? bk : null,
    SECTIONS.length > 1 ? tabs : null, body,
    h('p', { class: 'muted', style: 'text-align:center;font-size:12px;margin-top:18px' }, 'Chhipa One · ' + APP_VERSION));
}
