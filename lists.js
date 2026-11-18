import { sb, h, hi, toast, friendly, loadOptions } from './core.js';
import { loadCustomFields } from './customfields.js';

const LISTS = [['gotra', 'Gotra · गोत्र'], ['education', 'Education · शिक्षा'], ['occupation', 'Occupation · व्यवसाय'], ['family_type', 'Family type · प्रकार'], ['house_type', 'House · मकान'],
  ['transfer_reason', 'Transfer reason'], ['notice_category', 'Notice category']];

export async function render(main) {
  let key = 'gotra';
  // lists created by the Super Admin (stored as '_lists' rows: slug|Title)
  const custom = async () => { const { data } = await sb.from('options').select('value').eq('list_key', '_lists').eq('active', true).order('sort'); return (data || []).map(r => r.value.split('|')).map(([k, t]) => [k, t]); };
  let extraLists = await custom();
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
  const draw = () => chips.replaceChildren(...[...LISTS, ...extraLists].map(([v, t]) => h('button', { class: 'btn ' + (key === v ? '' : 'alt'), style: 'min-width:0', onclick: () => { key = v; draw(); run(); } }, t)));

  const { data: st } = await sb.from('settings').select('*').eq('key', 'self_approve_super_admin').maybeSingle();
  const on = h('input', { type: 'checkbox', checked: !st || st.value === 'true' });
  on.addEventListener('change', async () => { const { error } = await sb.from('settings').upsert({ key: 'self_approve_super_admin', value: String(on.checked) });
    error ? toast(friendly(error)) : toast('Saved'); });
  main.append(h('h2', {}, hi('Dropdown Lists', 'ड्रॉपडाउन सूची')), chips, out,
    h('div', { class: 'card' }, h('h3', {}, 'Approval rule'), h('label', { class: 'chk' }, on, 'Super Admin may approve their own life-event requests'),
      h('p', { class: 'muted' }, 'Keep this ON while you are the only Super Admin. Turn it OFF once a second Super Admin exists. Location Admins can never approve their own requests.')));
  // ---- new list + custom member details
  const newList = h('input', { placeholder: 'New list name, e.g. Skills, Blood group' });
  const addList = async () => { const t = newList.value.trim(); if (!t) return toast('Type the list name');
    const k = 'l_' + t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30); if (k === 'l_' || [...LISTS, ...extraLists].some(x => x[0] === k)) return toast('That list already exists');
    const { error } = await sb.from('options').insert({ list_key: '_lists', value: k + '|' + t, sort: extraLists.length + 1 }); if (error) return toast(friendly(error));
    await loadOptions(); extraLists = await custom(); key = k; newList.value = ''; draw(); run(); toast('List added — add its values below'); };
  const cfBox = h('div', { class: 'card' });
  const cfDraw = async () => { const { data, error } = await sb.from('custom_fields').select('*').order('sort'); if (error) return cfBox.replaceChildren(h('p', { class: 'err' }, friendly(error)));
    const nm = h('input', { placeholder: 'Detail name, e.g. Blood group' }), kind = h('select', {}, [['text', 'Text'], ['number', 'Number'], ['date', 'Date'], ['list', 'Dropdown list']].map(([v, t]) => h('option', { value: v }, t))),
      lk = h('select', { hidden: true }, [...LISTS, ...extraLists].map(([v, t]) => h('option', { value: v }, t)));
    kind.addEventListener('change', () => { lk.hidden = kind.value !== 'list'; });
    cfBox.replaceChildren(h('h3', { style: 'margin-top:0' }, 'Custom member details'), h('p', { class: 'muted s' }, 'Add any extra detail you want to record for every family member. It appears in the Add / Edit member form and on the member card.'),
      h('div', { class: 'list' }, data.map(f => h('div', { class: 'item' }, h('span', { style: f.active ? '' : 'opacity:.5;text-decoration:line-through' }, h('b', {}, f.label), ' · ' + f.kind + (f.list_key ? ' (' + f.list_key + ')' : '')),
        h('button', { class: 'btn alt', style: 'min-height:40px', onclick: async () => { const { error: e } = await sb.rpc('custom_field_set_active', { p_id: f.id, p_active: !f.active }); e ? toast(friendly(e)) : (await loadCustomFields(), cfDraw()); } }, f.active ? 'Hide' : 'Show')))),
      nm, h('div', { class: 'row' }, kind, lk), h('p', {}, h('button', { class: 'btn', onclick: async () => { const { error: e } = await sb.rpc('custom_field_save', { p_label: nm.value, p_kind: kind.value, p_list_key: kind.value === 'list' ? lk.value : null }); e ? toast(friendly(e)) : (toast('Detail added'), await loadCustomFields(), cfDraw()); } }, '+ Add detail')));
  };
  main.append(h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Create a new dropdown list'), newList, h('p', {}, h('button', { class: 'btn', onclick: addList }, '+ Create list'))), cfBox);
  cfDraw(); draw(); run();
}
