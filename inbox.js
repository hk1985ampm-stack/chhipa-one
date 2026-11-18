// Requests hub: password requests, agent access requests, photo approval queue
import { sb, h, hi, toast, friendly, state } from './core.js';
import { uploadPhotos } from './photo.js';
import { emptyState } from './ui.js';

export const genPassword = () => { const a = 'abcdefghjkmnpqrstuvwxyz', n = '23456789'; const r = s => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length]; return Array.from({ length: 5 }, () => r(a)).join('') + '@' + Array.from({ length: 3 }, () => r(n)).join('') + r(a).toUpperCase(); };
export const pwShare = (name, email, pw, phone) => {
  const ph = (phone || '').replace(/\D/g, ''), txt = `Assalamu Alaikum ${name},\nYour Chhipa One password was reset.\nE-mail: ${email}\nTemporary password: ${pw}\nOpen ${location.origin + location.pathname}, sign in, and you will be asked to set your own password.`;
  return h('div', { class: 'card pwshare' }, h('b', {}, 'Temporary password for ' + name), h('div', { class: 'bigpw' }, pw), h('pre', { class: 'muted s', style: 'white-space:pre-wrap;margin:6px 0' }, txt),
    h('div', { class: 'actions' }, h('a', { class: 'btn', target: '_blank', rel: 'noopener', href: 'https://wa.me/' + (ph.length === 10 ? '91' + ph : ph) + '?text=' + encodeURIComponent(txt) }, 'WhatsApp'),
      h('button', { class: 'btn alt', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(txt); toast('Copied'); } }, 'Copy')),
    h('p', { class: 'muted s' }, 'Shown only now. They must change it at first sign-in.'));
};
export async function resetFor(userId, name, email, box, after) {
  if (!confirm('Generate a new temporary password for ' + name + '? Their old password will stop working.')) return;
  const pw = genPassword(), { error } = await sb.rpc('staff_reset_password', { p_user: userId, p_new: pw });
  if (error) return toast(friendly(error));
  box.replaceChildren(pwShare(name, email, pw, '')); box.scrollIntoView({ behavior: 'smooth' }); after && after();
}

export async function render(main) {
  const box = h('div', { class: 'sheet' }), pw = h('div'), ac = h('div'), ph = h('div');
  main.append(h('h2', {}, '📥 ', hi('Requests', 'अनुरोध')), box, h('h3', {}, '🔑 Password requests'), pw, h('h3', {}, '🧑‍💼 Agent access requests'), ac, h('h3', {}, '📷 Photo approvals'), ph);
  const load = async () => {
    const [a, b, c] = await Promise.all([sb.rpc('pwd_requests_list'), sb.rpc('access_requests_list'), sb.from('members').select('id,full_name,member_code,photo_pending').not('photo_pending', 'is', null).limit(100)]);
    pw.replaceChildren(...((a.data || []).length ? a.data.map(r => h('div', { class: 'card row2' }, h('div', {}, h('b', {}, r.full_name), h('div', { class: 'muted s' }, [r.level, r.area, r.email].filter(Boolean).join(' · '))),
      h('div', { class: 'chips' }, h('button', { class: 'btn sm', onclick: () => resetFor(r.user_id, r.full_name, r.email, box, load) }, 'Approve & generate'), h('button', { class: 'btn alt sm', onclick: async () => { await sb.rpc('pwd_request_dismiss', { p_id: r.id }); load(); } }, 'Dismiss')))) : [h('p', { class: 'muted' }, 'No password requests.')]));
    ac.replaceChildren(...((b.data || []).length ? b.data.map(r => h('div', { class: 'card row2' }, h('div', {}, h('b', {}, r.full_name), h('div', { class: 'muted s' }, [r.email, r.phone, r.city].filter(Boolean).join(' · ')), r.note ? h('div', { class: 'muted s' }, r.note) : null),
      h('div', { class: 'chips' }, h('button', { class: 'btn sm', onclick: async () => { const x = await sb.rpc('access_request_decide', { p_id: r.id, p_approve: true }); toast(x.error ? friendly(x.error) : 'Approved as agent'); load(); } }, 'Approve'),
        h('button', { class: 'btn alt bad sm', onclick: async () => { const x = await sb.rpc('access_request_decide', { p_id: r.id, p_approve: false }); toast(x.error ? friendly(x.error) : 'Rejected'); load(); } }, 'Reject')))) : [h('p', { class: 'muted' }, 'No access requests.')]));
    ph.replaceChildren(...((c.data || []).length ? c.data.map(m => h('div', { class: 'card row2' }, h('div', { class: 'row-ph' }, h('img', { src: m.photo_pending, alt: '', style: 'width:54px;height:66px;object-fit:cover;border-radius:8px' }), h('div', {}, h('b', {}, m.full_name), h('div', { class: 'muted s' }, m.member_code))),
      h('div', { class: 'chips' }, h('button', { class: 'btn sm', onclick: async () => { await uploadPhotos([m.id], [{ index: 0, data: m.photo_pending }]); const x = await sb.rpc('member_photo_pending_clear', { p_id: m.id }); toast(x.error ? friendly(x.error) : 'Photo approved'); load(); } }, 'Approve'),
        h('button', { class: 'btn alt bad sm', onclick: async () => { const x = await sb.rpc('member_photo_pending_clear', { p_id: m.id }); toast(x.error ? friendly(x.error) : 'Rejected'); load(); } }, 'Reject')))) : [h('p', { class: 'muted' }, 'No photos waiting.')]));
  };
  load();
}
