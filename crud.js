// Generic list + add/edit/delete page for the community modules (meetings, sevaks, announcements, events).
import { sb, h, hi, toast, friendly, myLocations, state, isApprover } from './core.js';

export async function crudPage(main, cfg) {
  const locs = await myLocations(), can = isApprover() && !state.profile.read_only;
  const locSel = h('select', {}, h('option', { value: '' }, 'All locations'), locs.map(l => h('option', { value: l.id }, l.city)));
  const out = h('div'), box = h('div'); let rows = [];
  const cityOf = id => (locs.find(l => l.id === id) || {}).city || '';
  const load = async () => {
    out.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    let q = sb.from(cfg.table).select('*').order(cfg.order[0], { ascending: cfg.order[1] }).limit(300); if (locSel.value) q = q.eq('location_id', locSel.value);
    const { data, error } = await q; if (error) return out.replaceChildren(h('div', { class: 'card err' }, friendly(error)));
    rows = data; draw();
  };
  const draw = () => out.replaceChildren(...(rows.length ? rows.map(r => {
    const [t, sub, body] = cfg.row(r);
    return h('div', { class: 'card item-card' }, h('div', { class: 'ic-head' }, h('b', {}, t), h('small', { class: 'muted' }, [cityOf(r.location_id), sub].filter(Boolean).join(' · '))), body ? h('p', { class: 'ic-body' }, body) : null,
      h('div', { class: 'chips' }, cfg.extra ? cfg.extra(r) : null, can ? h('button', { class: 'btn alt sm', onclick: () => form(r) }, '✏️ Edit') : null, can ? h('button', { class: 'btn alt bad sm', onclick: () => del(r) }, 'Delete') : null));
  }) : [h('div', { class: 'card muted' }, 'Nothing here yet.')]));
  const del = async r => { if (!confirm('Delete this entry? This is recorded in the audit log.')) return; const { error } = await sb.from(cfg.table).delete().eq('id', r.id); if (error) return toast(friendly(error)); toast('Deleted'); load(); };
  const form = (r) => {
    const els = {}, lsel = h('select', {}, locs.map(l => h('option', { value: l.id, selected: r && r.location_id === l.id }, l.city)));
    const flds = cfg.fields.map(f => {
      let el; const v = r ? r[f.k] : (f.def != null ? f.def : '');
      if (f.type === 'textarea') el = h('textarea', { rows: f.rows || 4 }, v || '');
      else if (f.type === 'select') el = h('select', {}, f.opts.map(o => h('option', { value: o, selected: v === o }, o)));
      else if (f.type === 'checkbox') el = h('input', { type: 'checkbox', checked: !!v });
      else el = h('input', { type: f.type || 'text', value: v == null ? '' : v, inputmode: f.type === 'number' ? 'numeric' : null, placeholder: f.ph || '' });
      els[f.k] = el; return h('div', {}, h('label', {}, f.label + (f.req ? ' *' : '')), el);
    });
    const err = h('p', { class: 'err' });
    box.replaceChildren(h('div', { class: 'card' }, h('h3', {}, r ? 'Edit' : 'Add new'), h('label', {}, 'Location *'), lsel, flds,
      err, h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => box.replaceChildren() }, 'Cancel'), h('button', { class: 'btn', onclick: async ev => {
        const p = { location_id: lsel.value }; for (const f of cfg.fields) { const el = els[f.k]; let v = f.type === 'checkbox' ? el.checked : el.value.trim(); if (f.req && !v) return (err.textContent = f.label + ' is required'); if (v === '' || v == null) v = null; else if (f.type === 'number') v = +v; p[f.k] = v; }
        ev.target.disabled = true; const res = r ? await sb.from(cfg.table).update(p).eq('id', r.id) : await sb.from(cfg.table).insert({ ...p, created_by: state.profile.user_id });
        if (res.error) { ev.target.disabled = false; return (err.textContent = friendly(res.error)); } box.replaceChildren(); toast('Saved'); load(); } }, 'Save'))));
    box.scrollIntoView({ behavior: 'smooth' });
  };
  main.append(h('div', { class: 'rowhead' }, h('h2', {}, cfg.title), can ? h('button', { class: 'btn sm', onclick: () => form(null) }, '+ Add') : null), h('div', { class: 'card' }, h('label', {}, 'Location'), locSel), box, out);
  locSel.addEventListener('change', load); await load();
}
