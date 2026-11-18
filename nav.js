// Left menu (burger): Dashboard on top, then every category as its own section. The section you are in is highlighted.
import { h, hi, state, isStateOrSuper } from './core.js';
import { logoImg, brandName } from './brand.js';

export function menuFor(p) {
  const sup = p.role === 'super_admin', appr = ['super_admin', 'location_admin'].includes(p.role), ro = p.read_only;
  const M = [
    ['families', '👨‍👩‍👧', 'Family Registry', 'परिवार रजिस्टर', [['#registry', 'Family Registry'], !ro && ['#add', 'Add Family'], !ro && ['#requests', 'Change Requests'], ['#events', 'Life Events'], ['#notifications', 'Notifications'], ['#reports', 'Reports'], ['#reports/quality', 'Data Quality'], appr && ['#inbox', 'Requests Inbox'], appr && ['#registry/removed', 'Removed Entries']]],
    appr && ['office', '🏢', 'Office', 'कार्यालय', [['#registry/pending', 'Pending Approvals'], sup && ['#communities', 'Communities'], sup ? ['#staff', 'Staff & Agents'] : ['#myteam', 'My Team'], ['#activity', 'Agent Activity'], ['#scan', 'Scan QR'], ['#reglinks', 'Registration Links'], ['#reminders', 'Birthdays & WhatsApp'], (sup || p.can_export || p.role === 'location_admin') && ['#print', 'Print Center'], ['#excel', 'Excel Import / Export'], ['#tools', 'Duplicates & Bulk Edit'], sup && ['#lists', 'Dropdown Lists'], sup && ['#backup', 'Backup'], sup && ['#audit', 'Audit Log']]],
    ['welfare', '💚', 'Welfare', 'कल्याण', [isStateOrSuper() && ['#donations', 'Annual Donation'], ['#zakat', 'Zakat Calculator']]],
    ['community', '🤝', 'Community', 'समुदाय', [['#announce', 'Announcements'], ['#cevents', 'Events'], ['#meetings', 'Meetings'], ['#sevaks', 'Sevaks'], ['#matrimony', 'Matrimony']]],
    ['settings', '⚙️', 'App Settings', 'ऐप सेटिंग', [['#appsettings', 'Theme, Font & Buttons'], ['#profile', 'My Profile & Photo']]],
  ].filter(Boolean);
  return M.map(m => [...m.slice(0, 4), m[4].filter(Boolean)]);
}
export const SECTION_ORDER = ['families', 'office', 'welfare', 'community', 'settings'];

const close = () => document.body.classList.remove('drawer-open');
export function openDrawer() {
  let d = document.getElementById('drawer'); if (d) d.remove();
  const here = location.hash || '#', p = state.profile, M = menuFor(p);
  const sec = M.find(m => m[4].some(i => i[0] === here)) || M[0], active = sec && sec[0];
  const item = i => h('a', { class: 'dr-item' + (i[0] === here ? ' on' : ''), href: i[0], onclick: close }, i[1]);
  d = h('div', { id: 'drawer', class: 'drawer' }, h('div', { class: 'dr-back', onclick: close }),
    h('aside', { class: 'dr-panel' },
      h('div', { class: 'dr-head' }, logoImg(40), h('div', {}, h('b', {}, 'Chhipa One'), h('small', {}, brandName())), h('button', { class: 'dr-x', onclick: close, 'aria-label': 'Close' }, '✕')),
      h('a', { class: 'dr-dash' + (here === '#dashboard' ? ' on' : ''), href: '#dashboard', onclick: close }, h('span', {}, '📊'), h('b', {}, 'Dashboard'), h('small', {}, 'डैशबोर्ड')),
      h('a', { class: 'dr-dash' + (here === '#' || here === '' ? ' on' : ''), href: '#', onclick: close }, h('span', {}, '🏠'), h('b', {}, 'Home'), h('small', {}, 'होम')),
      h('div', { class: 'dr-scroll' }, M.map(([k, ic, en, hd, items]) => h('section', { class: 'dr-sec' + (k === active ? ' open on' : '') },
        h('button', { class: 'dr-title', onclick: e => e.currentTarget.parentElement.classList.toggle('open') }, h('span', { class: 'dr-ic' }, ic), h('b', {}, en), h('small', {}, hd), h('i', { class: 'chev' }, '›')),
        h('div', { class: 'dr-items' }, items.map(item)))))));
  document.body.append(d); requestAnimationFrame(() => document.body.classList.add('drawer-open'));
}
