// App Settings: theme, font, text size, button style and animation (saved on this device)
import { h, hi, toast, state, friendly } from './core.js';
import { THEMES, FONTS, BSTYLES, BANIMS, getSettings, saveSettings, useSocietyLook, saveSocietyLook, hasOwn, societyLook } from './settings.js';

export async function render(main) {
  let s = getSettings();
  const set = (k, v) => { s = { ...s, [k]: v }; saveSettings(s); draw(); };
  const chips = (obj, key, label) => h('div', { class: 'chips' }, Object.entries(obj).map(([k, v]) => h('button', { class: 'btn sm ' + (s[key] === k ? '' : 'alt'), onclick: () => set(key, k) }, label(v))));
  const draw = () => main.replaceChildren(
    h('h2', {}, '⚙️ ', hi('App Settings', 'ऐप सेटिंग')), h('p', { class: 'muted s' }, 'Saved on this phone / computer. Each person can choose their own look.'),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '🎨 Theme · थीम'),
      h('div', { class: 'themes' }, Object.entries(THEMES).map(([k, t]) => h('button', { class: 'theme' + (s.theme === k ? ' on' : ''), onclick: () => set('theme', k), style: `background:linear-gradient(135deg,${t.c1},${t.c2} 60%,${t.c3})` }, h('span', {}, t.n))))),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '🔤 Font · फ़ॉन्ट'), chips(FONTS, 'font', v => v[0]),
      h('label', {}, 'Text size · ' + s.size + ' px'), h('input', { type: 'range', min: 14, max: 20, step: 1, value: s.size, oninput: e => { s = { ...s, size: +e.target.value }; saveSettings(s); e.target.previousSibling.textContent = 'Text size · ' + s.size + ' px'; } })),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '🔘 Buttons · बटन'), h('label', {}, 'Style'), chips(BSTYLES, 'bstyle', v => v), h('label', {}, 'Animation'), chips(BANIMS, 'banim', v => v),
      h('div', { class: 'actions', style: 'margin-top:12px' }, h('button', { class: 'btn' }, 'Try me'), h('button', { class: 'btn alt' }, 'Try me too'))),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '🪄 Cards & motion'), h('label', {}, 'Card corners'), chips({ soft: 'Rounded', sharp: 'Sharp' }, 'cards', v => v),
      h('label', {}, 'Page animations'), chips({ on: 'On', off: 'Off (faster)' }, 'motion', v => v)),
    state.profile.role === 'super_admin' ? h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '🏛 Society default look'), h('p', { class: 'muted s' }, 'Everyone who has not chosen their own look sees the society default (also on the login page).'),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: async () => { const r = await saveSocietyLook(s); toast(r.error ? friendly(r.error) : 'Saved as the society default for everyone'); } }, 'Use this look for everyone'),
        h('button', { class: 'btn alt', onclick: async () => { const r = await saveSocietyLook(null); toast(r.error ? friendly(r.error) : 'Society default cleared'); } }, 'Clear default'))) : null,
    h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => { useSocietyLook(); s = getSettings(); toast(Object.keys(societyLook()).length ? 'Using the society look' : 'Back to the standard look'); draw(); } }, 'Reset')));
  draw();
}
