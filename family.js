import { sb, h, hi, toast, friendly, pill, age, isApprover, field, ageText, state } from './core.js';
import { REL_LABELS } from './options.js';
import { memberForm, selectOther } from './memberform.js';
import { cached } from './offline.js';
import { photoUrl, pickPhoto, uploadPhotos } from './photo.js';
import { familyCardPdf } from './pdf.js';
import { myLocations } from './core.js';
const initials = n => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
import { optList } from './core.js';

const relLabel = r => REL_LABELS[r] || r;
const today = () => new Date().toISOString().slice(0, 10);
const REASON = { married: 'Married — moved to husband’s family', removed: 'Removed (wrong / test entry)', divorced: 'Divorced — left this family', separated: 'Separated — left this family', branch: 'Moved to a separate household' };

export async function render(main, id) {
  const q1 = () => sb.from('families').select('*, locations(code,city,state)').eq('id', id).maybeSingle();
  const q2 = () => sb.from('family_memberships').select('id,relation,is_active,end_date,reason,created_at, members(id,member_code,full_name,father_name,gender,dob,birth_year_est,photo_path,status,education,occupation,marital_status,record_state,mother_name,version,removed_at,removed_reason, member_contacts(mobile,whatsapp,email))').eq('family_id', id);
  const q3 = () => sb.from('family_history').select('*').eq('family_id', id).order('created_at', { ascending: false });
  const [f, ms, hs] = await Promise.all([cached('fam_' + id, q1), cached('mem_' + id, q2), cached('his_' + id, q3)]);
  const offline = f.offline || ms.offline;
  if (f.error || ms.error) throw (f.error || ms.error);
  if (!f.data) return main.append(h('p', { class: 'err' }, 'Family not found, or you do not have access.'));
  const fam = f.data, reload = () => { main.replaceChildren(); render(main, id); };

  // one line per person: the active membership if there is one, otherwise the latest historical one
  const by = new Map();
  for (const r of ms.data) { if (!r.members) continue; const c = by.get(r.members.id);
    if (!c || (r.is_active && !c.is_active) || (r.is_active === c.is_active && r.created_at > c.created_at)) by.set(r.members.id, r); }
  const rows = [...by.values()].sort((a, b) => (b.relation === 'head') - (a.relation === 'head') || b.is_active - a.is_active || (a.created_at > b.created_at ? 1 : a.created_at < b.created_at ? -1 : (a.members.member_code || a.members.id) > (b.members.member_code || b.members.id) ? 1 : -1));
  const live = r => r.is_active && r.members.status === 'active' && !r.members.removed_at;
  const active = rows.filter(live).length;
  const names = Object.fromEntries(rows.map(r => [r.members.id, r.members.full_name]));
  const mids = rows.map(r => r.members.id);
  const mobile = m => { const c = m.member_contacts; return (Array.isArray(c) ? c[0] : c)?.mobile || ''; };

  const [mar, pend] = await Promise.all([
    mids.length ? sb.from('marriages').select('*').or(`member1_id.in.(${mids}),member2_id.in.(${mids})`) : { data: [] },
    sb.from('life_events').select('id,summary,payload').eq('status', 'pending').eq('location_id', fam.location_id)]);
  const marriages = mar.data || [];
  const others = [...new Set(marriages.flatMap(x => [x.member1_id, x.member2_id]).filter(x => !names[x]))];
  if (others.length) { const { data } = await sb.from('members').select('id,full_name').in('id', others); (data || []).forEach(x => (names[x.id] = x.full_name)); }
  const pending = (pend.data || []).filter(e => mids.some(m => JSON.stringify(e.payload).includes(m)) || e.payload.family_id === id);

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
  if (pending.length) actions.append(h('a', { class: 'card dupwarn', href: '#events', style: 'display:block;text-decoration:none;color:inherit' }, h('b', {}, pending.length + ' life-event request(s) waiting for approval'), h('div', { class: 'muted' }, pending.map(e => e.summary).join(' · '))));

  const box = h('div');   // holds whichever form is open
  const close = () => box.replaceChildren();
  const send = async (type, payload, btn) => {
    btn.disabled = true;
    const { error } = await sb.rpc('life_submit', { p_type: type, p: payload });
    if (error) { btn.disabled = false; return toast(friendly(error)); }
    toast('Submitted for approval'); reload();
  };
  const card = (title, ...kids) => { box.replaceChildren(h('div', { class: 'card' }, h('h3', {}, title), ...kids)); box.scrollIntoView({ behavior: 'smooth' }); };
  const dateIn = () => h('input', { type: 'date', max: today() });
  const sub = (label, onclick) => { const b = h('button', { class: 'btn' }, label); b.addEventListener('click', () => onclick(b)); return b; };
  const bar = (...b) => h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: close }, 'Cancel'), ...b);

  // ---- life event forms
  function marriageForm(r) {
    const m = r.members, code = h('input', { placeholder: 'Spouse Member ID, e.g. M-000123', style: 'text-transform:uppercase' });
    const out = h('div'); let sp = null;
    const who = h('select'); const date = dateIn();
    const submit = sub('Submit for approval', b => {
      if (!sp) return toast('Verify the spouse’s Member ID first'); if (!date.value) return toast('Enter the marriage date');
      const meMoves = who.value === 'me';
      send('marriage', { member_id: meMoves ? m.id : sp.member_id, spouse_member_id: meMoves ? sp.member_id : m.id, date: date.value }, b);
    });
    submit.disabled = true;
    const verify = async () => {
      const { data, error } = await sb.rpc('lookup_member', { p_code: code.value });
      if (error || !data || !data.length) { sp = null; submit.disabled = true; return out.replaceChildren(h('p', { class: 'err' }, 'No approved member found with this ID.')); }
      sp = data[0]; submit.disabled = false;
      who.replaceChildren(h('option', { value: 'me', selected: m.gender === 'female' }, `${m.full_name} moves to ${sp.full_name}’s family`),
        h('option', { value: 'them', selected: m.gender !== 'female' }, `${sp.full_name} moves to ${m.full_name}’s family`));
      out.replaceChildren(h('div', { class: 'card' }, h('b', {}, sp.full_name), sp.father_name ? ' s/o ' + sp.father_name : '', h('div', { class: 'muted' }, [sp.member_code, sp.family_code && 'Family ' + sp.family_code, sp.city, sp.gender, ageText(sp), sp.marital_status].filter(Boolean).join(' · ')),
        sp.member_status === 'deceased' || ['Married', 'Separated'].includes(sp.marital_status) ? h('div', { class: 'err' }, 'Check carefully: this person is recorded as ' + (sp.member_status === 'deceased' ? 'deceased' : sp.marital_status) + '.') : null),
        field('Who moves to the other family? · कौन जाएगा?', who));
    };
    card('Marriage · विवाह — ' + m.full_name, field('Spouse’s Member ID', code), h('p', {}, h('button', { class: 'btn alt', onclick: verify }, 'Verify')), out, field('Marriage date · विवाह तिथि', date),
      h('p', { class: 'muted' }, 'After approval, the person who moves is greyed out in the old family and appears in the new family. Nothing is deleted.'), bar(submit));
  }
  function endForm(r, type, mr) {
    const m = r.members, pid = mr.member1_id === m.id ? mr.member2_id : mr.member1_id;
    const ret = h('select', {}, h('option', { value: m.id, selected: m.gender === 'female' }, `${m.full_name} returns to their birth family`),
      h('option', { value: pid, selected: m.gender !== 'female' }, `${names[pid] || 'Spouse'} returns to their birth family`));
    const date = dateIn(), kind = h('select', {}, [['divorce', 'Divorced · तलाक'], ['separation', 'Separated · अलग']].map(([v, t]) => h('option', { value: v, selected: v === type }, t)));
    if (mr.status === 'separated') kind.value = 'divorce';
    card('Divorce / Separation — ' + m.full_name + ' & ' + (names[pid] || 'spouse'), field('Type', kind), field('Effective date · प्रभावी तिथि', date), field('Who returns to their birth family?', ret),
      h('p', { class: 'muted' }, 'Divorce and separation are recorded separately. After approval the returning person becomes an active member of the birth family and is greyed out in the other.'),
      bar(sub('Submit for approval', b => date.value ? send(kind.value, { marriage_id: mr.id, returning_member_id: ret.value, effective_date: date.value }, b) : toast('Enter the effective date'))));
  }
  function deathForm(r) {
    const date = dateIn();
    card('Death · मृत्यु — ' + r.members.full_name, field('Date of death · मृत्यु तिथि', date),
      h('p', { class: 'muted' }, 'The record is kept as deceased. Any spouse becomes widowed. Nothing is deleted.'),
      bar(sub('Submit for approval', b => date.value ? send('death', { member_id: r.members.id, death_date: date.value }, b) : toast('Enter the date'))));
  }
  function branchForm(r) {
    const partners = marriages.filter(x => x.status === 'married' && [x.member1_id, x.member2_id].includes(r.members.id)).map(x => x.member1_id === r.members.id ? x.member2_id : x.member1_id);
    const boxes = rows.filter(x => live(x) && x.members.id !== r.members.id && x.relation !== 'head').map(x => ({ id: x.members.id, el: h('input', { type: 'checkbox', checked: partners.includes(x.members.id) }), x }));
    const addr = h('textarea', { rows: 2 }, fam.address || '');
    card('Separate household · अलग परिवार — ' + r.members.full_name,
      h('p', { class: 'muted' }, 'Creates a new family with its own Family ID, linked to this family. Tick who moves with ' + r.members.full_name + ' (wife, children).'),
      ...boxes.map(b => h('label', { class: 'chk' }, b.el, `${b.x.members.full_name} · ${relLabel(b.x.relation)}`)), field('New address', addr),
      bar(sub('Submit for approval', b => send('branch', { family_id: id, son_member_id: r.members.id, member_ids: boxes.filter(x => x.el.checked).map(x => x.id), address: addr.value.trim() }, b))));
  }
  function headForm() {
    const cands = rows.filter(r => live(r) && r.relation !== 'head'); const spouse = cands.find(r => r.relation === 'spouse');
    const sel = h('select', {}, cands.map(r => h('option', { value: r.members.id, selected: spouse ? r === spouse : false }, `${r.members.full_name} · ${relLabel(r.relation)}`)));
    const why = h('input', { placeholder: 'Reason (e.g. passed away)' });
    card('Change family head · मुखिया बदलें', field('New head', sel), field('Reason', why), bar(sub('Save', async b => {
      b.disabled = true; const { error } = await sb.rpc('family_set_head', { p_family: id, p_new_head: sel.value, p_reason: why.value });
      error ? (b.disabled = false, toast(friendly(error))) : (toast('Head changed'), reload()); })));
  }

  // ---- edit details / add member (admins)
  function editFam() {
    const a = h('textarea', { rows: 3 }, fam.address || ''), g = selectOther(optList('gotra'), fam.gotra), p = h('input', { type: 'tel', value: fam.phone || '' }), t = selectOther(optList('family_type'), fam.family_type);
    const tl = h('input', { value: fam.taluka || '' }), pn = h('input', { type: 'tel', maxlength: 6, value: fam.pincode || '' }), hs2 = selectOther(optList('house_type'), fam.house_type), qt = h('input', { value: fam.quote || '', placeholder: 'Together We Build a Stronger Community' });
    card('Edit details', field('Address', a), field('Gotra · गोत्र', g.el), field('Family type', t.el), h('div', { class: 'row' }, field('Taluka', tl), field('Pincode', pn)), field('House', hs2.el), field('Card footer quote', qt), field('Contact number', p), bar(sub('Save', async () => {
      if (!direct) { const { error: er } = await sb.rpc('change_request_submit', { p_kind: 'family_edit', p_target: id, p: { address: a.value.trim(), gotra: g.get() || '', family_type: t.get() || '', phone: p.value.trim(), taluka: tl.value.trim(), pincode: pn.value.trim(), house_type: hs2.get() || '' } }); return er ? toast(friendly(er)) : (toast('Sent to your admin for approval'), close()); }
      const { data, error } = await sb.from('families').update({ address: a.value.trim() || null, gotra: g.get() || null, family_type: t.get() || null, phone: p.value.trim() || null, taluka: tl.value.trim() || null, pincode: pn.value.trim() || null, house_type: hs2.get() || null, quote: qt.value.trim() || null }).eq('id', id).eq('version', fam.version).select('id');
      if (error) return toast(friendly(error));
      if (!data.length) { toast('Someone else changed this family just now. Showing the latest version.'); return reload(); }
      toast('Saved'); reload(); })));
  }
  function addMember() {
    const head = rows.find(r => r.relation === 'head'), sp = rows.find(r => r.relation === 'spouse' && live(r));
    const ctx = { head: head && { name: head.members.full_name, gender: head.members.gender, father_name: head.members.father_name }, spouse: sp && { name: sp.members.full_name },
      people: rows.filter(live).map(r => ({ v: r.members.id, label: r.members.full_name, relation: r.relation, gender: r.members.gender })) };
    const mf = memberForm({}, { ctx });
    card('Add member · सदस्य जोड़ें', mf.el, bar(sub('Add', async b => {
      const e = mf.validate(); if (e) return toast(e); b.disabled = true;
      const { error } = await sb.rpc('member_add', { p_family: id, p: mf.read() });
      error ? (b.disabled = false, toast(friendly(error))) : (toast('Member added'), reload()); })));
  }

  const canEdit = isApprover() && fam.status === 'approved' && !offline && !fam.removed_at;
  const ro = !!state.profile.read_only, ownOpen = !ro && !isApprover() && fam.created_by === state.profile.user_id && ['pending', 'rejected'].includes(fam.status) && !offline && !fam.removed_at;
  const canRequest = !ro && !isApprover() && fam.status === 'approved' && !offline && !fam.removed_at;   // agents propose, admin approves
  const direct = isApprover() || ownOpen;
  const transfer = async () => {
    const ls = (await myLocations()).filter(l => l.id !== fam.location_id); if (!ls.length) return toast('You have no other location to move this family to');
    const sel = h('select', {}, ls.map(l => h('option', { value: l.id }, l.city))), why = h('input', { placeholder: 'Reason, e.g. moved house' }), err = h('p', { class: 'err' }), box = h('div', { class: 'card' });
    box.append(h('h3', {}, 'Transfer to another location'), h('p', { class: 'muted s' }, 'The Family ID stays the same. The move is recorded in the history.'), h('label', {}, 'Move to'), sel, h('label', {}, 'Reason *'), why, err,
      h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => box.remove() }, 'Cancel'), h('button', { class: 'btn', onclick: async ev => { ev.target.disabled = true; const { error } = await sb.rpc('family_transfer', { p_family: fam.id, p_to: sel.value, p_reason: why.value }); if (error) { ev.target.disabled = false; return (err.textContent = friendly(error)); } toast('Family transferred'); location.reload(); } }, 'Transfer')));
    document.querySelector('main').append(box); box.scrollIntoView({ behavior: 'smooth' });
  };
  const canRemoveFam = !offline && !fam.removed_at && (isApprover() || (fam.created_by === state.profile.user_id && ['draft', 'pending', 'rejected'].includes(fam.status)));
  const isSuper = state.profile.role === 'super_admin';
  const headRow = rows.find(r => r.relation === 'head');
  const headGone = headRow && headRow.members.status === 'deceased' && canEdit;

  // per-member "Life event" menu
  const menu = r => {
    const m = r.members; if (!live(r) || fam.status !== 'approved' || offline) return null;
    const mr = marriages.find(x => x.record_state === 'approved' && [x.member1_id, x.member2_id].includes(m.id) && ['married', 'separated'].includes(x.status));
    const o = [];
    if (!mr && !['Married', 'Separated'].includes(m.marital_status)) o.push(['marriage', 'Marriage · विवाह']);
    if (mr && mr.status === 'married') o.push(['separation', 'Separation · अलग'], ['divorce', 'Divorce · तलाक']);
    if (mr && mr.status === 'separated') o.push(['divorce', 'Divorce · तलाक']);
    o.push(['death', 'Death · मृत्यु']);
    if (r.relation !== 'head' && m.gender === 'male') o.push(['branch', 'Separate household · अलग परिवार']);
    if (isApprover() && r.relation !== 'head') o.push(['head', 'Make family head']);
    const s = h('select', { class: 'evsel' }, h('option', { value: '' }, 'Life event ▾'), o.map(([v, t]) => h('option', { value: v }, t)));
    s.addEventListener('change', () => { const v = s.value; s.value = '';
      ({ marriage: () => marriageForm(r), separation: () => endForm(r, 'separation', mr), divorce: () => endForm(r, 'divorce', mr), death: () => deathForm(r), branch: () => branchForm(r),
         head: () => { headForm(); } })[v](); });
    return s;
  };

  const say = x => { const d = x.detail || {}, n = names[x.member_id] || 'A member';
    return ({ marriage_out: `${n} married and moved to another family`, marriage_in: `${n} joined this family by marriage`, divorced_out: `${n} left after divorce`, separated_out: `${n} left after separation`,
      divorced_returned: `${n} returned to this family after divorce`, separated_returned: `${n} returned to this family after separation`, death: `${n} passed away`,
      head_change: `Family head changed to ${names[d.new] || n}${d.reason ? ' (' + d.reason + ')' : ''}`, branch_created: `${n} started a separate household ${d.new_code || ''}`, branch_origin: `${n}'s household began from family ${d.parent_code || ''}` })[x.event] || x.event; };

  const ask = (q, def) => { const v = prompt(q, def || ''); return v === null ? null : v.trim(); };
  const run = async (promise, ok) => { const { error } = await promise; error ? toast(friendly(error)) : (toast(ok), reload()); };
  const removeFam = () => { const r = ask('Why remove this family? (wrong entry / test run …)'); if (r) run(sb.rpc('family_remove', { p_id: id, p_reason: r }), 'Family removed'); };
  const purgeFam = () => { if (ask('This deletes the family and its members FOREVER.\nType DELETE to confirm') === 'DELETE') sb.rpc('purge_family', { p_id: id, p_confirm: 'DELETE' }).then(({ error }) => error ? toast(friendly(error)) : (toast('Deleted permanently'), location.hash = 'registry')); };
  const removeMem = m => { const r = ask('Why remove ' + m.full_name + '?'); if (r) run(sb.rpc('member_remove', { p_id: m.id, p_reason: r }), 'Member removed'); };
  const purgeMem = m => { if (ask('Delete ' + m.full_name + ' FOREVER?\nType DELETE to confirm') === 'DELETE') run(sb.rpc('purge_member', { p_id: m.id, p_confirm: 'DELETE' }), 'Deleted permanently'); };
  function editMember(r) {
    const m = r.members, c = Array.isArray(m.member_contacts) ? m.member_contacts[0] : m.member_contacts;
    const mf = memberForm({ name: m.full_name, relation: r.relation, gender: m.gender, dob: m.dob, age: m.birth_year_est ? new Date().getFullYear() - m.birth_year_est : '', father_name: m.father_name, mother_name: m.mother_name,
      education: m.education, occupation: m.occupation, marital_status: m.marital_status, mobile: c && c.mobile, whatsapp: c && c.whatsapp, email: c && c.email }, { fixedRelation: r.relation });
    card('Edit member · ' + m.full_name, mf.el, bar(sub('Save', async b => {
      const e = mf.validate(); if (e) return toast(e); b.disabled = true;
      const { photo, ...pl } = mf.read();
      if (!direct) { const { error: er } = await sb.rpc('change_request_submit', { p_kind: 'member_edit', p_target: m.id, p: pl }); if (er) { b.disabled = false; return toast(friendly(er)); } toast('Sent to your admin for approval'); return close(); }
      const { data, error } = await sb.rpc('member_update', { p_id: m.id, p: pl, p_version: m.version });
      if (error) { b.disabled = false; return toast(friendly(error)); }
      if (!data) { toast('Someone else changed this member just now. Showing the latest.'); return reload(); }
      if (photo && photo.startsWith('data:')) await uploadPhotos([m.id], [{ index: 0, data: photo }]);
      toast('Saved'); reload(); })));
  }
  const memAvatar = m => { const b = h('div', { class: 'ph sm' }, initials(m.full_name)); if (m.photo_path) photoUrl(m.photo_path).then(u => { if (u) b.replaceChildren(h('img', { src: u, alt: '' })); }); return b; };

  const hm = headRow && headRow.members;
  const hmobile = hm ? mobile(hm) : '';
  const photoBox = h('div', { class: 'ph' }, hm ? initials(hm.full_name) : '?');
  if (hm && hm.photo_path) photoUrl(hm.photo_path).then(u => { if (u) photoBox.replaceChildren(h('img', { src: u, alt: '' })); });
  const heroCard = () => h('div', { class: 'hero' },
    h('div', { class: 'hero-top' }, h('div', { class: 'ph-wrap' }, photoBox, hm ? h('button', { class: 'ph-btn noprint', title: 'Change photo', onclick: () => pickPhoto(hm.id, reload) }, '📷') : null),
      h('div', { class: 'hero-txt' }, h('h2', {}, hm ? hm.full_name : 'Family'), h('div', { class: 'hero-id' }, fam.family_code || 'ID on approval', ' ', pill(fam.status)),
        h('div', {}, '📍 ', [fam.locations.city, fam.taluka, fam.locations.state].filter(Boolean).join(', ')), fam.address ? h('div', {}, '🏠 ', fam.address) : null,
        fam.gotra ? h('span', { class: 'gotra' }, '✦ Gotra: ' + fam.gotra) : null)),
    h('div', { class: 'hero-btns' },
      hmobile ? h('a', { class: 'hb call', href: 'tel:' + hmobile }, h('b', {}, '📞 Call'), h('span', {}, hmobile)) : h('div', { class: 'hb off' }, h('b', {}, '📞 Call'), h('span', {}, 'No number')),
      hmobile ? h('a', { class: 'hb wa', target: '_blank', rel: 'noopener', href: 'https://wa.me/91' + hmobile }, h('b', {}, '💬 WhatsApp'), h('span', {}, 'Send message')) : h('div', { class: 'hb off' }, h('b', {}, '💬 WhatsApp'), h('span', {}, 'No number')),
      h('button', { class: 'hb pdf', onclick: async e => { const b = e.currentTarget; b.disabled = true; try { await familyCardPdf(fam, rows.filter(live)); } catch (x) { toast(friendly(x)); } b.disabled = false; } }, h('b', {}, '📄 PDF'), h('span', {}, 'Download card'))),
    h('div', { class: 'hero-links noprint' }, h('a', { href: '#registry' }, '← Registry'), h('a', { href: '#card/' + id }, '🖨 View / Print')));
  const tile = (k, v) => h('div', { class: 'it' }, h('span', {}, k), h('b', {}, v || '—'));
  const infoGrid = () => h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Family Information'),
    h('div', { class: 'igrid' }, tile('Family ID', fam.family_code), tile('Head of family', hm && hm.full_name), tile('Mobile', hmobile || fam.phone), tile('Gotra', fam.gotra),
      tile('State', fam.locations.state), tile('City', fam.locations.city), tile('Taluka', fam.taluka), tile('Pincode', fam.pincode), tile('House', fam.house_type), tile('Family type', fam.family_type),
      tile('Active members', String(active) + ' of ' + rows.length), fam.quote ? tile('Footer quote', fam.quote) : null, h('div', { class: 'it wide' }, h('span', {}, 'Address'), h('b', {}, fam.address || '—'))));

  main.append(...[
    offline ? h('div', { class: 'card offl' }, '📴 Offline · showing the copy saved on this phone (read only)') : null,
    heroCard(),
    infoGrid(),
    canEdit ? h('div', { class: 'card actions-card' }, h('button', { class: 'btn alt', onclick: editFam }, 'Edit details'), h('button', { class: 'btn', onclick: addMember }, '+ Add member'), h('button', { class: 'btn alt', onclick: headForm }, 'Change head')) : null,
    !canEdit && (canRequest || ownOpen) ? h('div', { class: 'card actions-card' }, h('button', { class: 'btn alt', onclick: editFam }, direct ? 'Edit details' : 'Request change'), ownOpen ? h('button', { class: 'btn alt', onclick: addMember }, '+ Add member') : null,
      fam.status === 'rejected' && (ownOpen || isApprover()) ? h('button', { class: 'btn', onclick: async () => { const { error } = await sb.rpc('family_resubmit', { p_id: id }); error ? toast(friendly(error)) : (toast('Resubmitted for approval'), reload()); } }, '↻ Fix done · Resubmit') : null) : null,
    (isApprover() && !offline && !fam.removed_at && fam.status === 'approved') ? h('div', { class: 'card actions-card' }, h('button', { class: 'btn alt', onclick: transfer }, '⇄ Transfer to another location')) : null,
    canRemoveFam ? h('div', { class: 'card actions-card' }, h('button', { class: 'btn bad', onclick: removeFam }, 'Remove family (wrong / test entry)')) : null,
    fam.removed_at ? h('div', { class: 'card dupwarn' }, h('b', {}, 'This family was removed.'), h('p', { class: 'muted' }, fam.removed_reason || ''), h('div', { class: 'actions-card' }, isApprover() ? h('button', { class: 'btn', onclick: () => run(sb.rpc('family_restore', { p_id: id }), 'Family restored') }, 'Restore family') : null, isSuper ? h('button', { class: 'btn bad', onclick: purgeFam }, 'Delete permanently') : null)) : null,
    headGone ? h('div', { class: 'card dupwarn' }, h('b', {}, 'The family head has passed away.'), h('p', { class: 'muted' }, 'Choose the new head (the wife is suggested).'), h('button', { class: 'btn', onclick: headForm }, 'Choose new head')) : null,
    actions, box,
    h('h3', {}, 'Members · सदस्य'),
    ...rows.map(r => { const m = r.members, hist = !live(r), gone = !!m.removed_at, adm = isApprover() && !offline, medit = (adm || canRequest || ownOpen) && !gone;
      return h('div', { class: 'card mem' + (hist ? ' grey' : '') },
        h('div', { class: 'mem-top' }, memAvatar(m), h('div', { class: 'mem-txt' },
          h('div', { class: 'item' }, h('span', {}, h('b', {}, m.full_name), ' · ', relLabel(r.relation)), m.member_code ? h('span', { class: 'muted nowrap' }, m.member_code) : pill(m.record_state)),
          h('div', { class: 'muted', style: 'font-size:14px' }, [m.gender, ageText(m), m.marital_status, m.education, m.occupation, mobile(m),
            m.status === 'deceased' ? 'Deceased' : gone ? 'Removed' + (m.removed_reason ? ': ' + m.removed_reason : '') : hist ? (REASON[r.reason] || 'Historical') : null].filter(Boolean).join(' · ')))),
        (adm || medit) && !fam.removed_at ? h('div', { class: 'mem-btns' },
          !offline ? h('a', { class: 'btn alt sm', href: '#idcard/' + r.members.id }, '🪪 ID Card') : null,
          medit ? h('button', { class: 'btn alt sm', onclick: () => editMember(r) }, direct ? '✏️ Edit' : '✏️ Request edit') : null,
          !gone && adm ? h('button', { class: 'btn alt sm', onclick: () => pickPhoto(m.id, reload) }, '📷 Photo') : null,
          !gone && live(r) && r.relation !== 'head' ? h('button', { class: 'btn alt sm bad', onclick: () => removeMem(m) }, 'Remove') : null,
          gone ? h('button', { class: 'btn sm', onclick: () => run(sb.rpc('member_restore', { p_id: m.id }), 'Member restored') }, 'Restore') : null,
          gone && isSuper ? h('button', { class: 'btn sm bad', onclick: () => purgeMem(m) }, 'Delete permanently') : null) : null,
        menu(r)); }),
    hs.data && hs.data.length ? h('div', {}, h('h3', {}, 'History · इतिहास'), h('div', { class: 'card list' }, hs.data.map(x => h('div', { class: 'item' }, h('span', {}, say(x)), h('span', { class: 'muted' }, x.event_date || ''))))) : null].filter(Boolean));
}
