// App Settings engine: theme, font, text size, button style, button animation. Saved on this device (localStorage), applied at start.
export const THEMES = {
  emerald: { n: 'Emerald', c1: '#10b981', c2: '#0f766e', c3: '#2563eb' },
  royal: { n: 'Royal Blue', c1: '#60a5fa', c2: '#1d4ed8', c3: '#7c3aed' },
  sunset: { n: 'Sunset', c1: '#fbbf24', c2: '#ea580c', c3: '#db2777' },
  violet: { n: 'Violet', c1: '#a78bfa', c2: '#7c3aed', c3: '#db2777' },
  rose: { n: 'Rose', c1: '#fb7185', c2: '#e11d48', c3: '#9333ea' },
  ocean: { n: 'Ocean', c1: '#22d3ee', c2: '#0e7490', c3: '#2563eb' },
  gold: { n: 'Royal Gold', c1: '#facc15', c2: '#a16207', c3: '#15803d' },
  midnight: { n: 'Midnight (dark)', c1: '#34d399', c2: '#0f766e', c3: '#6366f1', dark: true },
};
export const FONTS = {
  system: ['Default', 'system-ui,-apple-system,"Segoe UI","Noto Sans","Noto Sans Devanagari",sans-serif'],
  rounded: ['Rounded', 'ui-rounded,"Nunito","Trebuchet MS","Noto Sans Devanagari",sans-serif'],
  classic: ['Classic', 'Georgia,"Times New Roman","Noto Serif Devanagari",serif'],
  clean: ['Clean', '"Segoe UI",Tahoma,Verdana,"Noto Sans Devanagari",sans-serif'],
  elegant: ['Elegant', '"Palatino Linotype",Palatino,"Book Antiqua","Noto Serif Devanagari",serif'],
};
export const BSTYLES = { d3: '3D (raised)', glass: 'Glass', flat: 'Flat', outline: 'Outline' };
export const BANIMS = { lift: 'Lift on hover', shine: 'Shine sweep', pulse: 'Soft pulse', bounce: 'Bounce', none: 'None' };
export const DEFAULTS = { theme: 'emerald', font: 'system', size: 16, bstyle: 'd3', banim: 'lift', cards: 'soft', motion: 'on' };
const KEY = 'chhipa_ui';
export const getSettings = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; } };
export const saveSettings = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} applySettings(s); };
const shade = (hex, p) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * (1 + p)))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };
const mix = (hex, w) => { const n = parseInt(hex.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * w).toString(16).padStart(2, '0')).join(''); };
export function applySettings(s = getSettings()) {
  const t = THEMES[s.theme] || THEMES.emerald, r = document.documentElement, b = document.body;
  const set = (k, v) => r.style.setProperty(k, v);
  set('--c1', t.c1); set('--c2', t.c2); set('--c3', t.c3); set('--c2d', shade(t.c2, -.32)); set('--c1l', mix(t.c1, .88));
  set('--g', t.c2); set('--g2', t.dark ? '#16302b' : mix(t.c1, .9));
  set('--font', (FONTS[s.font] || FONTS.system)[1]); set('--fs', (s.size || 16) + 'px');
  const dark = !!t.dark; r.classList.toggle('dark', dark);
  if (dark) { set('--bg', '#0b1220'); set('--card', '#141c2e'); set('--tx', '#e8eef7'); set('--mu', '#9fb0c7'); set('--bd', '#26324a'); }
  else ['--bg', '--card', '--tx', '--mu', '--bd'].forEach(k => r.style.removeProperty(k));
  ['bs-d3', 'bs-glass', 'bs-flat', 'bs-outline'].forEach(c => r.classList.remove(c)); r.classList.add('bs-' + (s.bstyle || 'd3'));
  ['ba-lift', 'ba-shine', 'ba-pulse', 'ba-bounce', 'ba-none'].forEach(c => r.classList.remove(c)); r.classList.add('ba-' + (s.banim || 'lift'));
  r.classList.toggle('cards-sharp', s.cards === 'sharp'); r.classList.toggle('no-motion', s.motion === 'off');
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t.c2;
}
