// App Settings engine: theme, font, text size, button style, button animation.
// Order of priority: this person's own choice (saved on the device) > society default set by the Super Admin > built-in default.
import { sb } from './core.js';
export const THEMES = {
  pearl: { n: 'Pearl & Gold', c1: '#2f8f83', c2: '#1f6f66', c3: '#c9a227', gold: '#c9a227', bg: '#f7faf8', tint: '#e8f4f1' },
  rosegold: { n: 'Rose Gold', c1: '#d98b95', c2: '#b4596a', c3: '#d4a24c', gold: '#d4a24c', bg: '#fdf6f6', tint: '#fbe9ec' },
  sapphire: { n: 'Royal Sapphire', c1: '#5b7fd6', c2: '#3452a8', c3: '#c9a227', gold: '#c9a227', bg: '#f5f8fe', tint: '#e6edfb' },
  champagne: { n: 'Champagne', c1: '#d2a94a', c2: '#a8791f', c3: '#2f8f83', gold: '#b8892b', bg: '#fdfaf2', tint: '#f8efd6' },
  lavender: { n: 'Lavender Mist', c1: '#9a86dc', c2: '#6b55b8', c3: '#d4a24c', gold: '#d4a24c', bg: '#f9f7fe', tint: '#eee9fb' },
  sage: { n: 'Sage & Sand', c1: '#7fa883', c2: '#4f7d58', c3: '#c6a15b', gold: '#c6a15b', bg: '#f8faf5', tint: '#eaf2e6' },
  peach: { n: 'Peach Blossom', c1: '#ee9b7b', c2: '#cf6a49', c3: '#2f8f83', gold: '#d9a441', bg: '#fff8f4', tint: '#fde9df' },
  midnight: { n: 'Midnight Luxe (dark)', c1: '#4fb3a5', c2: '#2c7f75', c3: '#e0b84f', gold: '#e0b84f', dark: true, bg: '#0e1424', tint: '#1b2640' },
};
export const FONTS = {
  system: ['Modern', 'system-ui,-apple-system,"Segoe UI","Noto Sans","Noto Sans Devanagari",sans-serif', 'system-ui,-apple-system,"Segoe UI","Noto Sans Devanagari",sans-serif'],
  luxe: ['Luxe serif titles', 'system-ui,-apple-system,"Segoe UI","Noto Sans","Noto Sans Devanagari",sans-serif', '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Noto Serif Devanagari",serif'],
  rounded: ['Rounded', 'ui-rounded,"Nunito","Trebuchet MS","Noto Sans Devanagari",sans-serif', 'ui-rounded,"Nunito","Trebuchet MS","Noto Sans Devanagari",sans-serif'],
  classic: ['Classic serif', 'Georgia,"Times New Roman","Noto Serif Devanagari",serif', 'Georgia,"Times New Roman","Noto Serif Devanagari",serif'],
  clean: ['Clean', '"Segoe UI",Tahoma,Verdana,"Noto Sans Devanagari",sans-serif', '"Segoe UI",Tahoma,Verdana,"Noto Sans Devanagari",sans-serif'],
};
export const BSTYLES = { d3: '3D (raised)', glass: 'Glass', flat: 'Flat', outline: 'Outline' };
export const BANIMS = { lift: 'Lift on hover', shine: 'Shine sweep', pulse: 'Soft pulse', bounce: 'Bounce', none: 'None' };
export const DEFAULTS = { theme: 'pearl', font: 'luxe', size: 16, bstyle: 'd3', banim: 'shine', cards: 'soft', motion: 'on' };
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
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (h, w, to = '#ffffff') => { const a = hex(h), b = hex(to); return toHex(a.map((v, i) => v + (b[i] - v) * w)); };
export function applySettings(s = getSettings()) {
  const t = THEMES[s.theme] || THEMES.pearl, r = document.documentElement, set = (k, v) => r.style.setProperty(k, v);
  set('--c1', t.c1); set('--c2', t.c2); set('--c3', t.c3); set('--gold', t.gold); set('--c2d', mix(t.c2, .35, '#000000')); set('--c1l', mix(t.c1, .9)); set('--c1m', mix(t.c2, .22));
  set('--g', t.c2); set('--g2', t.tint); set('--bg', t.bg);
  const f = FONTS[s.font] || FONTS.luxe; set('--font', f[1]); set('--hfont', f[2]); set('--fs', (s.size || 16) + 'px');
  r.classList.toggle('dark', !!t.dark);
  if (t.dark) { set('--card', '#16203a'); set('--tx', '#eef2fb'); set('--mu', '#a6b3cc'); set('--bd', '#2a3857'); }
  else { set('--card', '#ffffff'); set('--tx', '#26322f'); set('--mu', '#62726d'); set('--bd', mix(t.c1, .8)); }
  ['bs-d3', 'bs-glass', 'bs-flat', 'bs-outline'].forEach(c => r.classList.remove(c)); r.classList.add('bs-' + (s.bstyle || 'd3'));
  ['ba-lift', 'ba-shine', 'ba-pulse', 'ba-bounce', 'ba-none'].forEach(c => r.classList.remove(c)); r.classList.add('ba-' + (s.banim || 'shine'));
  r.classList.toggle('cards-sharp', s.cards === 'sharp'); r.classList.toggle('no-motion', s.motion === 'off');
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t.bg;
}
