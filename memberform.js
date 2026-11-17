import { h, digits, optList, age as calcAge } from './core.js';
import { RELATIONS, GENDERS, MARITAL } from './options.js';

const opt = (list, sel) => list.map(r => h('option', { value: r[0], selected: r[0] === sel }, `${r[1]} · ${r[2]}`));
const fld = (l, el) => h('div', {}, h('label', {}, l), el);

// Dropdown from a managed list plus "Other (type)". A value no longer in the list (deactivated) is kept as typed text.
export function selectOther(values, current) {
  const known = !current || values.includes(current);
  const sel = h('select', {}, h('option', { value: '' }, 'Select · चुनें'), values.map(v => h('option', { selected: v === current }, v)),
    h('option', { value: '__other', selected: !known }, 'Other (type) · अन्य'));
  const txt = h('input', { value: known ? '' : current, placeholder: 'Type here · यहाँ लिखें', style: 'margin-top:6px', hidden: known });
  sel.addEventListener('change', () => { txt.hidden = sel.value !== '__other'; if (!txt.hidden) txt.focus(); });
  return { el: h('div', {}, sel, txt), get: () => (sel.value === '__other' ? txt.value.trim() : sel.value) };
}

const GENDER_OF = { son: 'male', daughter: 'female', grandson: 'male', granddaughter: 'female', father: 'male', mother: 'female',
  brother: 'male', sister: 'female', 'daughter-in-law': 'female', 'son-in-law': 'male' };
const MARRIED = ['spouse', 'daughter-in-law', 'son-in-law'], KIDS = ['son', 'daughter', 'grandson', 'granddaughter'];

