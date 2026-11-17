import { sb, h, hi, toast, friendly, pill, age, isApprover, field } from './core.js';
import { FAMILY_TYPES, RELATIONS } from './options.js';
import { memberForm } from './memberform.js';

const relLabel = r => (RELATIONS.find(x => x[0] === r) || [r, r])[1];

export async function render(main, id) {
  const [f, ms] = await Promise.all([
    sb.from('families').select('*, locations(code,city,state)').eq('id', id).maybeSingle(),
    sb.from('family_memberships').select('id,relation,is_active,created_at, members(id,member_code,full_name,father_name,gender,dob,status,education,occupation,marital_status,record_state, member_contacts(mobile))')
      .eq('family_id', id).order('created_at')]);
  if (f.error || ms.error) throw (f.error || ms.error);
  if (!f.data) return main.append(h('p', { class: 'err' }, 'Family not found, or you do not have access.'));
  const fam = f.data, reload = () => { main.replaceChildren(); render(main, id); };
  const rows = ms.data.filter(x => x.members).sort((a, b) => (b.relation === 'head') - (a.relation === 'head'));
  const active = rows.filter(x => x.is_active && x.members.status === 'active').length;
  const mobile = m => { const c = m.member_contacts; return (Array.isArray(c) ? c[0] : c)?.mobile || ''; };

  const review = async (decision, reason) => {
    const { error } = await sb.rpc('family_review', { p_family: id, p_decision: decision, p_reason: reason || null });
    error ? toast(friendly(error)) : (toast(decision === 'approved' ? 'Approved' : 'Rejected'), reload());
  };
  const actions = h('div');
  if (fam.status === 'pending' && isApprover()) {
    const why = h('input', { placeholder: 'Reason for rejection' });
    actions.append(h('div', { class: 'card' }, h('b', {}, 'Pending your review · समीक्षा लंबित'),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => review('approved') }, '✓ Approve'),
        h('button', { class: 'btn bad', onclick: () => review('rejected', why.value) }, '✕ Reject')), why));
  }
  if (fam.status === 'rejected') actions.append(h('div', { class: 'card err' }, 'Rejected: ', fam.rejection_reason || ''));

  // edit family details (approvers only; uses the version number to catch simultaneous edits)
  const editBox = h('div');
  const editFam = () => {
    const a = h('textarea', { rows: 3 }, fam.address || ''), g = h('input', { value: fam.gotra || '' }), p = h('input', { type: 'tel', value: fam.phone || '' });
    const t = h('select', {}, h('option', { value: '' }, '—'), FAMILY_TYPES.map(x => h('option', { value: x[0], selected: x[0] === fam.family_type }, x[1])));
    editBox.replaceChildren(h('div', { class: 'card' }, field('Address', a), field('Gotra', g), field('Family type', t), field('Contact number', p),
      h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => editBox.replaceChildren() }, 'Cancel'), h('button', { class: 'btn', onclick: async () => {
        const { data, error } = await sb.from('families').update({ address: a.value.trim() || null, gotra: g.value.trim() || null, family_type: t.value || null, phone: p.value.trim() || null })
          .eq('id', id).eq('version', fam.version).select('id');
        if (error) return toast(friendly(error));
        if (!data.length) return toast('Someone else changed this family just now. Reloading the latest version.') || reload();
        toast('Saved'); reload();
      } }, 'Save'))));
  };

  const addBox = h('div');
  const addMember = () => {
    const mf = memberForm({});
    addBox.replaceChildren(h('div', { class: 'card' }, h('h3', {}, 'Add member'), mf.el,
      h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => addBox.replaceChildren() }, 'Cancel'), h('button', { class: 'btn', onclick: async () => {
        const e = mf.validate(); if (e) return toast(e);
        const { error } = await sb.rpc('member_add', { p_family: id, p: mf.read() });
        error ? toast(friendly(error)) : (toast('Member added'), reload());
      } }, 'Add'))));
  };
  const canEdit = isApprover() && fam.status === 'approved';

  main.append(
    h('p', {}, h('a', { href: '#registry' }, '← Registry')),
    h('div', { class: 'card' }, h('div', { class: 'item' }, h('h2', { style: 'margin:0' }, fam.family_code || 'Family ID on approval'), pill(fam.status)),
      h('div', {}, fam.locations.city, ', ', fam.locations.state), fam.address ? h('div', {}, fam.address) : null,
      h('div', { class: 'muted' }, [fam.gotra && 'Gotra ' + fam.gotra, fam.family_type, fam.phone].filter(Boolean).join(' · ')),
      h('div', { style: 'margin-top:8px' }, h('b', {}, 'Active members: ', active), ' of ', rows.length, ' on record'),
      canEdit ? h('p', {}, h('button', { class: 'btn alt', onclick: editFam }, 'Edit details'), ' ', h('button', { class: 'btn', onclick: addMember }, '+ Add member')) : null),
    actions, editBox, addBox,
    h('h3', {}, 'Members · सदस्य'),
    rows.map(r => { const m = r.members, hist = !(r.is_active && m.status === 'active');
      return h('div', { class: 'card mem' + (hist ? ' grey' : '') },
        h('div', { class: 'item' }, h('span', {}, h('b', {}, m.full_name), ' · ', relLabel(r.relation)), m.member_code ? h('span', { class: 'muted' }, m.member_code) : pill(m.record_state)),
        h('div', { class: 'muted', style: 'font-size:14px' }, [m.gender, m.dob && age(m.dob) + ' yrs', m.marital_status, m.education, m.occupation, mobile(m), hist ? (m.status === 'deceased' ? 'Deceased' : 'Historical') : null].filter(Boolean).join(' · ')));
    }));
}
