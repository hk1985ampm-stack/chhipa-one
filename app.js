import { initOutbox, onOutbox, outbox, flush, kvGet, kvSet, isNetErr, cached } from './offline.js';
import { CONFIG } from './config.js';
import { lang, LANGS, setLang, nextLang, applyLang } from './i18n.js';
applyLang();
import { brand, loadBrand, logoImg, brandName, brandSub } from './brand.js';
import { sb, h, hi, state, toast, ROLE_LABEL, loadOptions, myLocations } from './core.js';
import { loadCustomFields } from './customfields.js';

const ROUTES = {
  '': () => import('./home.js'),
  locations: () => import('./locations.js'),
  staff: () => import('./staff.js'),
  audit: () => import('./audit.js'),
  registry: () => import('./registry.js'),
  add: () => import('./add.js'),
  communities: () => import('./communities.js'),
  card: () => import('./card.js'),
  notifications: () => import('./notifications.js'),
  family: () => import('./family.js'),
  events: () => import('./events.js'),
  lists: () => import('./lists.js'),
  excel: () => import('./excel.js'),
  backup: () => import('./backup.js'),
  reports: () => import('./reports.js'),
  tools: () => import('./tools.js'),
  requests: () => import('./requests.js'),
  activity: () => import('./activity.js'),
  print: () => import('./printcenter.js'),
  scan: () => import('./scanner.js'),
  reminders: () => import('./reminders.js'),
  donations: () => import('./donations.js'),
  zakat: () => import('./zakat.js'),
  meetings: () => import('./meetings.js'),
  sevaks: () => import('./sevaks.js'),
  announce: () => import('./announce.js'),
  cevents: () => import('./cevents.js'),
  reglinks: () => import('./reglinks.js'),
  idcard: () => import('./idcard.js'),
  staffcard: () => import('./staffcard.js'),
  myteam: () => import('./myteam.js')
};
const root = document.getElementById('app');

// ---- offline badge
const net = document.getElementById('net');
const netUpdate = () => (net.hidden = navigator.onLine);
addEventListener('online', netUpdate); addEventListener('offline', netUpdate); netUpdate();

// ---- idle auto sign-out
let idleT;
function armIdle() {
  clearTimeout(idleT);
  idleT = setTimeout(async () => { await sb.auth.signOut(); toast('Signed out after inactivity'); }, CONFIG.idleMinutes * 60000);
}
['click', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => state.profile && armIdle(), { passive: true }));

// ---- login
function loginView() {
  const email = h('input', { type: 'email', autocomplete: 'username', placeholder: 'name@example.com' });
  const pass = h('input', { type: 'password', autocomplete: 'current-password' });
  const err = h('div', { class: 'err' });
  const btn = h('button', { class: 'btn', style: 'width:100%;margin-top:16px' }, 'Sign in · लॉगिन');
  const go = async e => {
    e.preventDefault(); err.textContent = ''; btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
    btn.disabled = false;
    if (error) err.textContent = /rate|too many/i.test(error.message)
      ? 'Too many attempts. Please wait a few minutes.' : 'Email or password is incorrect.';
  };
  const signup = async () => {
    err.textContent = '';
    if (!email.value.trim() || pass.value.length < 8) return (err.textContent = 'Enter the invited email and a password of at least 8 characters.');
    btn.disabled = true; const { data, error } = await sb.auth.signUp({ email: email.value.trim(), password: pass.value }); btn.disabled = false;
    if (error) err.textContent = error.message; else if (!data.session) { err.className = 'ok'; err.textContent = 'Account created. Please confirm the email we sent you, then sign in.'; }
  };
  root.replaceChildren(h('div', { class: 'login' },
    h('div', { class: 'hero-login' }, logoImg(84), h('h1', {}, 'Chhipa One'), h('p', {}, brandName()), brandSub() ? h('small', {}, brandSub().toUpperCase()) : null),
    h('form', { class: 'card', onsubmit: go },
      h('label', {}, hi('Email', 'ईमेल')), email,
      h('label', {}, hi('Password', 'पासवर्ड')), pass, err, btn,
      h('p', { style: 'text-align:center;margin:14px 0 0' }, h('a', { href: '#', onclick: e => { e.preventDefault(); signup(); } }, 'First time? Create account (invited staff)')))));
}

function blockedView(msg) {
  root.replaceChildren(h('div', { class: 'login' }, h('h1', {}, 'Chhipa One'),
    h('div', { class: 'card' }, h('p', {}, msg),
      h('button', { class: 'btn alt', onclick: () => sb.auth.signOut() }, 'Sign out'))));
}

