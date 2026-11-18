import { sb, h, hi, toast, friendly, pill, ROLE_LABEL } from './core.js';
import { brandingTab } from './branding.js';
import { teamTab } from './team.js';

const stat = (n, t) => h('div', { class: 'st' }, h('b', {}, String(n)), h('span', {}, t));
const stPill = s => h('span', { class: 'pill ' + (s === 'active' ? 'approved' : s === 'suspended' ? 'pending' : 'rejected') }, s);

export async function render(main, arg) {
  if (arg) return detail(main, arg);
  const { data, error } = await sb.rpc('community_overview');
  if (error) throw error;
  const reload = () => { main.replaceChildren(); render(main); };
  const cn = h('input', { placeholder: 'Community name · समुदाय का नाम' }), cr = h('input', { placeholder: 'Registration no. (optional)' });
  const ct = h('select', {}, ['Welfare Society', 'Charitable Trust', 'Other'].map(x => h('option', {}, x)));
  const add = async () => {
    if (!cn.value.trim()) return toast('Enter the community name');
    const { error: e } = await sb.from('communities').insert({ name: cn.value.trim(), org_type: ct.value, reg_no: cr.value.trim() || null });
    e ? toast(friendly(e)) : (toast('Community added'), reload());
  };
  main.append(...[
    h('h2', {}, hi('Communities', 'समुदाय')),
    !data.length ? h('div', { class: 'card muted' }, 'No community yet. Add the first one below.') : null,
    ...data.map(c => h('a', { class: 'card comm', href: '#communities/' + c.id },
      h('div', { class: 'item' }, h('b', {}, c.name), stPill(c.status)),
      h('div', { class: 'muted s' }, c.org_type + (c.reg_no ? ' · Reg. ' + c.reg_no : '')),
      h('div', { class: 'stats' }, stat(c.locations, 'Locations'), stat(c.families, 'Families'), stat(c.members, 'Members'), stat(c.admins, 'Admins'), stat(c.agents, 'Agents')))),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '+ Add community'), h('label', {}, 'Name'), cn,
      h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Type'), ct), h('div', {}, h('label', {}, 'Registration no.'), cr)),
      h('p', {}, h('button', { class: 'btn', onclick: add }, 'Add community')))].filter(Boolean));
}

