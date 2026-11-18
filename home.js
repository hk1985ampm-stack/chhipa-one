import { sb, h, hi, state, ROLE_LABEL, isStateOrSuper } from './core.js';
import { lang, UR } from './i18n.js';
import { logoImg, brandName, brandSub, brand } from './brand.js';

const APP_VERSION = 'v24 · Team invites, photos & cards';
const tile = (href, en, hindi, soon, badge) =>
  h(soon ? 'div' : 'a', { class: 'tile' + (soon ? ' soon' : ''), href: soon ? null : href },
    h('span', { class: 'en' }, en), h('span', { class: 'hi' }, lang.v === 'ur' ? (UR[en] || hindi) : hindi), soon ? h('span', { class: 'tag' }, 'Coming in Phase ' + soon) : null, badge ? h('span', { class: 'badge' }, String(badge)) : null);

export async function render(main) {
  let unread = 0, pend = 0, lev = 0;
  try {
    const r = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false); unread = r.count || 0;
    if (['super_admin', 'location_admin'].includes(state.profile.role)) { const q = await sb.from('families').select('id', { count: 'exact', head: true }).eq('status', 'pending'); pend = q.count || 0; const le = await sb.from('life_events').select('id', { count: 'exact', head: true }).eq('status', 'pending'); lev = le.count || 0; }
  } catch {}
  const p = state.profile, sup = p.role === 'super_admin', appr = ['super_admin', 'location_admin'].includes(p.role);
  const SECTIONS = [
    ['families', ['👨‍👩‍👧 ', hi('Families', 'परिवार')], [
      tile('#registry', 'Family Registry', 'परिवार रजिस्टर'), p.read_only ? null : tile('#add', 'Add Family', 'परिवार जोड़ें'), p.read_only ? null : tile('#requests', 'Change Requests', 'बदलाव अनुरोध'),
      tile('#events', 'Life Events', 'जीवन घटनाएँ', false, lev), tile('#notifications', 'Notifications', 'सूचनाएँ', false, unread),
      tile('#reports', 'Reports', 'रिपोर्ट'), tile('#reports/quality', 'Data Quality', 'डेटा जाँच'),
      appr ? tile('#registry/removed', 'Removed Entries', 'हटाई गई प्रविष्टियाँ') : null]],
    ['welfare', ['💚 ', hi('Welfare', 'कल्याण')], [isStateOrSuper() ? tile('#donations', 'Annual Donation', 'वार्षिक चंदा') : null, tile('#zakat', 'Zakat Calculator', 'ज़कात कैलकुलेटर')]],
    ['community', ['🤝 ', hi('Community', 'समुदाय')], [tile('#announce', 'Announcements', 'घोषणाएँ'), tile('#cevents', 'Events', 'कार्यक्रम'), tile('#meetings', 'Meetings', 'बैठक'), tile('#sevaks', 'Sevaks', 'सेवक')]],
    ...(appr ? [['office', ['🏢 ', hi('Office', 'कार्यालय')], [
      tile('#registry/pending', 'Pending Approvals', 'लंबित स्वीकृति', false, pend),
      sup ? tile('#communities', 'Communities', 'समुदाय') : null, sup ? tile('#staff', 'Staff & Agents', 'स्टाफ / एजेंट') : tile('#myteam', 'My Team · assign', 'मेरी टीम'),
      tile('#activity', 'Agent Activity', 'एजेंट गतिविधि'), tile('#scan', 'Scan QR', 'क्यू आर स्कैन'), tile('#reglinks', 'Registration Links', 'पंजीकरण लिंक'), tile('#reminders', 'Birthdays & WhatsApp', 'रिमाइंडर'), (sup || p.can_export || ['location_admin'].includes(p.role)) ? tile('#print', 'Print Center', 'प्रिंट सेंटर') : null, tile('#excel', 'Excel Import / Export', 'एक्सेल'), tile('#tools', 'Duplicates & Bulk Edit', 'डुप्लिकेट / बल्क एडिट'), sup ? tile('#lists', 'Dropdown Lists', 'ड्रॉपडाउन सूची') : null, sup ? tile('#backup', 'Backup', 'बैकअप') : null, sup ? tile('#audit', 'Audit Log', 'ऑडिट लॉग') : null]]] : [])];
  let cur = sessionStorage.getItem('home_tab'); if (!SECTIONS.some(s => s[0] === cur)) cur = 'families';
  const body = h('div'), tabs = h('div', { class: 'chips' });
  const draw = () => {
    tabs.replaceChildren(...SECTIONS.map(([k, t]) => { const n = k === 'families' ? lev : k === 'office' ? pend : 0; return h('button', { class: 'btn tabb ' + (cur === k ? '' : 'alt'), onclick: () => { cur = k; sessionStorage.setItem('home_tab', k); draw(); } }, t, n ? h('span', { class: 'cbadge' }, String(n)) : null); }));
    body.replaceChildren(h('div', { class: 'grid' }, SECTIONS.find(s => s[0] === cur)[2].filter(Boolean)));
  };
  draw();
  const ann = h('div');
  { const t = new Date().toISOString().slice(0, 10); sb.from('announcements').select('title,body,pinned').lte('starts_on', t).or('ends_on.is.null,ends_on.gte.' + t).order('pinned', { ascending: false }).order('starts_on', { ascending: false }).limit(3).then(({ data }) => { if (data && data.length) ann.replaceChildren(...data.map(a => h('a', { href: '#announce', class: 'card ann' }, h('b', {}, (a.pinned ? '📌 ' : '📣 ') + a.title), a.body ? h('div', { class: 'muted' }, a.body.length > 120 ? a.body.slice(0, 120) + '…' : a.body) : null))); }); }
  const bk = h('a', { href: '#backup', class: 'card muted', style: 'display:block;font-size:13px' }, 'Backup: checking…');
  if (sup) sb.from('backup_log').select('kind,created_at').eq('status', 'ok').order('created_at', { ascending: false }).limit(1).then(({ data }) => {
    const d = data && data[0]; if (!d) { bk.textContent = '⚠ No backup yet — tap to take one'; bk.style.color = '#b3261e'; return; }
    const days = Math.floor((Date.now() - new Date(d.created_at)) / 864e5);
    bk.textContent = (days > 7 ? '⚠ ' : '✔ ') + 'Last backup: ' + (days === 0 ? 'today' : days + ' day(s) ago') + ' (' + d.kind + ')'; if (days > 7) bk.style.color = '#b3261e';
  });
  main.append(h('div', { class: 'hero' }, logoImg(64), h('div', {}, h('b', {}, brandName()), brandSub() ? h('small', {}, brandSub()) : null, h('div', { class: 'gold' }, (brand.data && brand.data.estd ? 'ESTD ' + brand.data.estd + ' · ' : '') + (ROLE_LABEL[p.role] || '').toUpperCase()))),
    h('h2', {}, hi('Welcome', 'स्वागत है'), ', ' + p.full_name),
    h('div', { class: 'card' }, h('input', { type: 'search', placeholder: 'Search name, ID, mobile… · खोजें', onfocus: () => (location.hash = 'registry') })),
    ann, sup ? bk : [],
    SECTIONS.length > 1 ? tabs : [], body,
    h('p', { class: 'muted', style: 'text-align:center;font-size:12px;margin-top:18px' }, 'Chhipa One · ' + APP_VERSION));
}
