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
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return n;
}
export const hi = (en, hindi) => [en, ' ', h('small', { class: 'hi' }, hindi)];

let tt;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => (t.hidden = true), 3500);
}
export const friendly = e => (e && e.message) ? e.message.replace(/^.*?:\s*(?=No login|Only|You cannot)/, '') : 'Something went wrong';

export const ROLE_LABEL = {
  super_admin: 'Super Admin', state_admin: 'State Admin', location_admin: 'Location Admin', agent: 'Agent'
};
export const state = { profile: null };

// ---- Phase 2 helpers
export const digits = s => (s || '').replace(/\D/g, '').slice(-10);
export const age = dob => {
  if (!dob) return '';
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
};
export const isApprover = () => ['super_admin', 'location_admin'].includes(state.profile.role);
export const field = (label, el) => h('div', {}, h('label', {}, label), el);
export const pill = st => h('span', { class: 'pill ' + st }, st);
export async function myLocations() {
  if (state.profile.role === 'super_admin') {
    const { data } = await sb.from('locations').select('id,code,city').order('city'); return data || [];
  }
  const { data } = await sb.from('user_locations').select('locations(id,code,city)').eq('user_id', state.profile.user_id);
  return (data || []).map(x => x.locations).filter(Boolean);
}
