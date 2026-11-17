import { sb, h, hi, toast, friendly, pill, state } from './core.js';

export async function render(main, arg) {
  let status = arg === 'pending' ? 'pending' : '';
  const q = h('input', { type: 'search', placeholder: 'Name, Family ID, Member ID or mobile · खोजें', autofocus: true });
  const chips = h('div', { class: 'row', style: 'margin:8px 0' });
  const out = h('div');
  const FIL = [['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']];
  const drawChips = () => chips.replaceChildren(...FIL.map(([v, t]) =>
    h('button', { class: 'btn ' + (status === v ? '' : 'alt'), style: 'min-width:0', onclick: () => { status = v; drawChips(); run(); } }, t)));
  let timer, seq = 0;
  const run = async () => {
    const my = ++seq;
    const { data, error } = await sb.rpc('registry_search', { p_q: q.value.trim() || null, p_status: status || null });
    if (my !== seq) return;
    if (error) return out.replaceChildren(h('p', { class: 'err' }, friendly(error)));
    if (!data.length) return out.replaceChildren(h('div', { class: 'card muted' }, q.value || status ? 'No matching family found.' : 'No families yet. Tap “+ Add Family” to register the first one.'));
    out.replaceChildren(...data.map(f => h('a', { class: 'card fam', href: '#family/' + f.family_id },
      h('div', { class: 'item' }, h('b', {}, f.family_code || 'ID on approval'), pill(f.status)),
      h('div', {}, f.head_name || '—', ' · ', f.city),
      h('div', { class: 'muted', style: 'font-size:14px' }, 'Active ', f.active_count, ' of ', f.total_count, f.address ? ' · ' + f.address : ''))));
  };
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 300); });
  main.append(h('div', { class: 'row', style: 'align-items:center' }, h('h2', { style: 'flex:2' }, hi('Family Registry', 'परिवार रजिस्टर')),
    h('a', { class: 'btn', href: '#add', style: 'flex:1' }, '+ Add Family')), q, chips, out);
  drawChips(); run();
}
