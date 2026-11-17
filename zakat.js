import { h, hi } from './core.js';
import { brand } from './brand.js';
import { loadPdfLibs } from './pdf.js';
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const GOLD_NISAB = 87.48, SILVER_NISAB = 612.36;   // grams

export async function render(main) {
  const num = (id, label, ph) => { const i = h('input', { type: 'number', inputmode: 'decimal', min: 0, placeholder: ph || '0' }); i.dataset.k = id; return h('div', {}, h('label', {}, label), i); };
  const g = h('input', { type: 'number', inputmode: 'decimal', placeholder: '0' }), s = h('input', { type: 'number', inputmode: 'decimal', placeholder: '0' });
  const basis = h('select', {}, h('option', { value: 'silver' }, 'Silver nisab · 612.36 g'), h('option', { value: 'gold' }, 'Gold nisab · 87.48 g'));
  const form = h('div', { class: 'card' }, h('div', { class: 'row' }, num('gold', 'Gold (grams)'), num('silver', 'Silver (grams)'), num('cash', 'Cash in hand (₹)'), num('bank', 'Bank / savings (₹)'), num('biz', 'Business stock (₹)'), num('recv', 'Money owed to you (₹)'), num('inv', 'Investments / shares (₹)'), num('other', 'Other zakatable assets (₹)'), num('debt', 'Debts / liabilities due (₹)')));
  const out = h('div', { class: 'card' }); let last = null;
  const v = k => +(form.querySelector(`[data-k=${k}]`).value || 0);
  const calc = () => {
    const gp = +g.value || 0, sp = +s.value || 0, assets = v('gold') * gp + v('silver') * sp + v('cash') + v('bank') + v('biz') + v('recv') + v('inv') + v('other'), net = Math.max(assets - v('debt'), 0), nisab = basis.value === 'gold' ? GOLD_NISAB * gp : SILVER_NISAB * sp, due = nisab > 0 && net >= nisab ? net * .025 : 0;
    last = { assets, net, nisab, due, ok: nisab > 0 };
    out.replaceChildren(h('div', { class: 'stats s4' }, [[inr(assets), 'Total assets'], [inr(net), 'Net (after debts)'], [nisab ? inr(nisab) : '—', 'Nisab value'], [inr(due), 'Zakat due (2.5%)']].map(([b, t]) => h('div', { class: 'st' }, h('b', {}, b), h('span', {}, t)))),
      h('p', { class: ' muted' }, !nisab ? 'Enter the gold/silver price to compare with the nisab.' : due ? 'Your net wealth is above the nisab, so zakat is due.' : 'Your net wealth is below the nisab, so zakat is not due.'),
      h('div', { class: 'chips' }, h('button', { class: 'btn alt sm', onclick: pdf }, '🖨 Save as PDF')), h('p', { class: 'muted' }, 'A guide only — nothing here is saved. For your own situation, please confirm with a scholar.'));
  };
  const pdf = async () => {
    await loadPdfLibs(); const B = brand.data || {}, doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), rows = [];
    form.querySelectorAll('input').forEach(i => { if (+i.value) rows.push([i.parentElement.querySelector('label').textContent, i.value]); });
    doc.setFillColor(13, 50, 30); doc.rect(0, 0, 210, 22, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(B.header_line1 || B.name || 'CHHIPA JAMAT BARAR WELFARE SOCIETY', 105, 10, { align: 'center' }); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text('ZAKAT CALCULATION · ' + new Date().toLocaleDateString('en-IN'), 105, 17, { align: 'center' });
    doc.autoTable({ startY: 30, head: [['Item', 'Value']], body: [...rows, ['Gold price / g', g.value || '—'], ['Silver price / g', s.value || '—'], ['Nisab basis', basis.value]], theme: 'grid', headStyles: { fillColor: [13, 50, 30] }, styles: { fontSize: 10 } });
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 8, body: [['Total assets', inr(last.assets)], ['Net after debts', inr(last.net)], ['Nisab value', last.nisab ? inr(last.nisab) : '—'], ['ZAKAT DUE (2.5%)', inr(last.due)]], theme: 'grid', styles: { fontSize: 11, fontStyle: 'bold' }, columnStyles: { 1: { halign: 'right' } } });
    doc.save('zakat-calculation.pdf');
  };
  main.append(h('h2', {}, hi('Zakat Calculator', 'ज़कात कैलकुलेटर')), h('div', { class: 'card' }, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Gold price today (₹/g)'), g), h('div', {}, h('label', {}, 'Silver price today (₹/g)'), s)), h('label', {}, 'Nisab basis'), basis, h('p', { class: 'muted' }, 'Silver nisab is lower and commonly used; gold is the stricter basis.')), form, out);
  [g, s, basis, form].forEach(e => e.addEventListener('input', calc)); basis.addEventListener('change', calc); calc();
}
