// Custom member details added by Super Admin (Office → Dropdown lists → Custom details). Values are stored in members.extra.
import { sb, h, state, optList } from './core.js';
import { selectOther } from './memberform.js';

export async function loadCustomFields() {
  try { const { data, error } = await sb.from('custom_fields').select('*').eq('active', true).order('sort'); if (!error && data) { state.cf = data; localStorage.setItem('chhipa_cf', JSON.stringify(data)); return; } } catch {}
  try { state.cf = JSON.parse(localStorage.getItem('chhipa_cf')) || []; } catch { state.cf = []; }
}
export const cfList = () => state.cf || [];
// Fields for the add/edit member form. read() returns { cf_key: value }
export function cfBlock(values = {}) {
  const fs = cfList(); if (!fs.length) return { el: null, read: () => undefined };
  const g = {};
  const el = h('div', { class: 'card cf-block' }, h('b', {}, 'More details · अन्य जानकारी'), fs.map(f => {
    let inp;
    if (f.kind === 'list') { inp = selectOther(optList(f.list_key), values[f.fkey] || ''); g[f.fkey] = () => inp.get(); }
    else { const i = h('input', { type: f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text', value: values[f.fkey] || '' }); g[f.fkey] = () => i.value.trim(); inp = { el: i }; }
    return h('div', {}, h('label', {}, f.label), inp.el); }));
  return { el, read: () => Object.fromEntries(Object.entries(g).map(([k, fn]) => [k, fn()])) };
}
export const cfSummary = m => cfList().map(f => m.extra && m.extra[f.fkey] ? f.label + ': ' + m.extra[f.fkey] : null).filter(Boolean);
