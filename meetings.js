import { crudPage } from './crud.js';
import { hi, h } from './core.js';
import { loadPdfLibs } from './pdf.js';
import { brand } from './brand.js';
const fd = d => d ? new Date(d).toLocaleDateString('en-IN') : '';
async function pdf(r) {
  await loadPdfLibs(); const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), W = 210, B = brand.data || {};
  doc.setFillColor(13, 50, 30); doc.rect(0, 0, W, 22, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(B.header_line1 || B.name || 'CHHIPA JAMAT BARAR WELFARE SOCIETY', W / 2, 10, { align: 'center' }); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text('MEETING MINUTES', W / 2, 17, { align: 'center' });
  let y = 34; doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(doc.splitTextToSize(r.title, 180), 15, y); y += 8 * Math.max(1, doc.splitTextToSize(r.title, 180).length);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(`Date: ${fd(r.held_on)}      Venue: ${r.venue || '—'}      Present: ${r.attendees_count ?? '—'}`, 15, y); y += 8;
  for (const [k, t] of [['agenda', 'Agenda'], ['minutes', 'Minutes'], ['decisions', 'Decisions'], ['attendees', 'Attendees']]) { if (!r[k]) continue; if (y > 265) { doc.addPage(); y = 20; } doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(13, 50, 30); doc.text(t, 15, y); y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
    for (const ln of doc.splitTextToSize(r[k], 180)) { if (y > 280) { doc.addPage(); y = 20; } doc.text(ln, 15, y); y += 5; } y += 4; }
  doc.setFontSize(9); doc.setTextColor(110, 110, 110); doc.text((B.footer_text || '') + '   ·   Printed ' + new Date().toLocaleDateString('en-IN'), 15, 290); doc.save('minutes-' + (r.held_on || 'meeting') + '.pdf');
}
export async function render(main) {
  await crudPage(main, { table: 'meetings', title: hi('Meetings & Minutes', 'बैठक / कार्यवृत्त'), order: ['held_on', false],
    fields: [{ k: 'title', label: 'Title', req: 1 }, { k: 'held_on', label: 'Date', type: 'date', req: 1, def: new Date().toISOString().slice(0, 10) }, { k: 'venue', label: 'Venue' }, { k: 'attendees_count', label: 'Number present', type: 'number' }, { k: 'agenda', label: 'Agenda', type: 'textarea' }, { k: 'minutes', label: 'Minutes', type: 'textarea', rows: 6 }, { k: 'decisions', label: 'Decisions', type: 'textarea' }, { k: 'attendees', label: 'Attendees (names)', type: 'textarea', rows: 3 }],
    row: r => [r.title, fd(r.held_on) + (r.venue ? ' · ' + r.venue : '') + (r.attendees_count != null ? ' · ' + r.attendees_count + ' present' : ''), r.decisions || r.minutes],
    extra: r => h('button', { class: 'btn alt sm', onclick: () => pdf(r) }, '🖨 Minutes PDF') });
}