// ctx = { head:{name,gender,father_name}, spouse:{name}, people:[{v,label,relation,gender}] } lets the form fill itself from the relation.
export function memberForm(init = {}, { fixedRelation = null, ctx = null } = {}) {
  const v = k => init[k] || '';
  const touched = new Set();
  const name = h('input', { value: v('name'), placeholder: 'Full name · पूरा नाम' });
  const rel = h('select', { disabled: !!fixedRelation },
    fixedRelation ? null : h('option', { value: '' }, 'Select · चुनें'),
    RELATIONS.filter(r => fixedRelation ? r[0] === fixedRelation : r[0] !== 'head')
      .map(r => h('option', { value: r[0], selected: r[0] === (fixedRelation || init.relation) }, `${r[1]} · ${r[2]}`)));
  const gender = h('select', {}, h('option', { value: '' }, 'Select · चुनें'), opt(GENDERS, v('gender')));
  const dob = h('input', { type: 'date', value: v('dob'), max: new Date().toISOString().slice(0, 10) });
  const age = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 120, placeholder: 'Age · उम्र' });
  const syncAge = () => { if (dob.value) { age.value = calcAge(dob.value); age.readOnly = true; age.title = 'Calculated from date of birth'; }
    else { age.readOnly = false; age.title = ''; } age.classList.toggle('auto', age.readOnly); };
  dob.addEventListener('input', syncAge);
  if (!init.dob && init.age) age.value = init.age;
  const father = h('input', { value: v('father_name'), placeholder: "Father's name · पिता का नाम" });
  const mobile = h('input', { type: 'tel', inputmode: 'numeric', value: v('mobile'), placeholder: '10-digit mobile' });
  const edu = selectOther(optList('education'), v('education'));
  const occ = selectOther(optList('occupation'), v('occupation'));
  const mar = h('select', {}, h('option', { value: '' }, 'Select · चुनें'), opt(MARITAL, v('marital_status')));
  const mother = h('input', { value: v('mother_name'), placeholder: "Mother's name" });
  const wa = h('input', { type: 'tel', inputmode: 'numeric', value: v('whatsapp'), placeholder: 'WhatsApp number' });
  const email = h('input', { type: 'email', value: v('email'), placeholder: 'Email' });
  const mto = h('select'); const mtoWrap = h('div', { hidden: true }, h('label', {}, 'Married to · पति/पत्नी'), mto);
  syncAge();
  const tr = { gender, father, mother, mar, dob, name };
  Object.entries(tr).forEach(([k, el]) => el.addEventListener('input', () => touched.add(k)));

  const drawMto = (r, preset) => {
    const people = (ctx && ctx.people) || [];
    const c = r === 'spouse' ? people.filter(p => p.relation === 'head')
      : r === 'daughter-in-law' ? people.filter(p => p.gender === 'male' && ['son', 'grandson', 'brother'].includes(p.relation))
      : r === 'son-in-law' ? people.filter(p => p.gender === 'female' && ['daughter', 'granddaughter', 'sister'].includes(p.relation)) : [];
    mtoWrap.hidden = !MARRIED.includes(r) || !c.length;
    mto.replaceChildren(h('option', { value: '' }, 'Select · चुनें'), c.map(p => h('option', { value: p.v, selected: p.v === preset }, p.label)));
    if (!preset && c.length === 1) mto.value = c[0].v;
  };
  const autofill = () => {
    const r = rel.value; if (!r) return;
    const set = (k, el, val) => { if (val && !touched.has(k)) el.value = val; };
    let g = GENDER_OF[r];
    if (r === 'spouse' && ctx && ctx.head && ctx.head.gender) g = ctx.head.gender === 'male' ? 'female' : ctx.head.gender === 'female' ? 'male' : null;
    set('gender', gender, g);
    if (MARRIED.includes(r)) set('mar', mar, 'Married'); else if (KIDS.includes(r)) set('mar', mar, 'Unmarried');
    if (ctx && ctx.head && (r === 'son' || r === 'daughter')) {
      if (ctx.head.gender === 'male') { set('father', father, ctx.head.name); if (ctx.spouse) set('mother', mother, ctx.spouse.name); }
      else if (ctx.head.gender === 'female') set('mother', mother, ctx.head.name);
    }
    if (ctx && ctx.head && (r === 'brother' || r === 'sister')) set('father', father, ctx.head.father_name);
    drawMto(r);
  };
  rel.addEventListener('change', autofill);
  if (init.relation) { drawMto(init.relation, init.spouse_of); if (!init.name) autofill(); }

  const el = h('div', {},
    fld('Name · नाम *', name), h('div', { class: 'row' }, fld('Relation · संबंध *', rel), fld('Gender · लिंग *', gender)), mtoWrap,
    h('div', { class: 'row' }, fld('Date of birth · जन्म तिथि', dob), fld('Age · उम्र (auto if DOB)', age)),
    fld('Mobile · मोबाइल', mobile),
    fld("Father's name · पिता का नाम", father),
    h('div', { class: 'row' }, fld('Education · शिक्षा', edu.el), fld('Occupation · व्यवसाय', occ.el)),
    fld('Marital status · वैवाहिक स्थिति', mar),
    h('details', {}, h('summary', { class: 'muted' }, 'More details · और जानकारी'), fld("Mother's name", mother), fld('WhatsApp', wa), fld('Email', email)));
  const read = () => ({ name: name.value.trim(), relation: fixedRelation || rel.value, gender: gender.value, dob: dob.value, age: dob.value ? '' : age.value, father_name: father.value.trim(),
    mobile: digits(mobile.value), education: edu.get(), occupation: occ.get(), marital_status: mar.value,
    mother_name: mother.value.trim(), whatsapp: digits(wa.value), email: email.value.trim(), spouse_of: mtoWrap.hidden ? '' : mto.value });
  const validate = () => {
    const m = read();
    if (!m.name) return 'Please enter the name';
    if (!m.relation) return 'Please select the relation';
    if (!m.gender) return 'Please select gender';
    if (mobile.value.trim() && m.mobile.length !== 10) return 'Mobile number must be 10 digits';
    if (!dob.value && age.value !== '' && (+age.value < 0 || +age.value > 120)) return 'Age must be between 0 and 120';
    if (dob.value && dob.value > new Date().toISOString().slice(0, 10)) return 'Date of birth cannot be in the future';
    return '';
  };
  return { el, read, validate };
}
