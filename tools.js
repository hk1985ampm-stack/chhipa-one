import { sb, h, hi, toast, friendly, myLocations, optList } from './core.js';

const FIELDS = [['gotra', 'Gotra'], ['taluka', 'Taluka'], ['pincode', 'Pincode'], ['family_type', 'Family type'], ['house_type', 'House']];

export async function render(main, arg) {
  const locs = await myLocations();
  let tab = arg === 'bulk' ? 'bulk' : 'dup';
  const tabs = h('div', { class: 'chips' }), body = h('div');
  const drawTabs = () => tabs.replaceChildren(...[['dup', '👥 Duplicates'], ['bulk', '✏️ Bulk edit']].map(([k, t]) => h('button', { class: 'btn ' + (tab === k ? '' : 'alt'), onclick: () => { tab = k; drawTabs(); load(); } }, t)));
  const load = () => (tab === 'dup' ? dups() : bulk()).catch(e => body.replaceChildren(h('div', { class: 'card' }, friendly(e))));

  // ---------- duplicates
  async function dups() {
    body.replaceChildren(h('p', { class: 'muted' }, 'Looking for duplicates…'));
    const { data, error } = await sb.rpc('dup_candidates', { p_location: null }); if (error) throw error;
    const ign = JSON.parse(localStorage.getItem('chhipa_dup_ignore') || '[]');
    const list = data.filter(x => !ign.includes(x.a + x.b));
    const card = x => {
      const side = (id, code, fam, fid, label) => h('div', { class: 'card', style: 'margin:6px 0' }, h('div', { class: 'muted s' }, label), h('b', {}, code || 'pending'), h('div', { class: 'muted s' }, h('a', { href: '#family/' + fid }, fam ? 'Family ' + fam : 'No family')));
      const merge = async (keep, dup) => {
        if (!confirm('Keep ' + (keep === x.a ? x.a_code : x.b_code) + ' and merge the other into it? The other entry goes to Removed Entries and can be restored.')) return;
        const { error: e } = await sb.rpc('member_merge', { p_keep: keep, p_dup: dup, p_reason: 'Duplicate entry' });
        e ? toast(friendly(e)) : (toast('Merged'), dups());
      };
      return h('div', { class: 'card' }, h('b', {}, x.name), h('div', { class: 'muted s' }, 'Possible duplicate: ' + (x.why || 'same name')),
        side(x.a, x.a_code, x.a_family, x.a_family_id, 'Entry 1'), side(x.b, x.b_code, x.b_family, x.b_family_id, 'Entry 2'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => merge(x.a, x.b) }, 'Keep 1'), h('button', { class: 'btn', onclick: () => merge(x.b, x.a) }, 'Keep 2'),
          h('button', { class: 'btn alt', onclick: () => { ign.push(x.a + x.b); localStorage.setItem('chhipa_dup_ignore', JSON.stringify(ign)); dups(); } }, 'Different people')));
    };
    body.replaceChildren(h('p', { class: 'muted s' }, 'Same name plus same father, mobile or birth date. Merging fills blanks of the kept person and moves family links. Nothing is deleted.'),
      ...(list.length ? list.map(card) : [h('div', { class: 'card' }, '✔ No duplicates found')]));
  }

  // ---------- bulk edit
  async function bulk() {
    const loc = h('select', {}, locs.map(l => h('option', { value: l.id }, l.city))), fld = h('select', {}, FIELDS.map(([k, t]) => h('option', { value: k }, t)));
    const q = h('input', { type: 'search', placeholder: 'Filter by address text (optional)' }), empty = h('input', { type: 'checkbox' });
    const valBox = h('div'), list = h('div'), act = h('div'); let rows = [], picked = new Set(), valEl;
    const drawVal = () => {
      const f = fld.value, opts = f === 'gotra' || f === 'family_type' || f === 'house_type' ? optList(f) : null;
      valEl = opts ? h('select', {}, h('option', { value: '' }, '— choose —'), opts.map(o => h('option', {}, o))) : h('input', { placeholder: f === 'pincode' ? '6-digit pincode' : 'New value', inputmode: f === 'pincode' ? 'numeric' : 'text' });
      valBox.replaceChildren(h('label', {}, 'New value'), valEl);
    };
    const drawList = () => {
      list.replaceChildren(h('div', { class: 'card' }, rows.length ? [h('label', { class: 'item' }, h('input', { type: 'checkbox', onchange: e => { picked = new Set(e.target.checked ? rows.map(r => r.id) : []); drawList(); } }), ' Select all ' + rows.length),
        ...rows.map(r => h('label', { class: 'item' }, h('input', { type: 'checkbox', checked: picked.has(r.id), onchange: e => { e.target.checked ? picked.add(r.id) : picked.delete(r.id); act.firstChild.textContent = 'Apply to ' + picked.size + ' families'; } }),
          h('span', {}, h('b', {}, r.family_code || '—'), ' ', r.address || '', h('div', { class: 'muted s' }, FIELDS.map(([k, t]) => t + ': ' + (r[k] || '–')).join(' · '))))) ] : h('span', { class: 'muted' }, 'No families match.')));
      act.replaceChildren(h('button', { class: 'btn', onclick: apply }, 'Apply to ' + picked.size + ' families'));
    };
    const find = async () => {
      let qq = sb.from('families').select('id,family_code,address,gotra,taluka,pincode,family_type,house_type').eq('location_id', loc.value).eq('status', 'approved').is('removed_at', null).order('family_code').limit(300);
      if (q.value.trim()) qq = qq.ilike('address', '%' + q.value.trim().replace(/[%,]/g, '') + '%');
      if (empty.checked) qq = qq.or(fld.value + '.is.null,' + fld.value + '.eq.');
      const { data, error } = await qq; if (error) return toast(friendly(error));
      rows = data; picked = new Set(); drawList();
    };
    const apply = async () => {
      const v = valEl.value.trim(); if (!picked.size) return toast('Select families first'); if (!v) return toast('Enter the new value');
      if (!confirm('Set ' + FIELDS.find(f => f[0] === fld.value)[1] + ' = "' + v + '" for ' + picked.size + ' families?')) return;
      const { data, error } = await sb.rpc('family_bulk_update', { p_ids: [...picked], p_field: fld.value, p_value: v });
      if (error) return toast(friendly(error)); toast(data + ' families updated'); find();
    };
    fld.addEventListener('change', () => { drawVal(); }); drawVal();
    body.replaceChildren(h('div', { class: 'card' }, h('label', {}, 'Location'), loc, h('label', {}, 'Field to change'), fld, valBox, h('label', {}, 'Find families'), q,
      h('label', { class: 'item' }, empty, ' Only where this field is empty'), h('p', {}, h('button', { class: 'btn alt', onclick: find }, 'Find families'))), list, act);
  }
  main.append(h('h2', {}, hi('Clean-up Tools', 'सफ़ाई टूल')), tabs); main.append(body); drawTabs(); await load();
}
