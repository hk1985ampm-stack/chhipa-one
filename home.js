import { sb, h, hi, state } from './core.js';

const APP_VERSION = 'v9 · Phase 6 Offline';
const tile = (href, en, hindi, soon, badge) =>
  h(soon ? 'div' : 'a', { class: 'tile' + (soon ? ' soon' : ''), href: soon ? null : href },
    h('span', {}, en), h('span', { class: 'hi' }, hindi), soon ? h('span', { class: 'tag' }, 'Coming in Phase ' + soon) : null, badge ? h('span', { class: 'badge' }, String(badge)) : null);

export async function render(main) {
  let unread = 0, pend = 0;
  try {
    const r = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false); unread = r.count || 0;
    if (['super_admin', 'location_admin'].includes(state.profile.role)) { const q = await sb.from('families').select('id', { count: 'exact', head: true }).eq('status', 'pending'); pend = q.count || 0; }
  } catch {}
  const p = state.profile, sup = p.role === 'super_admin';
  main.append(
    h('h2', {}, 'Welcome, ' + p.full_name),
    h('div', { class: 'card' }, h('input', { type: 'search', placeholder: 'Search name, Family ID, Member ID, mobile… · खोजें', onfocus: () => (location.hash = 'registry') }),
      h('div', { class: 'muted', style: 'margin-top:6px;font-size:14px' }, 'Tap Family Registry to search.')),
    h('div', { class: 'grid' },
      tile('#registry', 'Family Registry', 'परिवार रजिस्टर'),
      tile('#add', 'Add Family', 'परिवार जोड़ें'),
      ['super_admin', 'location_admin'].includes(p.role) ? tile('#registry/pending', 'Pending Approvals', 'लंबित स्वीकृति', false, pend) : null,
      tile('#notifications', 'Notifications', 'सूचनाएँ', false, unread),
      tile('#events', 'Life Events', 'जीवन घटनाएँ'),
      sup ? tile('#communities', 'Communities', 'समुदाय') : null,
      sup ? tile('#lists', 'Dropdown Lists', 'ड्रॉपडाउन सूची') : null,
      sup ? tile('#staff', 'Staff & Agents', 'स्टाफ / एजेंट') : null,
      sup ? tile('#audit', 'Audit Log', 'ऑडिट लॉग') : null),
    h('p', { class: 'muted', style: 'text-align:center;font-size:12px;margin-top:18px' }, 'Chhipa One · ' + APP_VERSION));
}
