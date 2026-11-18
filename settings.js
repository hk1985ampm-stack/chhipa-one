// App Settings engine: theme, font, text size, button style, button animation.
// Order of priority: this person's own choice (saved on the device) > society default set by the Super Admin > built-in default.
import { sb } from './core.js';
export const THEMES = {
  porcelain: { n: 'Porcelain Ink', acc: '#1f2430', accL: '#596074', gold: '#b8975a', bg: '#f5f6f8', card: '#ffffff', tint: '#eef0f4', bd: '#e2e5ec', tx: '#1b1f29', mu: '#6b7280', hero: '#1f2430', onacc: '#ffffff' },
  emerald: { n: 'Emerald Noir', acc: '#0f4d40', accL: '#3f7f70', gold: '#b8975a', bg: '#f4f7f6', card: '#ffffff', tint: '#e8f0ed', bd: '#dce7e3', tx: '#17231f', mu: '#64746f', hero: '#0f4d40', onacc: '#ffffff' },
  sapphire: { n: 'Sapphire Ice', acc: '#233a7a', accL: '#5a74bd', gold: '#b8975a', bg: '#f5f7fb', card: '#ffffff', tint: '#e9eef8', bd: '#dde4f0', tx: '#171d30', mu: '#677089', hero: '#233a7a', onacc: '#ffffff' },
  rose: { n: 'Rose Quartz', acc: '#7e3a4e', accL: '#b27a89', gold: '#b8975a', bg: '#faf6f7', card: '#ffffff', tint: '#f3e9ec', bd: '#eadde1', tx: '#2a1c21', mu: '#7a6a6f', hero: '#7e3a4e', onacc: '#ffffff' },
  champagne: { n: 'Champagne', acc: '#7b5f23', accL: '#b39a5f', gold: '#a8842f', bg: '#fbf8f1', card: '#ffffff', tint: '#f4eedd', bd: '#ebe3cc', tx: '#2a2314', mu: '#7a705a', hero: '#3b2f14', onacc: '#ffffff' },
  obsidian: { n: 'Obsidian (dark)', dark: true, acc: '#5eead4', accL: '#7ef0de', gold: '#d6b46a', bg: '#0a0c10', card: '#12151b', tint: '#1a1e27', bd: '#252a35', tx: '#e9edf3', mu: '#8f9aad', hero: '#12151b', onacc: '#06201c' },
  indigo: { n: 'Midnight Indigo (dark)', dark: true, acc: '#8fa4ff', accL: '#aab9ff', gold: '#d6b46a', bg: '#090c1c', card: '#101532', tint: '#181e44', bd: '#242b5a', tx: '#e8ecff', mu: '#98a3d1', hero: '#101532', onacc: '#0b1030' },
};
export const FONTS = {
  futura: ['Futura (geometric)', '"Avenir Next","Century Gothic","Segoe UI",system-ui,"Noto Sans Devanagari",sans-serif', '"Avenir Next","Century Gothic","Segoe UI",system-ui,"Noto Sans Devanagari",sans-serif'],
  system: ['Modern', 'system-ui,-apple-system,"Segoe UI","Noto Sans","Noto Sans Devanagari",sans-serif', 'system-ui,-apple-system,"Segoe UI","Noto Sans Devanagari",sans-serif'],
  luxe: ['Luxe serif titles', 'system-ui,-apple-system,"Segoe UI","Noto Sans","Noto Sans Devanagari",sans-serif', '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Noto Serif Devanagari",serif'],
  rounded: ['Rounded', 'ui-rounded,"Nunito","Trebuchet MS","Noto Sans Devanagari",sans-serif', 'ui-rounded,"Nunito","Trebuchet MS","Noto Sans Devanagari",sans-serif'],
  classic: ['Classic serif', 'Georgia,"Times New Roman","Noto Serif Devanagari",serif', 'Georgia,"Times New Roman","Noto Serif Devanagari",serif'],
};
export const BSTYLES = { d3: '3D (raised)', glass: 'Glass', flat: 'Flat', outline: 'Outline' };
export const BANIMS = { lift: 'Lift on hover', shine: 'Shine sweep', pulse: 'Soft pulse', bounce: 'Bounce', none: 'None' };
export const DEFAULTS = { theme: 'porcelain', font: 'futura', size: 16, bstyle: 'd3', banim: 'lift', cards: 'soft', motion: 'on' };
const KEY = 'chhipa_ui', DKEY = 'chhipa_ui_def';
const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
export const hasOwn = () => !!read(KEY);
export const societyLook = () => read(DKEY) || {};
export const getSettings = () => ({ ...DEFAULTS, ...societyLook(), ...(read(KEY) || {}) });
export const saveSettings = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} applySettings(s); };
export const useSocietyLook = () => { try { localStorage.removeItem(KEY); } catch {} applySettings(); };
// fetch the Super Admin's default (works before sign-in too) and apply it unless the person chose their own look
export async function syncSocietyLook() {
  try { const { data } = await sb.rpc('app_setting_get', { p_key: 'look' }); try { localStorage.setItem(DKEY, JSON.stringify(data || {})); } catch {} if (!hasOwn()) applySettings(); } catch {}
}
export const saveSocietyLook = async s => sb.rpc('app_setting_set', { p_key: 'look', p_value: s ? { theme: s.theme, font: s.font, size: s.size, bstyle: s.bstyle, banim: s.banim, cards: s.cards, motion: s.motion } : {} }).then(r => { if (!r.error) { try { localStorage.setItem(DKEY, JSON.stringify(s || {})); } catch {} } return r; });
export function applySettings(s = getSettings()) {
  const t = THEMES[s.theme] || THEMES.porcelain, r = document.documentElement, set = (k, v) => r.style.setProperty(k, v);
  set('--c2', t.acc); set('--c1', t.accL); set('--c1m', t.acc); set('--c3', t.gold); set('--gold', t.gold); set('--g', t.acc); set('--c2d', t.dark ? '#000000' : 'rgba(0,0,0,.45)'); set('--c1l', t.tint);
  set('--g2', t.tint); set('--bg', t.bg); set('--card', t.card); set('--tx', t.tx); set('--mu', t.mu); set('--bd', t.bd); set('--hero', t.hero); set('--onacc', t.onacc);
  const f = FONTS[s.font] || FONTS.futura; set('--font', f[1]); set('--hfont', f[2]); set('--fs', (s.size || 16) + 'px');
  r.classList.toggle('dark', !!t.dark);
  ['bs-d3', 'bs-glass', 'bs-flat', 'bs-outline'].forEach(c => r.classList.remove(c)); r.classList.add('bs-' + (s.bstyle || 'd3'));
  ['ba-lift', 'ba-shine', 'ba-pulse', 'ba-bounce', 'ba-none'].forEach(c => r.classList.remove(c)); r.classList.add('ba-' + (s.banim || 'lift'));
  r.classList.toggle('cards-sharp', s.cards === 'sharp'); r.classList.toggle('no-motion', s.motion === 'off');
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t.bg;
}
