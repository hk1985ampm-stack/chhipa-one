// Detailed "who did what" log (every create / edit / approve / print / download) + the per-agent summary
import { sb, h, hi, toast, friendly, myLocations, ROLE_LABEL, logAct } from './core.js';

const PAGE = 100;
const csvCell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
export async function render(main) {
  const locs = await myLocations(), today = new Date().toISOString().slice(0, 10), m1 = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const from = h('input', { type: 'date', value: m1 }), to = h('input', { type: 'date', value: today });
  const loc = h('select', {}, h('option', { value: '' }, 'All locations'), locs.map(l => h('option', { value: l.id }, l.city)));
  const who = h('select', {}, h('option', { value: '' }, 'Everyone'));
  const out = h('div'), log = h('div'); let rows = [], off = 0, more = false;
  sb.rpc('agent_activity', { p_from: null, p_to: null, p_location: null }).then(({ data }) => (data || []).forEach(x => who.append(h('option', { value: x.user_id || x.id || '' }, x.full_name))));
  const args = () => ({ p_from: from.value || null, p_to: to.value || null, p_user: who.value || null, p_location: loc.value || null });
  const when = t => new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const drawLog = () => log.replaceChildren(h('div', { class: 'card tw' }, h('h3', { style: 'margin-top:0' }, 'Detailed activity log'),
    h('table', { class: 'ptable', style: 'min-width:640px' }, h('tr', {}, ['When', 'Who', 'Role / ID', 'Place', 'What', 'Record'].map(t => h('th', {}, t))),
      rows.length ? rows.map(x => h('tr', {}, h('td', { class: 'nowrap' }, when(x.at)), h('td', {}, h('b', {}, x.actor_name || '—')), h('td', {}, (ROLE_LABEL[x.actor_role] || x.actor_role || '') + (x.actor_code ? ' · ' + x.actor_code : '')), h('td', {}, x.location || ''), h('td', {}, x.what || ''), h('td', {}, x.subject || ''))) : h('tr', {}, h('td', { colspan: 6, class: 'muted' }, 'No activity in this period'))),
    more ? h('p', {}, h('button', { class: 'btn alt', onclick: () => fetchLog(true) }, 'Load more')) : null,
    h('p', { class: 'actions' }, h('button', { class: 'btn alt', onclick: csv }, '⬇ Export CSV'), h('button', { class: 'btn alt', onclick: () => { logAct('PRINT', 'Activity log'); window.print(); } }, '🖨 Print'))));
  const csv = () => { logAct('EXPORT', 'Activity log CSV'); const t = [['When', 'Who', 'Role', 'ID', 'Place', 'What', 'Record']].concat(rows.map(x => [new Date(x.at).toLocaleString('en-IN'), x.actor_name, x.actor_role, x.actor_code, x.location, x.what, x.subject])).map(r => r.map(csvCell).join(',')).join('\n');
    const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + t], { type: 'text/csv' })), download: 'activity-log.csv' }); document.body.append(a); a.click(); a.remove(); };
  const fetchLog = async append => { if (!append) { off = 0; rows = []; } const { data, error } = await sb.rpc('activity_log', { ...args(), p_limit: PAGE, p_offset: off }); if (error) return log.replaceChildren(h('div', { class: 'card err' }, friendly(error)));
    rows = rows.concat(data || []); off += (data || []).length; more = (data || []).length === PAGE; drawLog(); };
  const load = async () => {
    out.replaceChildren(h('p', { class: 'muted' }, 'Loading…')); fetchLog(false);
    const { data, error } = await sb.rpc('agent_activity', { p_from: from.value || null, p_to: to.value || null, p_location: loc.value || null }); if (error) return out.replaceChildren(h('div', { class: 'card' }, friendly(error)));
    const tot = k => data.reduce((a, x) => a + x[k], 0);
    out.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'stats' }, [['Families', 'families_added'], ['Members', 'members_added'], ['Approved', 'approved'], ['Rejected', 'rejected'], ['Pending', 'pending']].map(([t, k]) => h('div', { class: 'st' }, h('b', {}, String(tot(k))), h('span', {}, t))))),
      h('div', { class: 'card tw' }, h('h3', { style: 'margin-top:0' }, 'Summary by person'), h('table', { class: 'ptable', style: 'min-width:560px' }, h('tr', {}, ['Name', 'Role', 'Families', 'Members', 'Appr.', 'Rej.', 'Pend.', 'Edits', 'Last active'].map(t => h('th', {}, t))),
        data.map(x => h('tr', {}, h('td', {}, h('b', {}, x.full_name)), h('td', {}, ROLE_LABEL[x.role] || x.role), h('td', {}, String(x.families_added)), h('td', {}, String(x.members_added)), h('td', {}, String(x.approved)), h('td', {}, String(x.rejected)), h('td', {}, String(x.pending)), h('td', {}, String(x.edits)), h('td', {}, x.last_active ? new Date(x.last_active).toLocaleDateString() : '–'))))));
  };
  main.append(h('h2', {}, hi('Activity Log', 'गतिविधि लॉग')), h('p', { class: 'muted s' }, 'Every add, edit, approval, print and download — who did it and when.'),
    h('div', { class: 'card noprint' }, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'From'), from), h('div', {}, h('label', {}, 'To'), to)), h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Location'), loc), h('div', {}, h('label', {}, 'Person'), who)), h('p', {}, h('button', { class: 'btn', onclick: load }, 'Show'))), out, log);
  await load();
}
