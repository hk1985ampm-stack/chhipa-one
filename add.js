import { enqueue, isNetErr } from './offline.js';
import { uploadPhotos } from './photo.js';
import { sb, h, hi, toast, friendly, state, digits, myLocations, isApprover, field, optList } from './core.js';
import { REL_LABELS } from './options.js';
import { memberForm, selectOther } from './memberform.js';

const key = () => 'chhipa_family_draft_' + state.profile.user_id;
const blank = () => ({ client_ref: crypto.randomUUID(), step: 1, location_id: '', address: '', gotra: '', family_type: '', phone: '', members: [{ relation: 'head' }] });
const relLabel = r => REL_LABELS[r] || r;

export async function render(main) {
  const locs = await myLocations();
  if (!locs.length) return main.append(h('p', { class: 'err' }, 'No location is assigned to you yet. Please ask the Super Admin.'));
  let S = null;
  try { S = JSON.parse(localStorage.getItem(key())); } catch {}
  const save = () => localStorage.setItem(key(), JSON.stringify(S));
  const draw = h('div');
  let auto = null;   // saves the current step on every keystroke, so nothing typed is ever lost
  draw.addEventListener('input', () => auto && auto()); draw.addEventListener('change', () => auto && auto());
  const go = n => { S.step = n; save(); step(); window.scrollTo(0, 0); };

  function steps() {
    const t = ['Head', 'Family', 'Members', 'Review'];
    return h('div', { class: 'steps' }, t.map((x, i) => h('span', { class: i + 1 === S.step ? 'on' : i + 1 < S.step ? 'done' : '' }, (i + 1) + '. ' + x)));
  }
  const nav = (back, next, nextLabel = 'Next →') => h('div', { class: 'actions' },
    back ? h('button', { class: 'btn alt', onclick: back }, '← Back') : h('span'),
    h('button', { class: 'btn', onclick: next }, nextLabel));

  function step() {
    auto = null; draw.replaceChildren(steps());
    [null, s1, s2, s3, s4][S.step]();
  }

  // ---- Step 1: location + head
  function s1() {
    const loc = h('select', {}, locs.length > 1 ? h('option', { value: '' }, 'Select location · स्थान') : null,
      locs.map(l => h('option', { value: l.id, selected: l.id === S.location_id }, `${l.code} · ${l.city}`)));
    if (locs.length === 1) S.location_id = locs[0].id;
    const f = memberForm(S.members[0], { fixedRelation: 'head' });
    const warn = h('div');
    auto = () => { S.location_id = loc.value || S.location_id; S.members[0] = f.read(); save(); };
    const next = async () => {
      const e = !loc.value && !S.location_id ? 'Please select the location' : f.validate();
      if (e) return toast(e);
      S.location_id = loc.value || S.location_id; S.members[0] = f.read(); save();
      const m = S.members[0];
      const { data } = await sb.rpc('find_duplicates', { p_name: m.name, p_father: m.father_name, p_mobile: m.mobile || null });
      if (data && data.length) {
        warn.replaceChildren(h('div', { class: 'card dupwarn' }, h('b', {}, 'Possible existing record · संभावित डुप्लिकेट'),
          data.map(d => h('div', {}, `${d.full_name}${d.father_name ? ' s/o ' + d.father_name : ''} — ${d.family_code || 'pending'} · ${d.city}`)),
          h('p', { class: 'muted' }, 'Check that this is not the same person before continuing.'),
          h('button', { class: 'btn', onclick: () => go(2) }, 'Different person — continue')));
        warn.scrollIntoView({ behavior: 'smooth' });
      } else go(2);
    };
    draw.append(h('h2', {}, hi('Family head', 'परिवार प्रमुख')), h('div', { class: 'card' }, field('Location · स्थान *', loc), f.el), warn,
      nav(null, next));
  }

  // ---- Step 2: family details
  function s2() {
    const addr = h('textarea', { rows: 3, placeholder: 'House no., street, area' }, S.address || '');
    const gotra = selectOther(optList('gotra'), S.gotra);
    const type = selectOther(optList('family_type'), S.family_type);
    const taluka = h('input', { value: S.taluka || '', placeholder: 'Taluka · तालुका' });
    const pin = h('input', { type: 'tel', inputmode: 'numeric', maxlength: 6, value: S.pincode || '', placeholder: '6-digit pincode' });
    const house = selectOther(optList('house_type'), S.house_type);
    const phone = h('input', { type: 'tel', inputmode: 'numeric', value: S.phone || S.members[0].mobile || '', placeholder: 'Family contact number' });
    const read = () => { S.address = addr.value.trim(); S.gotra = gotra.get(); S.family_type = type.get(); S.taluka = taluka.value.trim(); S.pincode = digits(pin.value).slice(0, 6); S.house_type = house.get(); S.phone = digits(phone.value); save(); };
    auto = read;
    draw.append(h('h2', {}, hi('Family details', 'परिवार की जानकारी')), h('div', { class: 'card' },
      field('Address · पता', addr), h('div', { class: 'row' }, field('Gotra · गोत्र', gotra.el), field('Family type · प्रकार', type.el)), h('div', { class: 'row' }, field('Taluka · तालुका', taluka), field('Pincode · पिनकोड', pin)), field('House · मकान', house.el), field('Contact number · संपर्क', phone)),
      nav(() => { read(); go(1); }, () => {
        if (pin.value.trim() && digits(pin.value).length !== 6) return toast('Pincode must be 6 digits');
        if (phone.value.trim() && digits(phone.value).length !== 10) return toast('Contact number must be 10 digits');
        read(); go(3);
      }));
  }

  // ---- Step 3: members
  function s3() {
    const list = h('div'); const formBox = h('div');
    const drawList = () => list.replaceChildren(...S.members.slice(1).map((m, i) => h('div', { class: 'card mem' },
      h('div', { class: 'item' }, h('span', {}, h('b', {}, m.name), ' · ', relLabel(m.relation)),
        h('span', {}, h('button', { class: 'btn alt', style: 'min-height:40px', onclick: () => edit(i + 1) }, 'Edit'), ' ',
          h('button', { class: 'btn bad', style: 'min-height:40px', onclick: () => { if (confirm('Remove ' + m.name + '?')) { const r = i + 1; S.members.splice(r, 1); S.members.forEach(x => { if (x.spouse_of !== '' && x.spouse_of != null) { const k = +x.spouse_of; x.spouse_of = k === r ? '' : k > r ? String(k - 1) : x.spouse_of; } }); save(); drawList(); } } }, 'Remove'))))));
    const ctxOf = skip => { const hd = S.members[0], sp = S.members.find(m => m.relation === 'spouse');
      return { head: { name: hd.name, gender: hd.gender, father_name: hd.father_name }, spouse: sp && { name: sp.name },
        people: S.members.map((m, i) => ({ v: String(i), label: m.name, relation: m.relation, gender: m.gender })).filter(p => p.v !== String(skip)) }; };
    const edit = idx => {
      const first = !idx && !S.members.some(m => m.relation === 'spouse') ? { relation: 'spouse' } : {};
      const f = memberForm(idx ? S.members[idx] : first, { ctx: ctxOf(idx || -1) });
      formBox.replaceChildren(h('div', { class: 'card' }, h('h3', {}, idx ? 'Edit member' : 'Add member · सदस्य जोड़ें'), f.el,
        h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => formBox.replaceChildren() }, 'Cancel'),
          h('button', { class: 'btn', onclick: () => {
            const e = f.validate(); if (e) return toast(e);
            idx ? (S.members[idx] = f.read()) : S.members.push(f.read());
            save(); formBox.replaceChildren(); drawList();
          } }, idx ? 'Save' : '+ Add'))));
      formBox.scrollIntoView({ behavior: 'smooth' });
    };
    drawList();
    draw.append(h('h2', {}, hi('Family members', 'परिवार के सदस्य')), h('p', { class: 'muted' }, 'The head is already added. Add spouse, children and others living in this household.'),
      list, formBox, h('button', { class: 'btn alt', style: 'width:100%;margin:6px 0', onclick: () => edit(0) }, '+ Add member · सदस्य जोड़ें'),
      nav(() => go(2), () => go(4)));
  }

  // ---- Step 4: review + submit
  function s4() {
    const loc = locs.find(l => l.id === S.location_id);
    const btn = h('button', { class: 'btn' }, isApprover() ? 'Save & approve' : 'Submit for approval');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      if (!S.client_ref) { S.client_ref = crypto.randomUUID(); save(); }
      const payload = { client_ref: S.client_ref, location_id: S.location_id, address: S.address, gotra: S.gotra, family_type: S.family_type, phone: S.phone, taluka: S.taluka, pincode: S.pincode, house_type: S.house_type, members: S.members.map(({ photo, ...x }) => x) };
      const photos = S.members.map((x, i) => ({ index: i, data: x.photo })).filter(x => x.data);
      const { data, error } = await sb.rpc('family_create', { p: payload });
      if (error && isNetErr(error)) {   // no internet: keep it safely and upload automatically later
        await enqueue({ ...payload, _photos: photos }); localStorage.removeItem(key());
        toast('Saved on this phone. It will upload when the internet returns.'); location.hash = 'registry'; return;
      }
      if (error) { btn.disabled = false; return toast(friendly(error)); }
      localStorage.removeItem(key());
      if (photos.length) await uploadPhotos(data.member_ids, photos);
      toast(data.status === 'approved' ? 'Saved. Family ID ' + data.family_code : 'Submitted for approval');
      location.hash = 'family/' + data.family_id;
    });
    draw.append(h('h2', {}, hi('Review', 'जाँच करें')),
      h('div', { class: 'card' }, h('b', {}, S.members[0].name), ' (head) · ', loc ? loc.city : '', h('div', { class: 'muted' }, [S.address, S.gotra && 'Gotra ' + S.gotra, S.family_type, S.phone].filter(Boolean).join(' · '))),
      h('div', { class: 'card' }, h('table', {}, h('tr', {}, ['Name', 'Relation', 'Gender', 'DOB / Age'].map(t => h('th', {}, t))),
        S.members.map(m => h('tr', {}, h('td', {}, m.name), h('td', {}, relLabel(m.relation)), h('td', {}, m.gender), h('td', {}, m.dob || (m.age ? '~' + m.age + ' yrs' : '')))))),
      h('p', { class: 'muted' }, isApprover() ? 'As an admin, this family is approved immediately and receives its permanent Family ID.' : 'Your Location Admin will review it. The permanent Family ID is issued after approval.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => go(3) }, '← Back'), btn));
  }

  // ---- start (offer to resume a saved draft)
  main.append(draw);
  if (S && S.members && S.members[0] && S.members[0].name) {
    draw.append(h('div', { class: 'card' }, h('b', {}, 'Unfinished family: ', S.members[0].name), h('p', { class: 'muted' }, 'Saved on this device.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn alt', onclick: () => { S = blank(); save(); step(); } }, 'Start new'),
        h('button', { class: 'btn', onclick: step }, 'Continue'))));
  } else { if (!S || !Array.isArray(S.members) || !S.members.length || !S.step) S = blank();
    if (!S.client_ref) S.client_ref = crypto.randomUUID(); step(); }
}
