import { h, digits } from './core.js';
import { RELATIONS, GENDERS, MARITAL, EDUCATION, OCCUPATIONS } from './options.js';

const opt = (list, sel) => list.map(r => h('option', { value: r[0], selected: r[0] === sel }, `${r[1]} · ${r[2]}`));
const fld = (l, el) => h('div', {}, h('label', {}, l), el);

// Reusable member form. Returns { el, read(), validate() }.
export function memberForm(init = {}, { fixedRelation = null } = {}) {
  const v = k => init[k] || '';
  const name = h('input', { value: v('name'), placeholder: 'Full name · पूरा नाम' });
  const rel = h('select', { disabled: !!fixedRelation },
    fixedRelation ? null : h('option', { value: '' }, 'Select · चुनें'),
    RELATIONS.filter(r => fixedRelation ? r[0] === fixedRelation : r[0] !== 'head').map(r => h('option', { value: r[0], selected: r[0] === (fixedRelation || init.relation) }, `${r[1]} · ${r[2]}`)));
  const gender = h('select', {}, h('option', { value: '' }, 'Select · चुनें'), opt(GENDERS, v('gender')));
  const dob = h('input', { type: 'date', value: v('dob'), max: new Date().toISOString().slice(0, 10) });
  const father = h('input', { value: v('father_name'), placeholder: "Father's name · पिता का नाम" });
  const mobile = h('input', { type: 'tel', inputmode: 'numeric', value: v('mobile'), placeholder: '10-digit mobile' });
  const edu = h('select', {}, h('option', { value: '' }, 'Select · चुनें'), EDUCATION.map(e => h('option', { selected: e === v('education') }, e)));
  const dl = 'occ' + Math.random().toString(36).slice(2, 7);
  const occ = h('input', { value: v('occupation'), list: dl, placeholder: 'Occupation · व्यवसाय' });
  const mar = h('select', {}, h('option', { value: '' }, 'Select · चुनें'), opt(MARITAL, v('marital_status')));
  const mother = h('input', { value: v('mother_name'), placeholder: "Mother's name" });
  const wa = h('input', { type: 'tel', inputmode: 'numeric', value: v('whatsapp'), placeholder: 'WhatsApp number' });
  const email = h('input', { type: 'email', value: v('email'), placeholder: 'Email' });
  const el = h('div', {},
    fld('Name · नाम *', name), h('div', { class: 'row' }, fld('Relation · संबंध *', rel), fld('Gender · लिंग *', gender)),
    h('div', { class: 'row' }, fld('Date of birth · जन्म तिथि', dob), fld('Mobile · मोबाइल', mobile)),
    fld("Father's name · पिता का नाम", father),
    h('div', { class: 'row' }, fld('Education · शिक्षा', edu), fld('Occupation · व्यवसाय', occ)),
    h('datalist', { id: dl }, OCCUPATIONS.map(o => h('option', { value: o }))),
    fld('Marital status · वैवाहिक स्थिति', mar),
    h('details', {}, h('summary', { class: 'muted' }, 'More details · और जानकारी'), fld("Mother's name", mother), fld('WhatsApp', wa), fld('Email', email)));
  const read = () => ({ name: name.value.trim(), relation: fixedRelation || rel.value, gender: gender.value, dob: dob.value, father_name: father.value.trim(),
    mobile: digits(mobile.value), education: edu.value, occupation: occ.value.trim(), marital_status: mar.value,
    mother_name: mother.value.trim(), whatsapp: digits(wa.value), email: email.value.trim() });
  const validate = () => {
    const m = read();
    if (!m.name) return 'Please enter the name';
    if (!m.relation) return 'Please select the relation';
    if (!m.gender) return 'Please select gender';
    if (mobile.value.trim() && m.mobile.length !== 10) return 'Mobile number must be 10 digits';
    if (dob.value && dob.value > new Date().toISOString().slice(0, 10)) return 'Date of birth cannot be in the future';
    return '';
  };
  return { el, read, validate };
}
