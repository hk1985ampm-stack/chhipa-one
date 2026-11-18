import { lang, UR } from './i18n.js';
import { CONFIG } from './config.js';

export const sb = window.supabase.createClient(CONFIG.url, CONFIG.key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

// Tiny DOM helper. Text is always inserted as text (never HTML) so stored data can't inject scripts.
export function h(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'class') n.className = v;
    else if (k === 'value') n.value = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return n;
}
export const hi = (en, hindi) => [h('span', { class: 'en' }, en), ' ', h('small', { class: 'hi' }, lang.v === 'ur' ? (UR[en] || hindi) : hindi)];

let tt;
export function toast(msg) {
  const t = document.getElementById('toast');
  if (/approved|congrat/i.test(msg)) import('./ui.js').then(m => m.confetti()).catch(() => {});
  t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => (t.hidden = true), 3500);
}
export const friendly = e => (e && e.message) ? e.message.replace(/^.*?:\s*(?=No login|Only|You cannot)/, '') : 'Something went wrong';

export const ROLE_LABEL = {
  super_admin: 'Super Admin', state_admin: 'State Admin', location_admin: 'Location Admin', agent: 'Agent'
};
import { DEFAULTS } from './options.js';
export const state = { profile: null, opts: {} };

// ---- Phase 2 helpers
export const digits = s => (s || '').replace(/\D/g, '').slice(-10);
export const age = dob => {
  if (!dob) return '';
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
};
export const ageText = m => m.dob ? age(m.dob) + ' yrs' : m.birth_year_est ? '~' + (new Date().getFullYear() - m.birth_year_est) + ' yrs' : (m.age ? '~' + m.age + ' yrs' : '');
// Best-effort log of prints / downloads / exports (shown in the Activity log)
export const logAct = (action, what) => { try { Promise.resolve(sb.rpc('activity_note', { p_action: action, p_what: what })).catch(() => {}); } catch {} };
export const isStateOrSuper = () => state.profile.role === 'super_admin' || (state.profile.role === 'location_admin' && state.profile.title === 'State Admin');
export const isApprover = () => ['super_admin', 'location_admin'].includes(state.profile.role);
export const field = (label, el) => h('div', {}, h('label', {}, label), el);
export const pill = st => h('span', { class: 'pill ' + st }, st);
export async function myLocations() {
  const k = 'chhipa_locs_' + state.profile.user_id;   // remembered so Add Family also works without internet
  const r = state.profile.role === 'super_admin'
    ? await sb.from('locations').select('id,code,city').eq('status', 'active').order('city')
    : await sb.from('user_locations').select('locations(id,code,city,status)').eq('user_id', state.profile.user_id);
  if (r.error) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } }
  const list = state.profile.role === 'super_admin' ? (r.data || []) : (r.data || []).map(x => x.locations).filter(x => x && x.status !== 'archived');
  try { localStorage.setItem(k, JSON.stringify(list)); } catch {}
  return list;
}

// Managed dropdown lists (Super Admin edits them). Cached so forms still work offline.
export async function loadOptions() {
  try {
    const { data, error } = await sb.from('options').select('list_key,value,sort').eq('active', true).order('sort');
    if (!error && data) {
      const o = {}; data.forEach(r => (o[r.list_key] = o[r.list_key] || []).push(r.value));
      state.opts = o; localStorage.setItem('chhipa_opts', JSON.stringify(o)); return;
    }
  } catch {}
  try { state.opts = JSON.parse(localStorage.getItem('chhipa_opts')) || {}; } catch { state.opts = {}; }
}
export const optList = k => (state.opts[k] && state.opts[k].length ? state.opts[k] : DEFAULTS[k] || []);

// Native append/replaceChildren print "null"/"false" for empty slots; make them skip those, like h() does.
for (const m of ['append', 'prepend', 'replaceChildren']) {
  const orig = Element.prototype[m];
  Element.prototype[m] = function (...a) { return orig.apply(this, a.flat(Infinity).filter(x => x != null && x !== false)); };
}
