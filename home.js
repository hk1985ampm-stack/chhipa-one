import { sb, h, hi, state, ROLE_LABEL, isStateOrSuper } from './core.js';
import { lang, UR } from './i18n.js';
import { sortable, installCard, countUp, barChart, donut } from './ui.js';
import { logoImg, brandName, brandSub, brand } from './brand.js';

const APP_VERSION = 'v28 · Premium themes, side rail, dashboard';
const tile = (href, en, hindi, soon, badge) =>
  h(soon ? 'div' : 'a', { class: 'tile' + (soon ? ' soon' : ''), href: soon ? null : href },
    h('span', { class: 'en' }, en), h('span', { class: 'hi' }, lang.v === 'ur' ? (UR[en] || hindi) : hindi), soon ? h('span', { class: 'tag' }, 'Coming in Phase ' + soon) : null, badge ? h('span', { class: 'badge' }, String(badge)) : null);

async function fileCheck() {
  const miss = [];
  for (const f of ['auth.js', 'profile.js', 'inbox.js', 'settings.js', 'appsettings.js', 'decorate.js', 'ui.js', 'modern.css']) { try { const r = await fetch(f, { cache: 'no-cache' }); if (!r.ok) miss.push(f); } catch {} }
  try { const t = await (await fetch('app.js', { cache: 'no-cache' })).text(); if (!t.includes('appsettings')) miss.push('app.js (old copy)'); } catch {}
  return miss;
}
function dashboard(p, lev, pend) {
  const box = h('div', { class: 'dash' }), nums = h('div', { class: 'kpis' }), charts = h('div', { class: 'charts' });
  const kpi = (ic, label, v, href, cls) => { const n = h('b', {}, '0'); const el = h('a', { class: 'kpi ' + cls, href }, h('span', { class: 'ki' }, ic), h('div', {}, n, h('small', {}, label))); setTimeout(() => countUp(n, v), 120); return el; };
  const cnt = (t, f) => { let q = sb.from(t).select('id', { count: 'exact', head: true }); if (f) q = f(q); return q.then(r => r.count || 0, () => 0); };
  box.append(nums, charts);
  nums.append(...[1, 2, 3, 4].map(() => h('div', { class: 'kpi skl' })));
  const six = new Date(); six.setDate(1); six.setMonth(six.getMonth() - 5);
  Promise.all([cnt('families', q => q.eq('status', 'approved')), cnt('members', q => q.eq('status', 'active')), cnt('members', q => q.eq('status', 'active').eq('gender', 'male')), cnt('members', q => q.eq('status', 'active').eq('gender', 'female')),
    sb.from('families').select('created_at').gte('created_at', six.toISOString()).limit(3000).then(r => r.data || [], () => [])]).then(([fam, mem, men, wom, rows]) => {
    nums.replaceChildren(kpi('👨‍👩‍👧', 'Families', fam, '#registry', 'k1'), kpi('🧑‍🤝‍🧑', 'Members', mem, '#registry', 'k2'), kpi('⏳', 'Pending', pend, '#registry/pending', 'k3'), kpi('🎉', 'Life events', lev, '#events', 'k4'));
    const labs = [], vals = []; for (let k = 0; k < 6; k++) { const d = new Date(six.getFullYear(), six.getMonth() + k, 1); labs.push(d.toLocaleString('en', { month: 'short' })); vals.push(rows.filter(r => { const c = new Date(r.created_at); return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear(); }).length); }
    charts.replaceChildren(h('div', { class: 'card' }, h('b', {}, 'New families · 6 months'), barChart(vals, labs)), h('div', { class: 'card' }, h('b', {}, 'Members'), donut([{ n: 'Men', v: men, c: 'var(--c2)' }, { n: 'Women', v: wom, c: 'var(--gold)' }, { n: 'Other', v: Math.max(0, mem - men - wom), c: 'var(--c1)' }])));
  });
  return box;
}
export async function render(main) {
  main.classList.add('has-rail');
  let unread = 0, pend = 0, lev = 0, inb = 0;
  try {
    const r = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false); unread = r.count || 0;
    if (['super_admin', 'location_admin'].includes(state.profile.role)) { const q = await sb.from('families').select('id', { count: 'exact', head: true }).eq('status', 'pending'); pend = q.count || 0; const le = await sb.from('life_events').select('id', { count: 'exact', head: true }).eq('status', 'pending'); lev = le.count || 0; }
    if (['super_admin', 'location_admin'].includes(state.profile.role)) { const hc = await sb.rpc('hub_counts'); const pc = await sb.from('members').select('id', { count: 'exact', head: true }).not('photo_pending', 'is', null); inb = ((hc.data || {}).pwd || 0) + ((hc.data || {}).access || 0) + (pc.count || 0); }
  } catch {}
  const p = state.profile, sup = p.role === 'super_admin', appr = ['super_admin', 'location_admin'].includes(p.role);
  const SECTIONS = [
    ['families', ['👨‍👩‍👧 ', hi('Families', 'परिवार')], [
      tile('#registry', 'Family Registry', 'परिवार रजिस्टर'), p.read_only ? null : tile('#add', 'Add Family', 'परिवार जोड़ें'), p.read_only ? null : tile('#requests', 'Change Requests', 'बदलाव अनुरोध'),
      tile('#events', 'Life Events', 'जीवन घटनाएँ', false, lev), tile('#notifications', 'Notifications', 'सूचनाएँ', false, unread),
      tile('#reports', 'Reports', 'रिपोर्ट'), tile('#reports/quality', 'Data Quality', 'डेटा जाँच'),
      appr ? tile('#inbox', 'Requests Inbox', 'अनुरोध इनबॉक्स', false, inb) : null,
      appr ? tile('#registry/removed', 'Removed Entries', 'हटाई गई प्रविष्टियाँ') : null]],
    ['welfare', ['💚 ', hi('Welfare', 'कल्याण')], [isStateOrSuper() ? tile('#donations', 'Annual Donation', 'वार्षिक चंदा') : null, tile('#zakat', 'Zakat Calculator', 'ज़कात कैलकुलेटर')]],
    ['settings', ['⚙️ ', hi('App Settings', 'ऐप सेटिंग')], [tile('#appsettings', 'Theme, Font & Buttons', 'थीम, फ़ॉन्ट, बटन'), tile('#profile', 'My Profile & Photo', 'मेरी प्रोफ़ाइल')]],
    ['community', ['🤝 ', hi('Community', 'समुदाय')], [tile('#announce', 'Announcements', 'घोषणाएँ'), tile('#cevents', 'Events', 'कार्यक्रम'), tile('#meetings', 'Meetings', 'बैठक'), tile('#sevaks', 'Sevaks', 'सेवक')]],
    ...(appr ? [['office', ['🏢 ', hi('Office', 'कार्यालय')], [
      tile('#registry/pending', 'Pending Approvals', 'लंबित स्वीकृति', false, pend),
      sup ? tile('#communities', 'Communities', 'समुदाय') : null, sup ? tile('#staff', 'Staff & Agents', 'स्टाफ / एजेंट') : tile('#myteam', 'My Team · assign', 'मेरी टीम'),
      tile('#activity', 'Agent Activity', 'एजेंट गतिविधि'), tile('#scan', 'Scan QR', 'क्यू आर स्कैन'), tile('#reglinks', 'Registration Links', 'पंजीकरण लिंक'), tile('#reminders', 'Birthdays & WhatsApp', 'रिमाइंडर'), (sup || p.can_export || ['location_admin'].includes(p.role)) ? tile('#print', 'Print Center', 'प्रिंट सेंटर') : null, tile('#excel', 'Excel Import / Export', 'एक्सेल'), tile('#tools', 'Duplicates & Bulk Edit', 'डुप्लिकेट / बल्क एडिट'), sup ? tile('#lists', 'Dropdown Lists', 'ड्रॉपडाउन सूची') : null, sup ? tile('#backup', 'Backup', 'बैकअप') : null, sup ? tile('#audit', 'Audit Log', 'ऑडिट लॉग') : null]]] : [])];
  let cur = sessionStorage.getItem('home_tab'); if (!SECTIONS.some(s => s[0] === cur)) cur = 'families';
  const body = h('div'), tabs = h('nav', { class: 'rail noprint', title: 'Hold and drag to re-order' });
  let order = []; try { order = JSON.parse(localStorage.getItem('chhipa_rail') || '[]'); } catch {}
  const ordered = () => [...SECTIONS].sort((a, b) => { const x = order.indexOf(a[0]), y = order.indexOf(b[0]); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
  const draw = () => {
    tabs.replaceChildren(...ordered().map(([k, t], i) => { const n = k === 'families' ? lev : k === 'office' ? pend : 0; return h('button', { class: 'rail-item' + (cur === k ? ' on' : ''), 'data-k': k, style: '--d:' + (i * 0.05) + 's', onclick: () => { cur = k; sessionStorage.setItem('home_tab', k); draw(); } },
      h('span', { class: 'ri' }, String(t[0]).trim()), h('span', { class: 'rl' }, t[1]), n ? h('span', { class: 'cbadge' }, String(n)) : null); }));
    const sec = SECTIONS.find(s => s[0] === cur);
    body.replaceChildren(h('h3', { class: 'sec-t' }, sec[1]), h('div', { class: 'grid' }, sec[2].filter(Boolean)));
  };
  sortable(tabs, '.rail-item', () => { order = [...tabs.querySelectorAll('.rail-item')].map(b => b.dataset.k); try { localStorage.setItem('chhipa_rail', JSON.stringify(order)); } catch {} });
  draw();
  const ann = h('div');
  { const t = new Date().toISOString().slice(0, 10); sb.from('announcements').select('title,body,pinned').lte('starts_on', t).or('ends_on.is.null,ends_on.gte.' + t).order('pinned', { ascending: false }).order('starts_on', { ascending: false }).limit(3).then(({ data }) => { if (data && data.length) ann.replaceChildren(...data.map(a => h('a', { href: '#announce', class: 'card ann' }, h('b', {}, (a.pinned ? '📌 ' : '📣 ') + a.title), a.body ? h('div', { class: 'muted' }, a.body.length > 120 ? a.body.slice(0, 120) + '…' : a.body) : null))); }); }
  const chk = h('div'); if (sup) fileCheck().then(m => m.length && chk.replaceChildren(h('div', { class: 'card err' }, '⚠ These files are missing or old on your website: ' + m.join(', ') + '. Upload ALL files from the latest zip again (replace existing), then reopen the app.')));
  const bk = h('a', { href: '#backup', class: 'card muted', style: 'display:block;font-size:13px' }, 'Backup: checking…');
  if (sup) sb.from('backup_log').select('kind,created_at').eq('status', 'ok').order('created_at', { ascending: false }).limit(1).then(({ data }) => {
    const d = data && data[0]; if (!d) { bk.textContent = '⚠ No backup yet — tap to take one'; bk.style.color = '#b3261e'; return; }
    const days = Math.floor((Date.now() - new Date(d.created_at)) / 864e5);
    bk.textContent = (days > 7 ? '⚠ ' : '✔ ') + 'Last backup: ' + (days === 0 ? 'today' : days + ' day(s) ago') + ' (' + d.kind + ')'; if (days > 7) bk.style.color = '#b3261e';
  });
  main.append(h('div', { class: 'hero' }, logoImg(64), h('div', {}, h('b', {}, brandName()), brandSub() ? h('small', {}, brandSub()) : null, h('div', { class: 'gold' }, (brand.data && brand.data.estd ? 'ESTD ' + brand.data.estd + ' · ' : '') + (ROLE_LABEL[p.role] || '').toUpperCase()))),
    h('h2', {}, hi('Welcome', 'स्वागत है'), ', ' + p.full_name),
    h('div', { class: 'card' }, h('input', { type: 'search', placeholder: 'Search name, ID, mobile… · खोजें', onfocus: () => (location.hash = 'registry') })),
    p.photo ? [] : h('a', { href: '#profile', class: 'card photo-nag' }, '📷 Please add your photo — it is printed on your ID card. Tap here.'),
    installCard() || [], ann, sup ? bk : [], chk, dashboard(p, lev, pend),
    SECTIONS.length > 1 ? tabs : [], body,
    h('p', { class: 'muted', style: 'text-align:center;font-size:12px;margin-top:18px' }, 'Chhipa One · ' + APP_VERSION));
}
