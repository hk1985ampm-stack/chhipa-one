import { sb, h, hi, toast, friendly, isApprover, state, pill } from './core.js';

const SHOW = { name: 'Name', father_name: 'Father', mother_name: 'Mother', gender: 'Gender', dob: 'Date of birth', age: 'Age', education: 'Education', occupation: 'Occupation', marital_status: 'Marital', mobile: 'Mobile',
  address: 'Address', gotra: 'Gotra', family_type: 'Family type', taluka: 'Taluka', pincode: 'Pincode', house_type: 'House', phone: 'Phone' };
const OLDKEY = { name: 'full_name' };
const diff = r => Object.keys(SHOW).filter(k => k in (r.new_data || {})).map(k => { const nv = String(r.new_data[k] ?? ''), ov = String((r.old_data || {})[OLDKEY[k] || k] ?? ''); return nv !== ov ? [SHOW[k], ov, nv] : null; }).filter(Boolean);

export async function render(main) {
  const appr = isApprover();
  let tab = appr ? 'review' : 'mine';
  const body = h('div'), tabs = h('div', { class: 'chips' });
  const drawTabs = () => tabs.replaceChildren(...(appr ? [['review', 'To review'], ['mine', 'My requests'], ['done', 'History']] : [['mine', 'My requests']]).map(([k, t]) => h('button', { class: 'btn ' + (tab === k ? '' : 'alt'), onclick: () => { tab = k; drawTabs(); load(); } }, t)));
  async function load() {
    body.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    let q = sb.from('change_requests').select('*').order('created_at', { ascending: false }).limit(100);
    q = tab === 'review' ? q.eq('status', 'pending').neq('requested_by', state.profile.user_id) : tab === 'mine' ? q.eq('requested_by', state.profile.user_id) : q.neq('status', 'pending');
    const { data, error } = await q; if (error) return body.replaceChildren(h('div', { class: 'card' }, friendly(error)));
    const act = async (r, ok) => { let why = ''; if (!ok) { why = prompt('Reason for rejecting'); if (why === null) return; } const { error: e } = await sb.rpc('change_request_review', { p_id: r.id, p_approve: ok, p_reason: why }); e ? toast(friendly(e)) : (toast(ok ? 'Approved and applied' : 'Rejected'), load()); };
    body.replaceChildren(...(data.length ? data.map(r => h('div', { class: 'card' },
      h('div', { class: 'item' }, h('span', {}, h('b', {}, r.label), h('div', { class: 'muted s' }, (r.kind === 'member_edit' ? 'Member edit' : 'Family details') + ' · ' + new Date(r.created_at).toLocaleString())), pill(r.status === 'pending' ? 'pending' : r.status === 'approved' ? 'approved' : 'rejected')),
      h('table', {}, h('tr', {}, ['Field', 'Now', 'Requested'].map(t => h('th', {}, t))), diff(r).map(([f, o, n]) => h('tr', {}, h('td', {}, f), h('td', {}, o || '–'), h('td', {}, h('b', {}, n || '–'))))),
      r.reject_reason ? h('p', { class: 'err' }, 'Rejected: ' + r.reject_reason) : null,
      tab === 'review' ? h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => act(r, true) }, '✓ Approve'), h('button', { class: 'btn bad', onclick: () => act(r, false) }, '✕ Reject')) : null)) : [h('div', { class: 'card muted' }, 'Nothing here.')]));
  }
  main.append(h('h2', {}, hi('Change Requests', 'बदलाव अनुरोध')), tabs, body); drawTabs(); await load();
}