// ---- shell + router
let renderId = 0;
async function render() {
  const my = ++renderId;
  const [route, arg] = location.hash.replace(/^#\/?/, '').split('/');
  const loader = ROUTES[route] || ROUTES[''];
  const mod = await loader();
  if (my !== renderId) return;   // a newer navigation already started
  document.body.classList.toggle('idprint', route === 'idcard' || route === 'card' || route === 'staffcard');
  const main = h('main');
  root.replaceChildren(
    h('header', { class: 'bar' },
      route ? h('button', { onclick: () => (location.hash = '') }, '🏠 Home') : logoImg(40),
      route ? h('button', { class: 'backbtn', onclick: () => (history.length > 1 ? history.back() : (location.hash = '')) }, '← Back') : null,
      h('div', { class: 'ttl' }, h('h1', {}, 'Chhipa One'), brandSub() ? h('small', {}, brandSub().toUpperCase()) : null),
      h('span', { class: 'role' }, ROLE_LABEL[state.profile.role] + (state.profile.read_only ? ' · View only' : '')),
      h('button', { onclick: () => { setLang(nextLang()); render(); }, title: 'Language' }, LANGS.find(l => l[0] === lang.v)[1]),
      h('button', { onclick: () => sb.auth.signOut() }, hi('Sign out', 'साइन आउट'))),
    main,
    h('nav', { class: 'bnav noprint' }, [['', '🏠', 'Home', 'होम'], ['registry', '👨‍👩‍👧', 'Families', 'परिवार'], ...(state.profile.read_only ? [] : [['add', '➕', 'Add', 'जोड़ें']]), ['notifications', '🔔', 'Alerts', 'सूचना']].map(([r, i, t, hd]) =>
      h('a', { href: '#' + r, class: route === r ? 'on' : '' }, h('span', { class: 'ic' }, i), h('b', {}, hi(t, hd))))));
  try { await mod.render(main, arg); } catch (e) { main.replaceChildren(h('p', { class: 'err' }, 'Could not load this page. ' + (e.message || ''))); }
}

// Remember the registry on this phone so it opens without internet.
async function prefetch() {
  if (!navigator.onLine) return;
  try { await myLocations(); await cached('reg_all', () => sb.rpc('registry_search', { p_q: null, p_status: null })); } catch {}
}
document.getElementById('obx').addEventListener('click', () => flush());
onOutbox(n => { const b = document.getElementById('obx'); if (b) { b.hidden = !n; b.textContent = n + ' waiting to upload · ' + (navigator.onLine ? 'tap to retry' : 'no internet'); } });

// If an owner removes, suspends or re-roles this person, it takes effect on their phone at once.
let selfChan;
function watchSelf(uid, p0) {
  try { selfChan && sb.removeChannel(selfChan); selfChan = sb.channel('self-' + uid).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'user_id=eq.' + uid }, async ev => {
    const n = ev.new; if (n.status !== 'active') { toast('Your access was changed by the admin'); await sb.auth.signOut(); }
    else if (n.role !== p0.role || n.read_only !== p0.read_only) { toast('Your role was updated'); setTimeout(() => location.reload(), 800); } }).subscribe(); } catch {}
}
async function boot(session) {
  state.profile = null;
  const reg = /^#register\/([a-f0-9]{32})$/.exec(location.hash); if (reg) { await loadBrand(); const m = await import('./register.js'); return m.publicRegister(root, reg[1]); }
  if (!session) { await loadBrand(); return loginView(); }
  let { data, error } = await sb.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle();
  if (error && isNetErr(error)) { data = await kvGet('profile_' + session.user.id); error = data ? null : error; }
  else if (data) kvSet('profile_' + session.user.id, data);
  if (!error && !data && navigator.onLine) { const c = await sb.rpc('invite_claim'); if (c.data && c.data.claimed) { const r = await sb.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle(); data = r.data; } }
  if (error || !data) return blockedView('Your login is not yet activated. Please ask the Super Admin to add you as staff.');
  if (data.status !== 'active') return blockedView('Your account is ' + data.status + '. Please contact the Super Admin.');
  state.profile = data; armIdle(); watchSelf(session.user.id, data); await loadOptions(); loadCustomFields(); loadBrand().then(() => { if (!location.hash || location.hash === '#') render(); }); render(); initOutbox(); prefetch();
}

// Switching browser tabs makes Supabase re-announce the same session. Only react when the user really changes
// (sign-in or sign-out) so a half-filled form is never thrown away.
let curUid;   // undefined until the first auth event, so the first event always renders
sb.auth.onAuthStateChange((ev, session) => {
  const uid = session ? session.user.id : null;
  if (uid === curUid) return;
  curUid = uid; boot(session);
});
addEventListener('hashchange', () => { if (/^#register\//.test(location.hash)) return boot(null); state.profile && render(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
