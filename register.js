// Public self-registration form (no login). Opened from a secure, expiring link: #register/<token>
import { sb, h } from './core.js';
import { RELATIONS, GENDERS, FAMILY_TYPES, DEFAULTS, MARITAL, EDUCATION, OCCUPATIONS } from './options.js';
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
// Shrink a chosen photo to a small JPEG (about 240 px) so it uploads quickly
const shrink = file => new Promise((ok, no) => { const im = new Image(), u = URL.createObjectURL(file); im.onload = () => { const k = Math.min(1, 240 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .72)); }; im.onerror = () => no(new Error('Could not read this photo')); im.src = u; });
const calcAge = d => { const b = new Date(d), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return Math.max(0, a); };
const sel = (list, ph = 'Select') => h('select', {}, h('option', { value: '' }, ph), list.map(x => h('option', { value: Array.isArray(x) ? x[0] : x }, Array.isArray(x) ? x[1] : x)));
import { logoUrl } from './brand.js';

export async function publicRegister(root, token) {
  const shell = body => root.replaceChildren(h('div', { class: 'login' }, body));
  shell(h('p', { class: 'muted', style: 'text-align:center' }, 'Loading…'));
  const { data: info } = await sb.rpc('reg_link_info', { p_token: token });
  if (!info || !info.ok) return shell(h('div', { class: 'card' }, h('h2', {}, 'Link not valid'), h('p', {}, 'This registration link has expired or is full. Please ask the community office for a new link.')));
  const lg = info.logo_path ? logoUrl(info.logo_path) : '';
  const head = h('div', { class: 'hero-login' }, lg ? h('img', { class: 'logo', src: lg, style: 'width:84px;height:84px', alt: '' }) : null, h('h1', {}, info.community), h('p', {}, 'Family registration · ' + info.city));
  const f = { address: h('textarea', { rows: 2, placeholder: 'House / street / area' }), taluka: h('input', { placeholder: 'Taluka' }), pincode: h('input', { inputmode: 'numeric', maxlength: 6, placeholder: 'Pincode' }), phone: h('input', { type: 'tel', inputmode: 'numeric', maxlength: 10, placeholder: 'Family mobile (10 digits)' }),
    gotra: h('input', { list: 'gl', placeholder: 'Gotra' }), type: h('select', {}, FAMILY_TYPES.map(([v, e]) => h('option', { value: v }, e))), house: sel(DEFAULTS.house_type, 'Select house type'), website: h('input', { name: 'website', tabindex: -1, autocomplete: 'off', style: 'position:absolute;left:-9999px;opacity:0' }) };
  const consent = h('input', { type: 'checkbox' }), err = h('div', { class: 'err' }), mem = h('div');
  const rowFor = (first) => {
    const n = h('input', { placeholder: 'Full name *' }), r = h('select', {}, RELATIONS.filter(x => first ? x[0] === 'head' : x[0] !== 'head').map(([v, e]) => h('option', { value: v }, e))),
      g = sel(GENDERS), d = h('input', { type: 'date', max: new Date().toISOString().slice(0, 10) }), age = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 120, placeholder: 'Age (if date of birth not known)' }),
      m = h('input', { type: 'tel', inputmode: 'numeric', maxlength: 10, placeholder: 'Mobile' }), fa = h('input', { placeholder: "Father's name" }), ed = sel(EDUCATION), oc = sel(OCCUPATIONS), ma = sel(MARITAL), bg = sel(BLOOD, 'Blood group'),
      ph = h('input', { type: 'file', accept: 'image/*' }), pv = h('img', { alt: '', style: 'display:none;width:72px;height:72px;object-fit:cover;border-radius:10px;margin-top:6px' }); let photo = '';
    const touched = new Set(); [g, fa, ma].forEach((x, i) => x.addEventListener('input', () => touched.add(i)));
    const GEN = { son: 'male', daughter: 'female', grandson: 'male', granddaughter: 'female', father: 'male', mother: 'female', brother: 'male', sister: 'female', 'daughter-in-law': 'female', 'son-in-law': 'male' };
    const autofill = () => { const rel = r.value, all = [...mem.children].map(e => e.info && e.info()).filter(Boolean), head = all.find(x => x.relation === 'head'), sp = all.find(x => x.relation === 'spouse');
      let gen = GEN[rel]; if (rel === 'spouse' && head && head.gender) gen = head.gender === 'male' ? 'female' : head.gender === 'female' ? 'male' : ''; if (gen && !touched.has(0)) g.value = gen;
      if (['son', 'daughter'].includes(rel) && head && !touched.has(1)) { if (head.gender === 'male' && head.name) fa.value = head.name; else if (head.gender === 'female' && sp && sp.name) fa.value = sp.name; }
      if (['spouse', 'daughter-in-law', 'son-in-law'].includes(rel) && !touched.has(2)) ma.value = 'Married'; if (['son', 'daughter', 'grandson', 'granddaughter'].includes(rel) && !touched.has(2)) ma.value = 'Unmarried'; };
    r.addEventListener('change', autofill); setTimeout(autofill, 0);
    if (first) [g, n].forEach(x => x.addEventListener('input', () => [...mem.children].forEach(e => e.refill && e.refill())));
    d.addEventListener('input', () => { if (d.value) { age.value = calcAge(d.value); age.readOnly = true; } else { age.readOnly = false; } age.classList.toggle('auto', age.readOnly); });
    ph.addEventListener('change', async () => { photo = ''; pv.style.display = 'none'; if (!ph.files[0]) return; try { photo = await shrink(ph.files[0]); pv.src = photo; pv.style.display = 'block'; } catch (e) { err.textContent = e.message; } });
    const el = h('div', { class: 'card' }, h('div', { class: 'rowhead' }, h('b', {}, first ? 'Head of family' : 'Family member'), first ? null : h('button', { type: 'button', class: 'btn alt bad sm', onclick: () => el.remove() }, 'Remove')),
      h('label', {}, 'Name *'), n, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Relation'), r), h('div', {}, h('label', {}, 'Gender'), g)),
      h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Date of birth'), d), h('div', {}, h('label', {}, 'Age'), age)), h('p', { class: 'muted s', style: 'margin:2px 0' }, 'Know the date of birth? Age fills itself. If not, enter the age.'),
      h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Mobile'), m), h('div', {}, h('label', {}, 'Blood group'), bg)), h('label', {}, "Father's name"), fa,
      h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Education'), ed), h('div', {}, h('label', {}, 'Occupation'), oc)), h('label', {}, 'Marital status'), ma,
      h('label', {}, 'Photo (optional)'), ph, pv);
    el.refill = autofill; el.info = () => ({ relation: r.value, name: n.value.trim(), gender: g.value }); el.get = () => ({ name: n.value.trim(), relation: r.value, gender: g.value, dob: d.value || undefined, age: !d.value && age.value ? age.value : undefined, mobile: m.value.replace(/\D/g, '') || undefined, blood_group: bg.value || undefined, father_name: fa.value.trim() || undefined, education: ed.value || undefined, occupation: oc.value || undefined, marital_status: ma.value || undefined, photo: photo || undefined }); return el;
  };
  mem.append(rowFor(true));
  const done = () => shell(h('div', { class: 'card' }, h('h2', {}, '✔ Thank you'), h('p', {}, 'Your family details have been sent to the community office. They will review and approve them; your Family ID is issued after approval.')));
  const submit = async ev => {
    ev.preventDefault(); err.textContent = '';
    const members = [...mem.children].map(e => e.get()); if (members.some(m => m.name.length < 2)) return (err.textContent = 'Please enter every member’s name');
    if (!consent.checked) return (err.textContent = 'Please tick the consent box');
    const b = ev.submitter || ev.target.querySelector('button.btn'); b.disabled = true;
    const { error } = await sb.rpc('reg_submit', { p_token: token, p: { consent: 'true', website: f.website.value, address: f.address.value, taluka: f.taluka.value, pincode: f.pincode.value, phone: f.phone.value, gotra: f.gotra.value, family_type: f.type.value, house_type: f.house.value, members } });
    b.disabled = false; error ? (err.textContent = error.message.replace(/^.*?:\s*/, '')) : done();
  };
  shell([head, h('form', { onsubmit: submit },
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Family details'), h('label', {}, 'Address'), f.address, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Taluka'), f.taluka), h('div', {}, h('label', {}, 'Pincode'), f.pincode)),
      h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Family mobile'), f.phone), h('div', {}, h('label', {}, 'Gotra'), f.gotra)), h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Family type'), f.type), h('div', {}, h('label', {}, 'House type'), f.house)), f.website, h('datalist', { id: 'gl' }, DEFAULTS.gotra.map(g => h('option', { value: g })))),
    mem, h('p', {}, h('button', { type: 'button', class: 'btn alt', onclick: () => mem.append(rowFor(false)) }, '+ Add another member')),
    h('div', { class: 'card' }, h('label', { class: 'chk' }, consent, ' I confirm these details are correct and I agree to the community keeping them in its family register.'), err,
      h('div', { class: 'consent-note' }, h('b', {}, 'Consent, use of this form and privacy'), h('p', {}, 'This form is used only to register your family with ' + info.community + '. Details you enter, including the optional photo and blood group, are saved in the society’s private family register, reviewed by an authorised office-bearer, and used only for community welfare work, records and printed family / ID cards.'), h('p', {}, 'Your data is not sold or shared with outsiders, and can be seen only by authorised office-bearers of your location. Submitting is voluntary; the photo is optional. You may ask the office at any time to correct or remove your details.')),
      h('p', {}, h('button', { class: 'btn', style: 'width:100%' }, 'Submit to community office'))), info.footer ? h('p', { class: 'muted', style: 'text-align:center;font-size:12px' }, info.footer) : null)]);
}
