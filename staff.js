import { sb, h, hi, toast, friendly, ROLE_LABEL } from './core.js';

export async function render(main) {
  const [s, l, pr] = await Promise.all([sb.rpc('list_staff'), sb.from('locations').select('id,code,city').order('city'), sb.from('profiles').select('user_id,read_only')]);
  if (s.error || l.error) throw (s.error || l.error);
  const RO = Object.fromEntries((pr.data || []).map(p => [p.user_id, p.read_only]));
  const reload = () => { main.replaceChildren(); render(main); };
  const locName = id => { const x = l.data.find(y => y.id === id); return x ? x.code : '?'; };

  const setStatus = async (u, status) => {
    const { error } = await sb.rpc('staff_set_status', { p_user: u, p_status: status });
    error ? toast(friendly(error)) : (toast('Updated'), reload());
  };

  // --- add / update staff
  const email = h('input', { type: 'email', placeholder: 'login email (already created in Supabase)' });
  const name = h('input', { placeholder: 'Full name' });
  const role = h('select', {}, ['agent', 'location_admin', 'super_admin'].map(r => h('option', { value: r }, ROLE_LABEL[r])));
  const boxes = l.data.map(x => ({ id: x.id, el: h('input', { type: 'checkbox' }), x }));
  const fAll = h('input', { type: 'checkbox' }), fSens = h('input', { type: 'checkbox' }), fExp = h('input', { type: 'checkbox' });
  const chk = (el, t) => h('label', { class: 'chk' }, el, t);
  const save = async () => {
    if (!email.value.trim() || !name.value.trim()) return toast('Enter email and name');
    const locs = boxes.filter(b => b.el.checked).map(b => b.id);
    if (role.value !== 'super_admin' && !locs.length) return toast('Choose at least one location');
    const cm = await sb.from('locations').select('community_id').limit(1); const { error } = await sb.rpc('team_save', { p_email: email.value.trim(), p_name: name.value.trim(), p_level: role.value === 'super_admin' ? 'owner' : role.value, p_designation: '', p_state: null,
      p_locations: locs, p_community: cm.data && cm.data[0] && cm.data[0].community_id, p_view_all: fAll.checked, p_sensitive: fSens.checked, p_export: fExp.checked });
    error ? toast(friendly(error)) : (toast('Staff saved'), reload());
  };

  main.append(
    h('h2', {}, hi('Staff & Agents', 'स्टाफ / एजेंट')),
    h('div', { class: 'card' }, h('div', { class: 'list' }, s.data.map(x => h('div', { class: 'item' },
      h('div', {}, h('b', {}, x.full_name), ' ', h('span', { class: 'pill ' + x.status }, x.status), RO[x.user_id] ? h('span', { class: 'pill pending' }, 'view only') : null,
        h('div', { class: 'muted', style: 'font-size:14px' }, [x.email, ROLE_LABEL[x.role], x.admin_code,
          x.location_ids.length ? x.location_ids.map(locName).join(', ') : null].filter(Boolean).join(' · '))),
      h('div', { class: 'actions-card', style: 'justify-content:flex-end' },
        h('button', { class: 'btn alt sm', onclick: () => setStatus(x.user_id, x.status === 'active' ? 'suspended' : 'active') }, x.status === 'active' ? 'Suspend' : 'Activate'),
        x.role !== 'super_admin' ? h('button', { class: 'btn alt sm', onclick: async () => { const { error } = await sb.rpc('staff_set_readonly', { p_user: x.user_id, p_ro: !RO[x.user_id] }); error ? toast(friendly(error)) : (toast(RO[x.user_id] ? 'Can add and edit again' : 'Now view-only'), reload()); } }, RO[x.user_id] ? 'Allow editing' : 'Make view-only') : null,
        x.status !== 'revoked' ? h('button', { class: 'btn alt sm bad', onclick: () => confirm('Remove ' + x.full_name + '? They can no longer sign in. You can restore them later.') && setStatus(x.user_id, 'revoked') }, 'Remove') : null,
        x.status === 'revoked' ? h('button', { class: 'btn sm bad', onclick: async () => { if (prompt('Delete ' + x.full_name + ' FOREVER?\nType DELETE to confirm') !== 'DELETE') return;
          const { error } = await sb.rpc('staff_purge', { p_user: x.user_id, p_confirm: 'DELETE' }); error ? toast(friendly(error)) : (toast('Deleted permanently'), reload()); } }, 'Delete permanently') : null))))),
    h('div', { class: 'card' }, h('h3', {}, 'Add or update staff'),
      h('p', { class: 'muted' }, 'If the person already has a login, they become active at once. If not, they are invited: share the invite from Team (Home → Office → My Team / Communities → Team) or create the login in Supabase → Authentication → Users (tick Auto Confirm User). Typing an existing email updates that person.'),
      h('label', {}, 'Email'), email, h('label', {}, 'Full name'), name, h('label', {}, 'Role'), role,
      h('label', {}, 'Locations they can work in'), ...boxes.map(b => chk(b.el, `${b.x.code} · ${b.x.city}`)),
      h('label', {}, 'Special permissions (leave off unless needed)'),
      chk(fAll, 'Can VIEW all families (read only)'), chk(fSens, 'Can view sensitive data (phone, etc.)'), chk(fExp, 'Can export to Excel'),
      h('p', {}, h('button', { class: 'btn', onclick: save }, 'Save staff'))));
}
