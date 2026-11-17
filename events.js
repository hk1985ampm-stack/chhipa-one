import { sb, h, hi, toast, friendly, pill, state } from './core.js';

const TYPE = { marriage: 'Marriage', divorce: 'Divorce', separation: 'Separation', death: 'Death', branch: 'New household' };

export async function render(main) {
  let status = 'pending';
  const out = h('div'), chips = h('div', { class: 'row', style: 'margin:8px 0' });
  const me = state.profile, appr = ['super_admin', 'location_admin'].includes(me.role);
  const run = async () => {
    const q = sb.from('life_events').select('*').order('created_at', { ascending: false }).limit(100);
    const { data, error } = await (status ? q.eq('status', status) : q);
    if (error) return out.replaceChildren(h('p', { class: 'err' }, friendly(error)));
    if (!data.length) return out.replaceChildren(h('div', { class: 'card muted' }, 'Nothing here.'));
    out.replaceChildren(...data.map(e => {
      const own = e.submitted_by === me.user_id;
      const can = e.status === 'pending' && appr && (e.submitter_role === 'agent' ? true : me.role === 'super_admin') && (!own || me.role === 'super_admin');
      const why = h('input', { placeholder: 'Reason (needed to reject)' });
      const act = async d => { const { error } = await sb.rpc('life_review', { p_event: e.id, p_decision: d, p_reason: why.value || null });
        error ? toast(friendly(error)) : (toast(d === 'approved' ? 'Approved and applied' : 'Rejected'), run()); };
      return h('div', { class: 'card' }, h('div', { class: 'item' }, h('b', {}, TYPE[e.event_type]), pill(e.status)), h('div', {}, e.summary),
        h('div', { class: 'muted', style: 'font-size:14px' }, 'By ', e.submitter_name || 'staff', ' · ', new Date(e.created_at).toLocaleDateString(), e.reject_reason ? ' · Rejected: ' + e.reject_reason : ''),
        e.status === 'pending' && !can && appr ? h('div', { class: 'muted' }, own ? 'Another approver must review your own request.' : 'Needs Super Admin approval.') : null,
        can ? h('div', {}, why, h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => act('approved') }, '✓ Approve'), h('button', { class: 'btn bad', onclick: () => act('rejected') }, '✕ Reject'))) : null);
    }));
  };
  const draw = () => chips.replaceChildren(...[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']].map(([v, t]) =>
    h('button', { class: 'btn ' + (status === v ? '' : 'alt'), style: 'min-width:0', onclick: () => { status = v; draw(); run(); } }, t)));
  main.append(h('h2', {}, hi('Life Events', 'जीवन घटनाएँ')), h('p', { class: 'muted' }, 'Marriage, divorce, separation, death and new households are applied only after approval.'), chips, out);
  draw(); run();
}
