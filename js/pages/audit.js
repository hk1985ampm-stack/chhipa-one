import { sb, h, hi } from '../core.js';

export async function render(main) {
  const [a, s] = await Promise.all([
    sb.from('audit_log').select('id,at,actor,table_name,action,row_id').order('id', { ascending: false }).limit(100),
    sb.rpc('list_staff')]);
  if (a.error) throw a.error;
  const who = id => (s.data || []).find(x => x.user_id === id)?.full_name || (id ? id.slice(0, 8) : 'system');
  main.append(h('h2', {}, hi('Audit Log', 'ऑडिट लॉग')), h('p', { class: 'muted' }, 'Last 100 changes. This log cannot be edited or deleted.'),
    h('div', { class: 'card', style: 'overflow-x:auto' }, h('table', {},
      h('tr', {}, ['When', 'Who', 'Action', 'Table'].map(t => h('th', {}, t))),
      a.data.map(r => h('tr', {}, h('td', {}, new Date(r.at).toLocaleString()), h('td', {}, who(r.actor)), h('td', {}, r.action), h('td', {}, r.table_name))))));
}
