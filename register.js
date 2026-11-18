// Public self-registration form (no login). Opened from a secure, expiring link: #register/<token>
import { sb, h } from './core.js';
import { RELATIONS, GENDERS, FAMILY_TYPES, DEFAULTS } from './options.js';
import { logoUrl } from './brand.js';

export async function publicRegister(root, token) {
  const shell = body => root.replaceChildren(h('div', { class: 'login' }, body));
  shell(h('p', { class: 'muted', style: 'text-align:center' }, 'Loading…'));
  const { data: info } = await sb.rpc('reg_link_info', { p_token: token });
  if (!info || !info.ok) return shell(h('div', { class: 'card' }, h('h2', {}, 'Link not valid'), h('p', {}, 'This registration link has expired or is full. Please ask the community office for a new link.')));
  const lg = info.logo_path ? logoUrl(info.logo_path) : '';
  const head = h('div', { class: 'hero-login' }, lg ? h('img', { class: 'logo', src: lg, style: 'width:84px;height:84px', alt: '' }) : null, h('h1', {}, info.community), h('p', {}, 'Family registration · ' + info.city));
  const f = { address: h('textarea', { rows: 2, placeholder: 'House / street / area' }), taluka: h('input', { placeholder: 'Taluka' }), pincode: h('input', { inputmode: 'numeric', maxlength: 6, placeholder: 'Pincode' }), phone: h('input', { type: 'tel', inputmode: 'numeric', maxlength: 10, placeholder: 'Family mobile (10 digits)' }),
    gotra: h('input', { list: 'gl', placeholder: 'Gotra' }), type: h('select', {}, FAMILY_TYPES.map(([v, e]) => h('option', { value: v }, e))), website: h('input', { name: 'website', tabindex: -1, autocomplete: 'off', style: 'position:absolute;left:-9999px;opacity:0' }) };
  const consent = h('input', { type: 'checkbox' }), err = h('div', { class: 'err' }), mem = h('div');
  const rowFor = (first) => {
    const n = h('input', { placeholder: 'Full name *' }), r = h('select', {}, RELATIONS.filter(x => first ? x[0] === 'head' : x[0] !== 'head').map(([v, e]) => h('option', { value: v }, e))),
      g = h('select', {}, GENDERS.map(([v, e]) => h('option', { value: v }, e))), d = h('input', { type: 'date' }), m = h('input', { type: 'tel', inputmode: 'numeric', maxlength: 10, placeholder: 'Mobile' });
    const el = h('div', { class: 'card' }, h('div', { class: 'rowhead' }, h('b', {}, first ? 'Head of family' : 'Family member'), first ? null : h('button', { class: 'btn alt bad sm', onclick: () => el.remove() }, 'Remove')),
      h('label', {}, 'Name *'), n, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Relation'), r), h('div', {}, h('label', {}, 'Gender'), g)), h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Date of birth'), d), h('div', {}, h('label', {}, 'Mobile'), m)));
    el.get = () => ({ name: n.value.trim(), relation: r.value, gender: g.value, dob: d.value || undefined, mobile: m.value.replace(/\D/g, '') || undefined }); return el;
  };
  mem.append(rowFor(true));
  const done = () => shell(h('div', { class: 'card' }, h('h2', {}, '✔ Thank you'), h('p', {}, 'Your family details have been sent to the community office. They will review and approve them; your Family ID is issued after approval.')));
  const submit = async ev => {
    ev.preventDefault(); err.textContent = '';
    const members = [...mem.children].map(e => e.get()); if (members.some(m => m.name.length < 2)) return (err.textContent = 'Please enter every member’s name');
    if (!consent.checked) return (err.textContent = 'Please tick the consent box');
    const b = ev.submitter || ev.target.querySelector('button.btn'); b.disabled = true;
    const { error } = await sb.rpc('reg_submit', { p_token: token, p: { consent: 'true', website: f.website.value, address: f.address.value, taluka: f.taluka.value, pincode: f.pincode.value, phone: f.phone.value, gotra: f.gotra.value, family_type: f.type.value, members } });
    b.disabled = false; error ? (err.textContent = error.message.replace(/^.*?:\s*/, '')) : done();
  };
  shell([head, h('form', { onsubmit: submit },
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Family details'), h('label', {}, 'Address'), f.address, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Taluka'), f.taluka), h('div', {}, h('label', {}, 'Pincode'), f.pincode)),
      h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Family mobile'), f.phone), h('div', {}, h('label', {}, 'Gotra'), f.gotra)), h('label', {}, 'Family type'), f.type, f.website, h('datalist', { id: 'gl' }, DEFAULTS.gotra.map(g => h('option', { value: g })))),
    mem, h('p', {}, h('button', { type: 'button', class: 'btn alt', onclick: () => mem.append(rowFor(false)) }, '+ Add another member')),
    h('div', { class: 'card' }, h('label', { class: 'chk' }, consent, ' I confirm these details are correct and I agree to the community keeping them in its family register.'), err,
      h('p', {}, h('button', { class: 'btn', style: 'width:100%' }, 'Submit to community office'))), info.footer ? h('p', { class: 'muted', style: 'text-align:center;font-size:12px' }, info.footer) : null)]);
}