async function detail(main, id) {
  const [ov, locs, ppl] = await Promise.all([sb.rpc('community_overview'), sb.from('locations').select('*').eq('community_id', id).order('city'), sb.rpc('community_people', { p_community: id })]);
  if (ov.error || locs.error || ppl.error) throw (ov.error || locs.error || ppl.error);
  const c = ov.data.find(x => x.id === id); if (!c) return main.append(h('p', { class: 'err' }, 'Community not found.'));
  const reload = () => { main.replaceChildren(); detail(main, id); };
  let tab = sessionStorage.getItem('comm_tab') || 'locations'; if (!['locations', 'team', 'branding'].includes(tab)) tab = 'locations';
  const body = h('div');
  const tabs = h('div', { class: 'chips' });
  const TABS = [['locations', 'Locations'], ['team', 'Team'], ['branding', 'Logo & Label']];
  const setStatus = async s => { if (s !== 'active' && !confirm('Deactivate this community? Its users will lose access until you reactivate it. No data is deleted.')) return;
    const { error } = await sb.rpc('community_set_status', { p_id: id, p_status: s }); error ? toast(friendly(error)) : (toast('Updated'), reload()); };

  const purge = async () => {
    const n = prompt('This deletes the community, its locations, families and members FOREVER.\nType the community name exactly to confirm:\n' + c.name);
    if (n === null) return;
    const { error } = await sb.rpc('community_purge', { p_id: id, p_name: n });
    error ? toast(friendly(error)) : (toast('Community deleted permanently'), location.hash = 'communities');
  };
  const draw = async () => {
    tabs.replaceChildren(...TABS.map(([k, t]) => h('button', { class: 'btn ' + (tab === k ? '' : 'alt'), onclick: () => { tab = k; sessionStorage.setItem('comm_tab', k); draw(); } }, t)));
    body.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    if (body.firstChild && body.firstChild.stop) body.firstChild.stop();
    body.replaceChildren(await ({ locations: tLocs, team: () => teamTab(c, locs.data), people: tPeople, families: tFams, members: tMems, branding: () => brandingTab(c, reload) })[tab]());
  };

  const tLocs = async () => {
    const code = h('input', { placeholder: 'AMT', maxlength: 5, style: 'text-transform:uppercase' }), city = h('input', { placeholder: 'City / Town / Village' });
    const tal = h('input', { placeholder: 'Taluka' }), dist = h('input', { placeholder: 'District' }), st = h('input', { value: 'Maharashtra' });
    const addL = async () => {
      const cd = code.value.trim().toUpperCase();
      if (!/^[A-Z]{2,5}$/.test(cd)) return toast('Code must be 2–5 capital letters, e.g. AMT');
      if (!city.value.trim()) return toast('Enter the city');
      const { error } = await sb.from('locations').insert({ community_id: id, code: cd, city: city.value.trim(), taluka: tal.value.trim() || null, district: dist.value.trim() || null, state: st.value.trim() });
      error ? toast(/duplicate/i.test(error.message) ? 'That code is already used' : friendly(error)) : (toast('Location added'), reload());
    };
    const famPanel = h('div');
    const showFams = async l => { famPanel.replaceChildren(h('p', { class: 'muted' }, 'Loading…')); const el = await tFams(l.id); famPanel.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'rowhead' }, h('h3', { style: 'margin:0' }, 'Family registry · ' + l.city), h('button', { class: 'btn alt sm', onclick: () => famPanel.replaceChildren() }, 'Close')), h('p', { class: 'muted s' }, 'Families belong to this location. Open one to see its members.')), el); famPanel.scrollIntoView({ behavior: 'smooth' }); };
    return h('div', {}, h('div', { class: 'card list' }, locs.data.length ? locs.data.map(l => h('div', { class: 'item' },
      h('span', {}, h('b', {}, l.code), ' · ', l.city, l.district ? ', ' + l.district : '', ' · ', l.state, h('div', { class: 'muted s' }, 'Last family no. ' + l.family_seq)),
      h('span', {}, stPill(l.status), ' ', h('button', { class: 'btn alt sm', onclick: () => showFams(l) }, 'Families'), ' ', h('button', { class: 'btn alt sm', onclick: async () => { const s = l.status === 'active' ? 'archived' : 'active';
        if (s === 'archived' && !confirm('Archive this location? Its users lose access. No data is deleted.')) return;
        const { error } = await sb.rpc('location_set_status', { p_id: l.id, p_status: s }); error ? toast(friendly(error)) : reload(); } }, l.status === 'active' ? 'Archive' : 'Restore')))) : h('p', { class: 'muted' }, 'No locations yet.')),
      h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '+ Add location'),
        h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Code (Family ID prefix)'), code), h('div', {}, h('label', {}, 'City'), city)),
        h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Taluka'), tal), h('div', {}, h('label', {}, 'District'), dist), h('div', {}, h('label', {}, 'State'), st)),
        h('p', {}, h('button', { class: 'btn', onclick: addL }, 'Add location'))));
  };

  const tPeople = async () => h('div', {}, h('div', { class: 'card list' }, ppl.data.length ? ppl.data.map(p => h('div', { class: 'item' },
    h('span', {}, h('b', {}, p.full_name), h('div', { class: 'muted s' }, p.email + ' · ' + (p.location_codes || []).join(', '))),
    h('span', {}, h('span', { class: 'muted s' }, ROLE_LABEL[p.role] || p.role), ' ', stPill(p.status), ' ', h('button', { class: 'btn alt sm', onclick: async () => { const { error } = await sb.rpc('staff_set_status', { p_user: p.user_id, p_status: p.status === 'active' ? 'revoked' : 'active' }); error ? toast(friendly(error)) : reload(); } }, p.status === 'active' ? 'Remove' : 'Restore')))) : h('p', { class: 'muted' }, 'No admins or agents assigned yet.')),
    h('p', {}, h('a', { class: 'btn', href: '#staff' }, 'Add / assign staff')));

  const locIds = locs.data.map(l => l.id), codeOf = Object.fromEntries(locs.data.map(l => [l.id, l.code]));
  const tFams = async (only) => {
    const { data, error } = locIds.length ? await sb.from('families').select('id,family_code,status,address,location_id,head_member_id').in('location_id', only ? [only] : locIds).order('family_code').limit(300) : { data: [] };
    if (error) return h('p', { class: 'err' }, friendly(error));
    const hid = data.map(f => f.head_member_id).filter(Boolean);
    const hn = hid.length ? (await sb.from('members').select('id,full_name').in('id', hid)).data || [] : [];
    const nm = Object.fromEntries(hn.map(m => [m.id, m.full_name]));
    return h('div', {}, data.length ? data.map(f => h('a', { class: 'card fam', href: '#family/' + f.id }, h('div', { class: 'item' }, h('b', {}, f.family_code || 'ID on approval'), pill(f.status)),
      h('div', {}, nm[f.head_member_id] || '—'), f.address ? h('div', { class: 'muted s' }, f.address) : null)) : h('p', { class: 'muted' }, 'No families yet.'), data.length >= 300 ? h('p', { class: 'muted' }, 'Showing the first 300. Use Family Registry search for others.') : null);
  };
  const tMems = async () => {
    const q = h('input', { type: 'search', placeholder: 'Search member name · खोजें' }), out = h('div');
    const run = async () => {
      let rq = locIds.length ? sb.from('members').select('id,member_code,full_name,gender,location_id,status').in('location_id', locIds).order('member_code').limit(200) : null;
      if (rq && q.value.trim()) rq = rq.ilike('full_name', '%' + q.value.trim() + '%');
      const { data, error } = rq ? await rq : { data: [] };
      if (error) return out.replaceChildren(h('p', { class: 'err' }, friendly(error)));
      out.replaceChildren(h('div', { class: 'card list' }, data.length ? data.map(m => h('div', { class: 'item' }, h('span', {}, h('b', {}, m.full_name), h('div', { class: 'muted s' }, [m.gender, codeOf[m.location_id], m.status !== 'active' ? m.status : null].filter(Boolean).join(' · '))), h('span', { class: 'muted s' }, m.member_code || ''))) : h('p', { class: 'muted' }, 'No members found.')));
    };
    let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 300); }); run();
    return h('div', {}, q, out);
  };

  main.append(h('div', { class: 'backlink noprint' }, h('a', { href: '#communities' }, '← Communities')),
    h('div', { class: 'card' }, h('div', { class: 'item' }, h('h2', { style: 'margin:0' }, c.name), stPill(c.status)),
      h('div', { class: 'stats' }, stat(c.locations, 'Locations'), stat(c.families, 'Families'), stat(c.members, 'Members'), stat(c.admins, 'Admins'), stat(c.agents, 'Agents')),
      h('p', { class: 'actions-card' }, c.status === 'active' ? h('button', { class: 'btn alt sm', onclick: () => setStatus('suspended') }, 'Deactivate community') : h('button', { class: 'btn sm', onclick: () => setStatus('active') }, 'Reactivate community'),
        c.status !== 'active' ? h('button', { class: 'btn bad sm', onclick: purge }, 'Delete permanently (test data)') : null)),
    tabs, body);
  draw();
}
