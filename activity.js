import { sb, h, hi, toast, friendly, myLocations, ROLE_LABEL } from './core.js';

export async function render(main) {
  const locs = await myLocations(), today = new Date().toISOString().slice(0, 10), m1 = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const from = h('input', { type: 'date', value: m1 }), to = h('input', { type: 'date', value: today });
  const loc = h('select', {}, h('option', { value: '' }, 'All locations'), locs.map(l => h('option', { value: l.id }, l.city)));
  const out = h('div');
  const load = async () => {
    out.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    const { data, error } = await sb.rpc('agent_activity', { p_from: from.value || null, p_to: to.value || null, p_location: loc.value || null }); if (error) return out.replaceChildren(h('div', { class: 'card' }, friendly(error)));
    const tot = k => data.reduce((a, x) => a + x[k], 0);
    out.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'stats' }, [['Families', 'families_added'], ['Members', 'members_added'], ['Approved', 'approved'], ['Rejected', 'rejected'], ['Pending', 'pending']].map(([t, k]) => h('div', { class: 'st' }, h('b', {}, String(tot(k))), h('span', {}, t))))),
      h('div', { class: 'card tw' }, h('table', { class: 'ptable', style: 'min-width:560px' }, h('tr', {}, ['Name', 'Role', 'Families', 'Members', 'Appr.', 'Rej.', 'Pend.', 'Edits', 'Last active'].map(t => h('th', {}, t))),
        data.map(x => h('tr', {}, h('td', {}, h('b', {}, x.full_name)), h('td', {}, ROLE_LABEL[x.role] || x.role), h('td', {}, String(x.families_added)), h('td', {}, String(x.members_added)), h('td', {}, String(x.approved)), h('td', {}, String(x.rejected)), h('td', {}, String(x.pending)), h('td', {}, String(x.edits)), h('td', {}, x.last_active ? new Date(x.last_active).toLocaleDateString() : '–'))))),
      h('p', {}, h('button', { class: 'btn alt', onclick: () => window.print() }, '🖨 Print')));
  };
  main.append(h('h2', {}, hi('Agent Activity', 'एजेंट गतिविधि')), h('div', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'From'), from), h('div', {}, h('label', {}, 'To'), to)), h('label', {}, 'Location'), loc, h('p', {}, h('button', { class: 'btn', onclick: load }, 'Show report'))), out);
  await load();
}
