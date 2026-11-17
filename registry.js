import { sb, h, hi, toast, friendly, pill, state } from './core.js';

export async function render(main, arg) {
  let status = arg === 'pending' ? 'pending' : '';
  const q = h('input', { type: 'search', placeholder: 'Name, Family ID, Member ID or mobile · खोजें', autofocus: true });
  const chips = h('div', { class: 'chips' });
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
    out.replaceChildren(h('div', { class: 'print-title' }, 'Family Registry · ' + new Date().toLocaleDateString() + ' · ' + data.length + ' families'), ...data.map(f => h('div', { class: 'card fam' },
      h('a', { href: '#family/' + f.family_id },
        h('div', { class: 'item' }, h('b', {}, f.family_code || 'ID on approval'), pill(f.status)),
        h('div', {}, f.head_name || '—', ' · ', f.city),
        h('div', { class: 'muted s' }, 'Active ', f.active_count, ' of ', f.total_count, f.address ? ' · ' + f.address : '')),
      h('a', { class: 'btn alt noprint sm', href: '#card/' + f.family_id }, '🖨 View / Print'))));
  };
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 300); });
  main.append(h('div', { class: 'rowhead' }, h('h2', { style: 'margin:0' }, hi('Family Registry', 'परिवार रजिस्टर')),
    h('a', { class: 'btn', href: '#add' }, '+ Add Family')), q, chips,
    h('div', { class: 'noprint', style: 'margin:0 0 10px;text-align:right' }, h('button', { class: 'btn alt sm', onclick: () => window.print() }, '🖨 Print this list')), out);
  drawChips(); run();
}
