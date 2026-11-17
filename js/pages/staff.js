import { sb, h, hi, toast, friendly, ROLE_LABEL } from '../core.js';

export async function render(main) {
  const [s, l] = await Promise.all([sb.rpc('list_staff'), sb.from('locations').select('id,code,city').order('city')]);
  if (s.error || l.error) throw (s.error || l.error);
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
    const { error } = await sb.rpc('staff_attach', { p_email: email.value.trim(), p_name: name.value.trim(), p_role: role.value,
      p_locations: locs, p_view_all: fAll.checked, p_sensitive: fSens.checked, p_export: fExp.checked });
    error ? toast(friendly(error)) : (toast('Staff saved'), reload());
  };

  main.append(
    h('h2', {}, hi('Staff & Agents', 'स्टाफ / एजेंट')),
    h('div', { class: 'card' }, h('div', { class: 'list' }, s.data.map(x => h('div', { class: 'item' },
      h('div', {}, h('b', {}, x.full_name), ' ', h('span', { class: 'pill ' + x.status }, x.status),
        h('div', { class: 'muted', style: 'font-size:14px' }, [x.email, ROLE_LABEL[x.role], x.admin_code,
          x.location_ids.length ? x.location_ids.map(locName).join(', ') : null].filter(Boolean).join(' · '))),
      h('button', { class: 'btn alt', onclick: () => setStatus(x.user_id, x.status === 'active' ? 'suspended' : 'active') },
        x.status === 'active' ? 'Suspend' : 'Activate'))))),
    h('div', { class: 'card' }, h('h3', {}, 'Add or update staff'),
      h('p', { class: 'muted' }, 'Step 1: create the person\'s login in Supabase → Authentication → Users. Step 2: enter the same email here. Typing an existing email updates that person.'),
      h('label', {}, 'Email'), email, h('label', {}, 'Full name'), name, h('label', {}, 'Role'), role,
      h('label', {}, 'Locations they can work in'), ...boxes.map(b => chk(b.el, `${b.x.code} · ${b.x.city}`)),
      h('label', {}, 'Special permissions (leave off unless needed)'),
      chk(fAll, 'Can VIEW all families (read only)'), chk(fSens, 'Can view sensitive data (phone, etc.)'), chk(fExp, 'Can export to Excel'),
      h('p', {}, h('button', { class: 'btn', onclick: save }, 'Save staff'))));
}
