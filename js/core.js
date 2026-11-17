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
