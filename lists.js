import { sb, h, hi, toast, friendly, loadOptions } from './core.js';

const LISTS = [['gotra', 'Gotra · गोत्र'], ['education', 'Education · शिक्षा'], ['occupation', 'Occupation · व्यवसाय'], ['family_type', 'Family type · प्रकार'], ['house_type', 'House · मकान']];

export async function render(main) {
  let key = 'gotra';
  const out = h('div'), chips = h('div', { class: 'row', style: 'margin:8px 0' });
  const run = async () => {
    const { data, error } = await sb.from('options').select('*').eq('list_key', key).order('sort');
    if (error) return out.replaceChildren(h('p', { class: 'err' }, friendly(error)));
    const one = h('input', { placeholder: 'New value, e.g. Rathod' }), many = h('textarea', { rows: 4, placeholder: 'Or paste several, one per line' });
    const add = async () => {
      const vals = [...new Set([one.value, ...many.value.split('\n')].map(x => x.trim()).filter(Boolean))].filter(v => !data.some(d => d.value.toLowerCase() === v.toLowerCase()));
      if (!vals.length) return toast('Nothing new to add');
      let n = Math.max(0, ...data.map(d => d.sort));
      const { error } = await sb.from('options').insert(vals.map(v => ({ list_key: key, value: v, sort: ++n })));
      error ? toast(friendly(error)) : (toast(vals.length + ' added'), await loadOptions(), run());
    };
    const toggle = async d => { const { error } = await sb.from('options').update({ active: !d.active }).eq('id', d.id);
      error ? toast(friendly(error)) : (await loadOptions(), run()); };
    out.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'list' }, data.map(d => h('div', { class: 'item' },
      h('span', { style: d.active ? '' : 'opacity:.5;text-decoration:line-through' }, d.value),
      h('button', { class: 'btn alt', style: 'min-height:40px', onclick: () => toggle(d) }, d.active ? 'Remove' : 'Restore'))))),
      h('div', { class: 'card' }, h('h3', {}, 'Add values'), one, h('div', { style: 'height:8px' }), many, h('p', {}, h('button', { class: 'btn', onclick: add }, '+ Add'))),
      h('p', { class: 'muted' }, '“Remove” only hides a value from new forms. Records that already use it keep it.'));
  };
  const draw = () => chips.replaceChildren(...LISTS.map(([v, t]) => h('button', { class: 'btn ' + (key === v ? '' : 'alt'), style: 'min-width:0', onclick: () => { key = v; draw(); run(); } }, t)));

  const { data: st } = await sb.from('settings').select('*').eq('key', 'self_approve_super_admin').maybeSingle();
  const on = h('input', { type: 'checkbox', checked: !st || st.value === 'true' });
  on.addEventListener('change', async () => { const { error } = await sb.from('settings').upsert({ key: 'self_approve_super_admin', value: String(on.checked) });
    error ? toast(friendly(error)) : toast('Saved'); });
  main.append(h('h2', {}, hi('Dropdown Lists', 'ड्रॉपडाउन सूची')), chips, out,
    h('div', { class: 'card' }, h('h3', {}, 'Approval rule'), h('label', { class: 'chk' }, on, 'Super Admin may approve their own life-event requests'),
      h('p', { class: 'muted' }, 'Keep this ON while you are the only Super Admin. Turn it OFF once a second Super Admin exists. Location Admins can never approve their own requests.')));
  draw(); run();
}
