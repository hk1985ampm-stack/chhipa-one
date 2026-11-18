// My profile: photo, phone, password
import { sb, h, hi, toast, friendly, state } from './core.js';

const shrinkSquare = file => new Promise((res, rej) => {
  const img = new Image(); img.onload = () => {
    const W = 240, H = 290, c = document.createElement('canvas'); c.width = W; c.height = H;
    const r = Math.max(W / img.width, H / img.height), w = img.width * r, hh = img.height * r, x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, (W - w) / 2, (H - hh) / 2, w, hh);
    res(c.toDataURL('image/jpeg', 0.72));
  }; img.onerror = () => rej(new Error('Could not read the photo')); img.src = URL.createObjectURL(file);
});
export const pickStaffPhoto = (userId, done) => {
  const inp = h('input', { type: 'file', accept: 'image/*' });
  inp.onchange = async () => { if (!inp.files[0]) return; try { const d = await shrinkSquare(inp.files[0]); const { error } = await sb.rpc('staff_set_photo', { p_user: userId, p_photo: d }); if (error) throw error; toast('Photo saved'); done && done(d); } catch (e) { toast(friendly(e)); } };
  inp.click();
};

export async function render(main) {
  const p = state.profile, { data: me } = await sb.from('profiles').select('full_name,photo,phone,title,role,admin_code').eq('user_id', p.user_id).maybeSingle();
  const m = me || p;
  const img = h('div', { class: 'pf-photo' }, m.photo ? h('img', { src: m.photo, alt: '' }) : h('span', {}, (m.full_name || '?').slice(0, 1).toUpperCase()));
  const phone = h('input', { type: 'tel', inputmode: 'numeric', maxlength: 10, value: m.phone || '', placeholder: '10-digit mobile' });
  const p1 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'New password (8+ characters)' }), p2 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Type it again' });
  main.append(h('div', { class: 'card pf' }, h('div', { class: 'pf-head' }, img, h('div', {}, h('h2', { style: 'margin:0' }, m.full_name), h('div', { class: 'muted' }, [m.title, m.admin_code].filter(Boolean).join(' · ')),
      h('button', { class: 'btn sm', onclick: () => pickStaffPhoto(p.user_id, d => img.replaceChildren(h('img', { src: d, alt: '' }))) }, '📷 ' + (m.photo ? 'Change photo' : 'Add photo')))),
    h('p', { class: 'muted s' }, 'Your photo is printed on your ID card.'),
    h('label', {}, 'Mobile (printed on your ID card)'), phone, h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: async () => { const { error } = await sb.rpc('staff_set_phone', { p_user: p.user_id, p_phone: phone.value }); toast(error ? friendly(error) : 'Saved'); } }, 'Save phone')),
    h('a', { class: 'btn alt', href: '#staffcard/' + p.user_id, style: 'margin-top:10px;display:inline-block' }, '🪪 My ID card')),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, hi('Change password', 'पासवर्ड बदलें')), h('label', {}, 'New password'), p1, h('label', {}, 'Confirm'), p2,
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: async () => {
        if (p1.value.length < 8) return toast('At least 8 characters'); if (p1.value !== p2.value) return toast('The two passwords do not match');
        const { error } = await sb.auth.updateUser({ password: p1.value }); if (error) return toast(friendly(error)); await sb.rpc('password_changed'); p1.value = p2.value = ''; toast('Password changed'); } }, 'Change password'))));
}
