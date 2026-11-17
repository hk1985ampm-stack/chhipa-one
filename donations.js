import { sb, h, hi, toast, friendly, myLocations, state, isApprover, digits } from './core.js';
import { brand } from './brand.js';
import { loadPdfLibs } from './pdf.js';

const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const fd = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const csv = rows => rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; a.click(); };

async function receiptPdf(d, fam) {
  await loadPdfLibs(); const B = brand.data || {}, doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' }), W = 210, H = 148;
  doc.setFillColor(250, 248, 238); doc.rect(0, 0, W, H, 'F'); doc.setDrawColor(180, 140, 40); doc.setLineWidth(.8); doc.rect(4, 4, W - 8, H - 8, 'S');
  doc.setFillColor(13, 50, 30); doc.rect(4, 4, W - 8, 24, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(B.header_line1 || B.name || 'CHHIPA JAMAT BARAR WELFARE SOCIETY', W / 2, 15, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(210, 235, 210); doc.text(B.header_line2 || B.address_line || '', W / 2, 21, { align: 'center' });
  doc.setTextColor(13, 50, 30); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('DONATION RECEIPT', W / 2, 38, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(20, 20, 20); doc.text('Receipt No: ' + d.receipt_no, 14, 48); doc.text('Date: ' + fd(d.paid_on), W - 14, 48, { align: 'right' });
  const L = (t, v, y) => { doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100); doc.setFontSize(9); doc.text(t, 14, y); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.setFontSize(11); doc.text(String(v || '—'), 56, y); };
  L('Received from', fam.head_name, 60); L('Family ID', fam.family_code, 69); L('City', fam.city, 78); L('Towards', 'Annual Donation (Chanda) · Year ' + d.fy, 87); L('Mode of payment', d.mode, 96);
  doc.setFillColor(13, 50, 30); doc.roundedRect(14, 105, 70, 14, 2, 2, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.text('Rs. ' + Number(d.amount).toLocaleString('en-IN'), 49, 114.5, { align: 'center' });
  doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Authorised signatory', W - 14, 125, { align: 'right' }); doc.line(W - 60, 121, W - 14, 121);
  doc.setFontSize(8); doc.setTextColor(110, 110, 110); doc.text((B.footer_text || 'JazakAllah Khair') + (d.voided ? '   ·   CANCELLED' : ''), W / 2, H - 8, { align: 'center' });
  doc.save(d.receipt_no + '.pdf');
}

export async function render(main) {
  if (!isApprover() && !state.profile.can_export) { /* agents may record only */ }
  const locs = await myLocations(), appr = isApprover(), ro = !!state.profile.read_only, thisY = new Date().getFullYear();
  const loc = h('select', {}, h('option', { value: '' }, 'All locations'), locs.map(l => h('option', { value: l.id }, l.city)));
  const fy = h('select', {}, [thisY + 1, thisY, thisY - 1, thisY - 2].map(y => h('option', { value: y, selected: y === thisY }, y)));
  const q = h('input', { type: 'search', placeholder: 'Search family ID, name or mobile' }), filt = h('select', {}, [['all', 'All families'], ['due', 'Pending (due)'], ['paid', 'Paid']].map(([v, t]) => h('option', { value: v }, t)));
  const sum = h('div'), list = h('div'), box = h('div'); let annual = 1200, data = [];
  const load = async () => {
    list.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    const [a, s] = await Promise.all([sb.rpc('donation_amount'), sb.rpc('donation_status', { p_fy: +fy.value, p_location: loc.value || null })]);
    if (s.error) return list.replaceChildren(h('div', { class: 'card err' }, friendly(s.error))); annual = a.data || 1200; data = s.data; draw();
  };
  const draw = () => {
    const paid = data.reduce((x, r) => x + +r.paid, 0), full = data.filter(r => +r.due === 0).length, term = q.value.trim().toLowerCase();
    sum.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'stats s4' }, [[inr(paid), 'Collected'], [full, 'Paid families'], [data.length - full, 'Pending'], [inr(data.reduce((x, r) => x + +r.due, 0)), 'Total due']].map(([b, t]) => h('div', { class: 'st' }, h('b', {}, String(b)), h('span', {}, t)))),
      h('p', { class: 'muted' }, 'Annual donation: ' + inr(annual) + ' per family'), h('div', { class: 'chips' }, h('button', { class: 'btn alt sm', onclick: exportCsv }, '⬇ CSV'), h('button', { class: 'btn alt sm', onclick: () => history() }, '🧾 Receipts'),
        state.profile.role === 'super_admin' ? h('button', { class: 'btn alt sm', onclick: setAmt }, '✏️ Change amount') : null)));
    const rows = data.filter(r => (filt.value === 'all' || (filt.value === 'due') === (+r.due > 0)) && (!term || [r.family_code, r.head_name, r.mobile].join(' ').toLowerCase().includes(term))).slice(0, 200);
    list.replaceChildren(h('p', { class: 'muted' }, rows.length + ' shown'), ...rows.map(r => h('div', { class: 'card item-card' }, h('div', { class: 'ic-head' }, h('b', {}, r.head_name || '—'), h('small', { class: 'muted' }, r.family_code + ' · ' + r.city + (r.mobile ? ' · ' + r.mobile : ''))),
      h('p', {}, h('span', { class: 'pill ' + (+r.due > 0 ? 'pending' : 'approved') }, +r.due > 0 ? 'Due ' + inr(r.due) : 'Paid'), ' ', h('span', { class: 'muted' }, 'Paid ' + inr(r.paid) + (r.last_paid ? ' · last ' + fd(r.last_paid) : ''))),
      h('div', { class: 'chips' }, ro ? null : h('button', { class: 'btn sm', onclick: () => record(r) }, '+ Record payment'), +r.due > 0 && digits(r.mobile).length === 10 ? h('a', { class: 'btn alt sm', target: '_blank', rel: 'noopener', href: 'https://wa.me/91' + digits(r.mobile) + '?text=' + encodeURIComponent(`Assalamu Alaikum ${r.head_name},\nA gentle reminder: annual donation of ${inr(annual)} for ${fy.value} is pending (${inr(r.due)}).\nJazakAllah Khair.\n— ${(brand.data && (brand.data.short_name || brand.data.name)) || 'Chhipa Jamat'}`) }, '💬 Remind') : null))));
  };
  const exportCsv = () => download(`donations-${fy.value}.csv`, csv([['Family ID', 'Head', 'City', 'Mobile', 'Paid', 'Due', 'Last paid'], ...data.map(r => [r.family_code, r.head_name, r.city, r.mobile, r.paid, r.due, r.last_paid])]));
  const setAmt = async () => { const v = prompt('Annual donation per family (₹)', annual); if (!v) return; const { error } = await sb.rpc('donation_set_amount', { p: +v }); if (error) return toast(friendly(error)); toast('Updated'); load(); };
  const record = r => {
    const amt = h('input', { type: 'number', inputmode: 'numeric', value: Math.max(+r.due, 0) || annual }), on = h('input', { type: 'date', value: new Date().toISOString().slice(0, 10) }), mode = h('select', {}, ['Cash', 'UPI', 'Bank', 'Cheque', 'Other'].map(m => h('option', {}, m))), note = h('input', { placeholder: 'Note (optional)' }), err = h('p', { class: 'err' });
    box.replaceChildren(h('div', { class: 'card' }, h('h3', {}, 'Payment · ' + (r.head_name || '') + ' (' + r.family_code + ')'), h('label', {}, 'Amount (₹) *'), amt, h('label', {}, 'Date'), on, h('label', {}, 'Mode'), mode, h('label', {}, 'Note'), note, err,
      h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => box.replaceChildren() }, 'Cancel'), h('button', { class: 'btn', onclick: async ev => {
        if (!(+amt.value > 0)) return (err.textContent = 'Enter the amount'); ev.target.disabled = true;
        const { data: d, error } = await sb.rpc('donation_record', { p_family: r.family_id, p_fy: +fy.value, p_amount: +amt.value, p_paid_on: on.value, p_mode: mode.value, p_note: note.value });
        if (error) { ev.target.disabled = false; return (err.textContent = friendly(error)); } box.replaceChildren(); toast('Saved · ' + d.receipt_no);
        await receiptPdf({ receipt_no: d.receipt_no, paid_on: on.value, amount: +amt.value, mode: mode.value, fy: +fy.value }, r); load(); } }, 'Save & print receipt'))));
    box.scrollIntoView({ behavior: 'smooth' });
  };
  const history = async () => {
    const { data: ds, error } = await sb.from('donations').select('*').eq('fy', +fy.value).order('created_at', { ascending: false }).limit(100); if (error) return toast(friendly(error));
    const fam = Object.fromEntries(data.map(r => [r.family_id, r]));
    box.replaceChildren(h('div', { class: 'card' }, h('h3', {}, 'Receipts · ' + fy.value), ds.length ? ds.map(d => { const f = fam[d.family_id] || {}; return h('div', { class: 'item-card', style: 'border-top:1px solid var(--bd);padding:8px 0' }, h('div', { class: 'ic-head' }, h('b', {}, d.receipt_no + (d.voided ? ' (cancelled)' : '')), h('small', { class: 'muted' }, `${f.head_name || ''} · ${f.family_code || ''} · ${fd(d.paid_on)} · ${d.mode} · ${inr(d.amount)}`)),
      h('div', { class: 'chips' }, h('button', { class: 'btn alt sm', onclick: () => receiptPdf(d, f) }, '🖨 Receipt'), appr && !d.voided ? h('button', { class: 'btn alt bad sm', onclick: async () => { const why = prompt('Reason for cancelling this receipt?'); if (!why) return; const { error: e } = await sb.rpc('donation_void', { p_id: d.id, p_reason: why }); if (e) return toast(friendly(e)); toast('Cancelled'); await load(); history(); } }, 'Cancel receipt') : null)); }) : h('p', { class: 'muted' }, 'No receipts yet.'),
      h('p', {}, h('button', { class: 'btn alt', onclick: () => box.replaceChildren() }, 'Close'))));
  };
  main.append(h('h2', {}, hi('Annual Donation', 'वार्षिक चंदा')), h('div', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Location'), loc), h('div', {}, h('label', {}, 'Year'), fy)), q, filt), sum, box, list);
  [loc, fy].forEach(e => e.addEventListener('change', load)); q.addEventListener('input', draw); filt.addEventListener('change', draw); await load();
}
