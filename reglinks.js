import { sb, h, hi, toast, friendly, myLocations } from './core.js';
import { brand } from './brand.js';
import { loadPdfLibs, qrPng } from './pdf.js';

const base = () => (brand.data && brand.data.app_url) || (location.origin + location.pathname);
const url = t => base().replace(/\/$/, '').replace(/index\.html$/, '').replace(/\/$/, '') + '/#register/' + t;

async function poster(l, city) {
  await loadPdfLibs(); const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a5' }), W = 148, B = brand.data || {};
  doc.setFillColor(13, 50, 30); doc.rect(0, 0, W, 26, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(B.header_line1 || B.name || 'CHHIPA JAMAT BARAR WELFARE SOCIETY', W / 2, 14, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text('Family registration · ' + city, W / 2, 21, { align: 'center' });
  doc.setTextColor(13, 50, 30); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Register your family', W / 2, 42, { align: 'center' });
  doc.setDrawColor(180, 140, 40); doc.setLineWidth(.8); doc.roundedRect(W / 2 - 40, 50, 80, 80, 3, 3, 'S'); doc.addImage(qrPng(url(l.token)), 'PNG', W / 2 - 36, 54, 72, 72);
  doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text('Scan with your phone camera and fill in the form.', W / 2, 140, { align: 'center' });
  doc.setFontSize(8); doc.text('Valid until ' + new Date(l.expires_at).toLocaleDateString('en-IN'), W / 2, 147, { align: 'center' }); doc.save('registration-qr-' + city + '.pdf');
}

export async function render(main) {
  const locs = await myLocations(), out = h('div');
  const loc = h('select', {}, locs.map(l => h('option', { value: l.id }, l.city))), days = h('input', { type: 'number', value: 7, min: 1, max: 90 }), max = h('input', { type: 'number', value: 50, min: 1, max: 1000 }), note = h('input', { placeholder: 'Note, e.g. Eid camp' });
  const load = async () => {
    const { data, error } = await sb.from('reg_links').select('*').order('created_at', { ascending: false }).limit(50); if (error) return out.replaceChildren(h('div', { class: 'card err' }, friendly(error)));
    const city = id => (locs.find(l => l.id === id) || {}).city || '';
    out.replaceChildren(...(data.length ? data.map(l => { const live = l.active && new Date(l.expires_at) > new Date() && l.uses < l.max_uses;
      return h('div', { class: 'card item-card' }, h('div', { class: 'ic-head' }, h('b', {}, city(l.location_id) + (l.note ? ' · ' + l.note : '')), h('small', { class: 'muted' }, `Used ${l.uses}/${l.max_uses} · until ${new Date(l.expires_at).toLocaleDateString('en-IN')}`)),
        h('p', {}, h('span', { class: 'pill ' + (live ? 'approved' : 'rejected') }, live ? 'live' : l.active ? 'expired / full' : 'switched off')),
        h('div', { class: 'chips' }, h('button', { class: 'btn alt sm', onclick: async () => { try { await navigator.clipboard.writeText(url(l.token)); toast('Link copied'); } catch { prompt('Copy this link', url(l.token)); } } }, '🔗 Copy link'),
          h('a', { class: 'btn alt sm', target: '_blank', rel: 'noopener', href: 'https://wa.me/?text=' + encodeURIComponent('Please register your family here:\n' + url(l.token)) }, '💬 WhatsApp'),
          h('button', { class: 'btn alt sm', onclick: () => poster(l, city(l.location_id)) }, '🖨 QR poster'),
          h('button', { class: 'btn alt bad sm', onclick: async () => { const { error: e } = await sb.rpc('reg_link_set_active', { p_id: l.id, p_active: !l.active }); e ? toast(friendly(e)) : load(); } }, l.active ? 'Switch off' : 'Switch on')));
    }) : [h('div', { class: 'card muted' }, 'No links yet.')]));
  };
  const make = async ev => { ev.target.disabled = true; const { error } = await sb.rpc('reg_link_create', { p_loc: loc.value, p_days: +days.value, p_max: +max.value, p_note: note.value }); ev.target.disabled = false; error ? toast(friendly(error)) : (toast('Link created'), load()); };
  main.append(h('h2', {}, hi('Registration Links', 'पंजीकरण लिंक')), h('div', { class: 'card' }, h('p', { class: 'muted s' }, 'Families fill their own details through a secure link. Everything they send waits as “pending” until an admin approves it — no Family ID is issued before that.'),
    h('label', {}, 'Location'), loc, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Valid for (days)'), days), h('div', {}, h('label', {}, 'Max registrations'), max)), h('label', {}, 'Note'), note, h('p', {}, h('button', { class: 'btn', onclick: make }, 'Create link'))), out);
  await load();
}
