import { sb, h, hi, toast, friendly } from './core.js';

export async function render(main) {
  const [c, l] = await Promise.all([
    sb.from('communities').select('*').order('name'),
    sb.from('locations').select('*').order('city')]);
  if (c.error || l.error) throw (c.error || l.error);
  const reload = () => { main.replaceChildren(); render(main); };

  // --- add community
  const cn = h('input', { placeholder: 'Chhipa Jamat Barar Welfare Society' });
  const cr = h('input', { placeholder: 'Registration no. (optional)' });
  const ct = h('select', {}, ['Welfare Society', 'Charitable Trust', 'Other'].map(x => h('option', {}, x)));
  const addC = async () => {
    if (!cn.value.trim()) return toast('Enter the community name');
    const { error } = await sb.from('communities').insert({ name: cn.value.trim(), org_type: ct.value, reg_no: cr.value.trim() || null });
    error ? toast(friendly(error)) : (toast('Community added'), reload());
  };

  // --- add location
  const cs = h('select', {}, c.data.map(x => h('option', { value: x.id }, x.name)));
  const code = h('input', { placeholder: 'AMT', maxlength: 5, style: 'text-transform:uppercase' });
  const city = h('input', { placeholder: 'City / Town / Village' });
  const tal = h('input', { placeholder: 'Taluka' }), dist = h('input', { placeholder: 'District' });
  const st = h('input', { value: 'Maharashtra' });
  const addL = async () => {
    const cd = code.value.trim().toUpperCase();
    if (!/^[A-Z]{2,5}$/.test(cd)) return toast('Code must be 2–5 capital letters, e.g. AMT');
    if (!city.value.trim()) return toast('Enter the city');
    if (!cs.value) return toast('Add a community first');
    const { error } = await sb.from('locations').insert({ community_id: cs.value, code: cd, city: city.value.trim(),
      taluka: tal.value.trim() || null, district: dist.value.trim() || null, state: st.value.trim() });
    error ? toast(/duplicate/i.test(error.message) ? 'That code is already used' : friendly(error)) : (toast('Location added'), reload());
  };

  main.append(
    h('h2', {}, hi('Locations', 'स्थान')),
    h('div', { class: 'card' }, h('h3', {}, 'Communities'),
      h('div', { class: 'list' }, c.data.length ? c.data.map(x => h('div', { class: 'item' }, h('span', {}, x.name), h('span', { class: 'pill ' + (x.status === 'active' ? 'active' : 'suspended') }, x.status)))
        : h('p', { class: 'muted' }, 'No community yet. Add the first one below.')),
      h('label', {}, 'Community name'), cn, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Type'), ct), h('div', {}, h('label', {}, 'Registration no.'), cr)),
      h('p', {}, h('button', { class: 'btn', onclick: addC }, '+ Add community'))),
    h('div', { class: 'card' }, h('h3', {}, 'Locations'),
      h('div', { class: 'list' }, l.data.length ? l.data.map(x => h('div', { class: 'item' },
        h('span', {}, h('b', {}, x.code), ' · ', x.city, x.district ? ', ' + x.district : '', ' · ', x.state),
        h('span', { class: 'muted' }, 'Last family no. ' + x.family_seq))) : h('p', { class: 'muted' }, 'No locations yet.')),
      h('label', {}, 'Community'), cs,
      h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Code (Family ID prefix)'), code), h('div', {}, h('label', {}, 'City'), city)),
      h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Taluka'), tal), h('div', {}, h('label', {}, 'District'), dist), h('div', {}, h('label', {}, 'State'), st)),
      h('p', {}, h('button', { class: 'btn', onclick: addL }, '+ Add location'))));
}
