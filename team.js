// Community Team: owners, state admins, location admins and agents of one community. Changes show instantly (Supabase Realtime + refresh).
import { sb, h, hi, toast, friendly, state, isStateOrSuper } from './core.js';
import { resetFor } from './inbox.js';
import { pickStaffPhoto } from './profile.js';

export const LEVELS = [['owner', 'Owner (Super Admin)', 'मालिक'], ['state_admin', 'State Admin', 'राज्य एडमिन'], ['location_admin', 'Location Admin', 'लोकेशन एडमिन'], ['agent', 'Agent', 'एजेंट']];
const mayLevel = v => state.profile.role === 'super_admin' || (isStateOrSuper() ? ['location_admin', 'agent'].includes(v) : v === 'agent');
const LV = Object.fromEntries(LEVELS.map(l => [l[0], l[1]]));
const DESIGNATIONS = ['President', 'Vice President', 'Secretary', 'Joint Secretary', 'Treasurer', 'Trustee', 'Member', 'Coordinator', 'Volunteer'];

// Invite by WhatsApp / e-mail / copy: no automatic e-mail is needed, the person simply opens the app link and creates an account with the invited e-mail
const appLink = () => location.origin + location.pathname;
const inviteText = (name, email, role) => `Assalamu Alaikum ${name},\nYou are invited as ${role} on Chhipa One (CJBWS community app).\n1. Open: ${appLink()}\n2. Sign in with this e-mail: ${email}\n   (first time and no password yet? tap "Create account", or ask the admin for your password)\n3. Your access is already set up.`;
function shareBox(name, email, role, phone) {
  const txt = inviteText(name, email, role), ph = (phone || '').replace(/\D/g, '');
  return h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Send the invite to ' + name), h('pre', { class: 'muted s', style: 'white-space:pre-wrap;margin:0 0 8px' }, txt),
    h('div', { class: 'actions' }, h('a', { class: 'btn', target: '_blank', rel: 'noopener', href: 'https://wa.me/' + (ph.length === 10 ? '91' + ph : ph) + '?text=' + encodeURIComponent(txt) }, 'WhatsApp'),
      h('a', { class: 'btn alt', href: 'mailto:' + email + '?subject=' + encodeURIComponent('Invitation: Chhipa One') + '&body=' + encodeURIComponent(txt) }, 'Email'),
      h('button', { class: 'btn alt', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(txt); toast('Invite text copied'); } }, 'Copy')));
}
export async function teamTab(c, locs) {
  const wrap = h('div'), list = h('div'), form = h('div'), pwbox = h('div');
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
      h('div', { class: 'tr-main' }, h('b', {}, p.full_name), ' ', h('span', { class: 'pill ' + (p.invited ? 'draft' : p.status === 'active' ? 'approved' : p.status === 'suspended' ? 'pending' : 'rejected') }, p.invited ? 'invited' : p.status), !p.invited && !p.has_photo ? h('span', { class: 'pill draft', title: 'No photo yet' }, 'no photo') : null,
        h('div', { class: 'muted s' }, [p.email, p.designation, p.admin_code ? 'ID ' + p.admin_code : null, p.phone ? 'Ph ' + p.phone : null].filter(Boolean).join(' · ')),
        h('div', { class: 'muted s' }, [LV[p.level], p.level === 'state_admin' ? p.scope_state : null, p.level === 'owner' ? 'all locations' : (p.location_codes || []).join(', ') || null].filter(Boolean).join(' · '))),
      h('div', { class: 'chips' },
        p.invited ? h('button', { class: 'btn sm', onclick: () => { form.replaceChildren(shareBox(p.full_name, p.email, LV[p.level], '')); form.scrollIntoView({ behavior: 'smooth' }); } }, '📤 Send invite') : null,
        h('button', { class: 'btn alt sm', onclick: () => edit(p) }, '✏️ Role'),
        !p.invited && p.can_reset ? h('button', { class: 'btn alt sm', onclick: () => resetFor(p.user_id, p.full_name, p.email, pwbox, load) }, '🔑 Reset password') : null,
        !p.invited && p.user_id ? h('button', { class: 'btn alt sm', onclick: () => pickStaffPhoto(p.user_id, load) }, '📷') : null,
        !p.invited && p.status === 'active' ? h('a', { class: 'btn alt sm', href: '#staffcard/' + p.user_id }, '🪪 ID Card') : null,
        !p.invited && p.user_id !== state.profile.user_id ? h('button', { class: 'btn alt sm', onclick: () => act(() => sb.rpc('staff_set_status', { p_user: p.user_id, p_status: p.status === 'active' ? 'suspended' : 'active' }), 'Updated') }, p.status === 'active' ? 'Suspend' : 'Activate') : null,
        p.invited ? h('button', { class: 'btn alt bad sm', onclick: () => confirm('Cancel invite for ' + p.email + '?') && act(() => sb.rpc('team_cancel_invite', { p_email: p.email }), 'Invite cancelled') }, 'Cancel invite')
          : p.user_id !== state.profile.user_id && p.status !== 'revoked' ? h('button', { class: 'btn alt bad sm', onclick: () => confirm('Remove ' + p.full_name + '? They lose access immediately.') && act(() => sb.rpc('team_remove', { p_user: p.user_id }), 'Removed') }, 'Remove') : null)))));
  const edit = p => {
    const email = h('input', { type: 'email', value: p ? p.email : '', placeholder: 'person@example.com', disabled: !!p });
    const name = h('input', { value: p ? p.full_name : '', placeholder: 'Full name' }), phone = h('input', { type: 'tel', inputmode: 'numeric', maxlength: 10, value: p && p.phone || '', placeholder: '10-digit phone (shown on printed cards)' });
    const lvl = h('select', {}, LEVELS.filter(l => mayLevel(l[0]) || (p && p.level === l[0])).map(([v, t]) => h('option', { value: v, selected: p ? p.level === v : v === 'agent' }, t)));
    const des = h('input', { value: p ? p.designation || '' : '', list: 'desg', placeholder: 'e.g. President, Secretary' }), dl = h('datalist', { id: 'desg' }, DESIGNATIONS.map(d => h('option', { value: d })));
    const st = h('select', {}, states.map(s => h('option', { value: s, selected: p && p.scope_state === s }, s)));
    const boxes = locs.filter(l => l.status === 'active').map(l => ({ l, el: h('input', { type: 'checkbox', checked: !!(p && (p.location_codes || []).includes(l.code)) }) }));
    const fAll = h('input', { type: 'checkbox' }), fSens = h('input', { type: 'checkbox' }), fExp = h('input', { type: 'checkbox' });
    const stBox = h('div', {}, h('label', {}, 'State (all current and future locations of this state)'), st), locBox = h('div', {}, h('label', {}, 'Locations they work in'), ...boxes.map(b => h('label', { class: 'chk' }, b.el, `${b.l.code} · ${b.l.city}`)));
    const sync = () => { stBox.hidden = lvl.value !== 'state_admin'; locBox.hidden = !['location_admin', 'agent'].includes(lvl.value); }; lvl.addEventListener('change', sync); sync();
    const chk = (el, t) => h('label', { class: 'chk' }, el, t), err = h('p', { class: 'err' });
    form.replaceChildren(h('div', { class: 'card' }, h('h3', {}, p ? 'Change role · ' + p.full_name : 'Add team member'),
      p ? null : h('p', { class: 'muted s' }, 'Tip: the person needs a login first. Easiest: Supabase → Authentication → Users → Add user (tick Auto Confirm User), then save here and send them the e-mail and password on WhatsApp. If sign-ups are switched on in Supabase, they can also create their own account. If this email already has a login the person is added at once. Otherwise you can send the invite by WhatsApp, e-mail or copy: they open the app, tap “Create account” with this e-mail, and get this role automatically.'),
      h('label', {}, 'Email *'), email, h('label', {}, 'Full name *'), name, h('label', {}, 'Role *'), lvl, h('label', {}, 'Designation (office-bearer title)'), des, dl, h('div', {}, h('label', {}, p && p.user_id ? 'Phone (printed on cards)' : 'WhatsApp / phone (for sending the invite)'), phone), stBox, locBox,
      h('label', {}, 'Special permissions (leave off unless needed)'), chk(fAll, 'Can VIEW all families (read only)'), chk(fSens, 'Can view sensitive data'), chk(fExp, 'Can export to Excel'), err,
      h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => form.replaceChildren() }, 'Cancel'), h('button', { class: 'btn', onclick: async ev => {
        ev.target.disabled = true;
        const { data, error } = await sb.rpc('team_save', { p_email: email.value.trim(), p_name: name.value.trim(), p_level: lvl.value, p_designation: des.value.trim(), p_state: st.value || null, p_locations: boxes.filter(b => b.el.checked).map(b => b.l.id), p_community: c.id, p_view_all: fAll.checked, p_sensitive: fSens.checked, p_export: fExp.checked });
        if (error) { ev.target.disabled = false; return (err.textContent = friendly(error)); }
        if (p && p.user_id) { const ph = await sb.rpc('staff_set_phone', { p_user: p.user_id, p_phone: phone.value }); if (ph.error) return (ev.target.disabled = false, err.textContent = friendly(ph.error)); }
        load(); if (data.status === 'invited') { toast('Invite saved — now send it'); form.replaceChildren(shareBox(name.value.trim(), email.value.trim().toLowerCase(), LV[lvl.value], phone.value)); } else { form.replaceChildren(); toast('Saved'); } } }, 'Save'))));
    form.scrollIntoView({ behavior: 'smooth' });
  };
  wrap.append(h('div', { class: 'rowhead' }, h('h3', { style: 'margin:0' }, hi('Team', 'टीम')), h('div', { class: 'chips' }, h('button', { class: 'btn alt sm', onclick: async () => { const { data, error } = await sb.rpc('staff_cards_bulk', { p_location: null }); if (error) return toast(friendly(error)); const m = await import('./staffcard.js'); m.bulkStaffPdf(data || [], 'save'); } }, '🪪 Print all staff cards'), h('button', { class: 'btn sm', onclick: () => edit(null) }, '+ Add member'))), pwbox, form, list);
  load();
  try { chan = sb.channel('team-' + c.id).on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'staff_invites' }, load).subscribe(); } catch {}
  const stop = () => { try { chan && sb.removeChannel(chan); } catch {} removeEventListener('hashchange', stop); };
  addEventListener('hashchange', stop);
  wrap.stop = stop;
  return wrap;
}
