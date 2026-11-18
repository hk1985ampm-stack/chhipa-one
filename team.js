// Community Team: owners, state admins, location admins and agents of one community. Changes show instantly (Supabase Realtime + refresh).
import { sb, h, hi, toast, friendly, state } from './core.js';

export const LEVELS = [['owner', 'Owner (Super Admin)', 'मालिक'], ['state_admin', 'State Admin', 'राज्य एडमिन'], ['location_admin', 'Location Admin', 'लोकेशन एडमिन'], ['agent', 'Agent', 'एजेंट']];
const LV = Object.fromEntries(LEVELS.map(l => [l[0], l[1]]));
const DESIGNATIONS = ['President', 'Vice President', 'Secretary', 'Joint Secretary', 'Treasurer', 'Trustee', 'Member', 'Coordinator', 'Volunteer'];

export async function teamTab(c, locs) {
  const wrap = h('div'), list = h('div'), form = h('div');
  const states = [...new Set(locs.map(l => l.state).filter(Boolean))];
  let rows = [], chan;
  const load = async () => {
    const { data, error } = await sb.rpc('team_list', { p_community: c.id });
    if (error) return list.replaceChildren(h('div', { class: 'card err' }, friendly(error)));
    rows = data; draw();
  };
  const act = async (fn, msg) => { const { error } = await fn(); error ? toast(friendly(error)) : toast(msg); load(); };
  const draw = () => list.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'muted s' }, rows.length + ' people · updates live'),
    ...rows.map(p => h('div', { class: 'team-row' },
      h('div', { class: 'tr-main' }, h('b', {}, p.full_name), ' ', h('span', { class: 'pill ' + (p.invited ? 'draft' : p.status === 'active' ? 'approved' : p.status === 'suspended' ? 'pending' : 'rejected') }, p.invited ? 'invited' : p.status),
        h('div', { class: 'muted s' }, [p.email, p.designation].filter(Boolean).join(' · ')),
        h('div', { class: 'muted s' }, [LV[p.level], p.level === 'state_admin' ? p.scope_state : null, p.level === 'owner' ? 'all locations' : (p.location_codes || []).join(', ') || null].filter(Boolean).join(' · '))),
      h('div', { class: 'chips' },
        p.invited ? h('span', { class: 'muted s' }, 'Waiting for sign-up') : null,
        h('button', { class: 'btn alt sm', onclick: () => edit(p) }, '✏️ Role'),
        !p.invited && p.user_id !== state.profile.user_id ? h('button', { class: 'btn alt sm', onclick: () => act(() => sb.rpc('staff_set_status', { p_user: p.user_id, p_status: p.status === 'active' ? 'suspended' : 'active' }), 'Updated') }, p.status === 'active' ? 'Suspend' : 'Activate') : null,
        p.invited ? h('button', { class: 'btn alt bad sm', onclick: () => confirm('Cancel invite for ' + p.email + '?') && act(() => sb.rpc('team_cancel_invite', { p_email: p.email }), 'Invite cancelled') }, 'Cancel invite')
          : p.user_id !== state.profile.user_id && p.status !== 'revoked' ? h('button', { class: 'btn alt bad sm', onclick: () => confirm('Remove ' + p.full_name + '? They lose access immediately.') && act(() => sb.rpc('team_remove', { p_user: p.user_id }), 'Removed') }, 'Remove') : null)))));
  const edit = p => {
    const email = h('input', { type: 'email', value: p ? p.email : '', placeholder: 'person@example.com', disabled: !!p });
    const name = h('input', { value: p ? p.full_name : '', placeholder: 'Full name' });
    const lvl = h('select', {}, LEVELS.map(([v, t]) => h('option', { value: v, selected: p ? p.level === v : v === 'agent' }, t)));
    const des = h('input', { value: p ? p.designation || '' : '', list: 'desg', placeholder: 'e.g. President, Secretary' }), dl = h('datalist', { id: 'desg' }, DESIGNATIONS.map(d => h('option', { value: d })));
    const st = h('select', {}, states.map(s => h('option', { value: s, selected: p && p.scope_state === s }, s)));
    const boxes = locs.filter(l => l.status === 'active').map(l => ({ l, el: h('input', { type: 'checkbox', checked: !!(p && (p.location_codes || []).includes(l.code)) }) }));
    const fAll = h('input', { type: 'checkbox' }), fSens = h('input', { type: 'checkbox' }), fExp = h('input', { type: 'checkbox' });
    const stBox = h('div', {}, h('label', {}, 'State (all current and future locations of this state)'), st), locBox = h('div', {}, h('label', {}, 'Locations they work in'), ...boxes.map(b => h('label', { class: 'chk' }, b.el, `${b.l.code} · ${b.l.city}`)));
    const sync = () => { stBox.hidden = lvl.value !== 'state_admin'; locBox.hidden = !['location_admin', 'agent'].includes(lvl.value); }; lvl.addEventListener('change', sync); sync();
    const chk = (el, t) => h('label', { class: 'chk' }, el, t), err = h('p', { class: 'err' });
    form.replaceChildren(h('div', { class: 'card' }, h('h3', {}, p ? 'Change role · ' + p.full_name : 'Add team member'),
      p ? null : h('p', { class: 'muted s' }, 'If this email already has a login the person is added at once. Otherwise they are invited: ask them to open the app, tap “Create account” with this email, and they get this role automatically.'),
      h('label', {}, 'Email *'), email, h('label', {}, 'Full name *'), name, h('label', {}, 'Role *'), lvl, h('label', {}, 'Designation (office-bearer title)'), des, dl, stBox, locBox,
      h('label', {}, 'Special permissions (leave off unless needed)'), chk(fAll, 'Can VIEW all families (read only)'), chk(fSens, 'Can view sensitive data'), chk(fExp, 'Can export to Excel'), err,
      h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => form.replaceChildren() }, 'Cancel'), h('button', { class: 'btn', onclick: async ev => {
        ev.target.disabled = true;
        const { data, error } = await sb.rpc('team_save', { p_email: email.value.trim(), p_name: name.value.trim(), p_level: lvl.value, p_designation: des.value.trim(), p_state: st.value || null, p_locations: boxes.filter(b => b.el.checked).map(b => b.l.id), p_community: c.id, p_view_all: fAll.checked, p_sensitive: fSens.checked, p_export: fExp.checked });
        if (error) { ev.target.disabled = false; return (err.textContent = friendly(error)); }
        form.replaceChildren(); toast(data.status === 'invited' ? 'Invited — they get this role when they create their account' : 'Saved'); load(); } }, 'Save'))));
    form.scrollIntoView({ behavior: 'smooth' });
  };
  wrap.append(h('div', { class: 'rowhead' }, h('h3', { style: 'margin:0' }, hi('Team', 'टीम')), h('button', { class: 'btn sm', onclick: () => edit(null) }, '+ Add member')), form, list);
  load();
  try { chan = sb.channel('team-' + c.id).on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'staff_invites' }, load).subscribe(); } catch {}
  const stop = () => { try { chan && sb.removeChannel(chan); } catch {} removeEventListener('hashchange', stop); };
  addEventListener('hashchange', stop);
  wrap.stop = stop;
  return wrap;
}
