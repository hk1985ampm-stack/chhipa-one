import { sb, h, hi, toast, friendly, myLocations } from './core.js';

const bar = (rows, total) => h('div', {}, rows.map(r => {
  const pct = total ? Math.round(r.n * 100 / total) : 0;
  return h('div', { style: 'margin:6px 0' }, h('div', { style: 'display:flex;justify-content:space-between;font-size:13px' }, h('span', {}, r.label), h('b', {}, r.n + ' · ' + pct + '%')),
    h('div', { style: 'background:#e6efe9;border-radius:4px;height:8px' }, h('div', { style: `background:#0d6b4f;border-radius:4px;height:8px;width:${Math.max(pct, 1)}%` })));
}));
const stat = (n, t) => h('div', { class: 'st' }, h('b', {}, String(n)), h('span', {}, t));
const KINDS = [['mobile', 'Head: no mobile', 'मोबाइल नहीं'], ['dob', 'No DOB / age', 'जन्मतिथि/उम्र नहीं'], ['address', 'Address missing', 'पता नहीं'], ['gotra', 'No gotra', 'गोत्र नहीं']];

export async function render(main, arg) {
  const locs = await myLocations();
  const sel = h('select', {}, h('option', { value: '' }, 'All my locations'), locs.map(l => h('option', { value: l.id }, l.city)));
  const body = h('div');
  let tab = arg === 'quality' ? 'quality' : 'dash';
  const loc = () => sel.value || null;
  const tabs = h('div', { class: 'chips' });
  const drawTabs = () => tabs.replaceChildren(...[['dash', '📊 Dashboard'], ['quality', '🧹 Data Quality']].map(([k, t]) => h('button', { class: 'btn ' + (tab === k ? '' : 'alt'), onclick: () => { tab = k; drawTabs(); load(); } }, t)));

  async function load() {
    body.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    try { tab === 'dash' ? await dash() : await quality(); } catch (e) { body.replaceChildren(h('div', { class: 'card' }, friendly(e))); }
  }
  async function dash() {
    const { data: r, error } = await sb.rpc('report_summary', { p_location: loc() }); if (error) throw error;
    const sec = (t, hi2, rows) => h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, t), rows.length ? bar(rows, r.members) : h('p', { class: 'muted' }, 'No data'));
    body.replaceChildren(
      h('div', { class: 'card' }, h('div', { class: 'stats' }, stat(r.families, 'Families'), stat(r.members, 'Members'), stat(r.male, 'Male'), stat(r.female, 'Female'), stat(r.pending, 'Pending')),
        h('p', { class: 'muted s' }, 'Counts approved families and living members.')),
      ...[!loc() && r.by_location.length > 1 ? h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'By location'), h('table', {}, h('tr', {}, ['Location', 'Families', 'Members'].map(t => h('th', {}, t))), r.by_location.map(x => h('tr', {}, h('td', {}, x.label), h('td', {}, String(x.families)), h('td', {}, String(x.members)))))) : null].filter(Boolean),
      sec('Age groups', '', r.age), sec('Gotra (by member)', '', r.gotra), sec('Education', '', r.education), sec('Occupation', '', r.occupation), sec('Marital status', '', r.marital),
      h('p', {}, h('button', { class: 'btn alt', onclick: () => window.print() }, '🖨 Print this report')));
  }
  async function quality(kind) {
    const { data: c, error } = await sb.rpc('quality_counts', { p_location: loc() }); if (error) throw error;
    const list = h('div');
    const show = async k => {
      list.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
      const { data, error: e } = await sb.rpc('data_quality', { p_kind: k, p_location: loc(), p_limit: 200 }); if (e) return toast(friendly(e));
      list.replaceChildren(...(data.length ? data.map(x => h('a', { class: 'card item', href: '#family/' + x.family_id }, h('span', {}, h('b', {}, x.name), h('div', { class: 'muted s' }, [x.family_code, x.member_code, x.location].filter(Boolean).join(' · '))), h('span', { class: 'muted s' }, '›'))) : [h('div', { class: 'card' }, '✔ Nothing to fix here')]),
        data.length >= 200 ? h('p', { class: 'muted s' }, 'Showing the first 200.') : []);
    };
    body.replaceChildren(h('p', { class: 'muted s' }, 'Tap a check to see the records to fix. Tap a record to open and edit it.'),
      h('div', { class: 'stats' }, KINDS.map(([k, en, hindi]) => h('button', { class: 'st', style: 'cursor:pointer;border:0', onclick: () => show(k) }, h('b', {}, String(c[k])), h('span', {}, en)))), list);
    show(kind || KINDS.find(([k]) => c[k] > 0)?.[0] || 'mobile');
  }
  sel.addEventListener('change', load);
  main.append(h('h2', {}, hi('Reports', 'रिपोर्ट')), h('div', { class: 'card' }, h('label', {}, 'Location'), sel), tabs, body);
  drawTabs(); await load();
}
