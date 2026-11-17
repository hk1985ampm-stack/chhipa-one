import { sb, h, hi, state } from './core.js';

const APP_VERSION = 'v10 · Remove / Edit / Tabs';
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
      appr ? tile('#registry/removed', 'Removed Entries', 'हटाई गई प्रविष्टियाँ') : null]],
    ...(appr ? [['office', '🏢 Office', [
      tile('#registry/pending', 'Pending Approvals', 'लंबित स्वीकृति', false, pend),
      sup ? tile('#communities', 'Communities', 'समुदाय') : null, sup ? tile('#staff', 'Staff & Agents', 'स्टाफ / एजेंट') : null,
      sup ? tile('#lists', 'Dropdown Lists', 'ड्रॉपडाउन सूची') : null, sup ? tile('#audit', 'Audit Log', 'ऑडिट लॉग') : null]]] : [])];
  let cur = sessionStorage.getItem('home_tab'); if (!SECTIONS.some(s => s[0] === cur)) cur = 'families';
  const body = h('div'), tabs = h('div', { class: 'chips' });
  const draw = () => {
    tabs.replaceChildren(...SECTIONS.map(([k, t]) => h('button', { class: 'btn ' + (cur === k ? '' : 'alt'), onclick: () => { cur = k; sessionStorage.setItem('home_tab', k); draw(); } }, t)));
    body.replaceChildren(h('div', { class: 'grid' }, SECTIONS.find(s => s[0] === cur)[2].filter(Boolean)));
  };
  draw();
  main.append(h('h2', {}, 'Welcome, ' + p.full_name),
    h('div', { class: 'card' }, h('input', { type: 'search', placeholder: 'Search name, Family ID, Member ID, mobile… · खोजें', onfocus: () => (location.hash = 'registry') })),
    SECTIONS.length > 1 ? tabs : null, body,
    h('p', { class: 'muted', style: 'text-align:center;font-size:12px;margin-top:18px' }, 'Chhipa One · ' + APP_VERSION));
}
