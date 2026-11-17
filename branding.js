import { sb, h, hi, toast, friendly } from './core.js';
import { logoUrl, squareLogo, brand, loadBrand } from './brand.js';
import { loadPdfLibs } from './pdf.js';

const FIELDS = [['short_name', 'Short name', 'CJBWS'], ['tagline', 'Tagline / place (shown under the title)', 'Chandur Bazar'], ['estd', 'ESTD year', '2016'],
  ['header_line1', 'PDF header line 1', 'CHHIPA JAMAT BARAR WELFARE SOCIETY'], ['header_line2', 'PDF header line 2', 'Chandur Bazar, Maharashtra - All India'],
  ['footer_text', 'PDF footer line', 'Together We Build a Stronger Community'], ['address_line', 'Address (for labels)', ''], ['contact', 'Contact phone / email', ''],
  ['app_url', 'App link for the QR (https://…)', 'https://hk1985ampm-stack.github.io/chhipa-one/']];

function qrCanvas(text, scale = 8) {
  const q = window.qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(), c = document.createElement('canvas'); c.width = c.height = (n + 4) * scale;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#0d3220';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect((k + 2) * scale, (r + 2) * scale, scale, scale);
  return c;
}

export async function brandingTab(c, reload) {
  const { data: row, error } = await sb.from('communities').select('*').eq('id', c.id).single(); if (error) throw error;
  await loadPdfLibs();
  const inputs = {}; let logoPath = row.logo_path;
  const prev = h('img', { class: 'logo', style: 'width:96px;height:96px', src: logoUrl(logoPath) || 'stamp.png' });
  const pick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = async () => { if (!i.files[0]) return; try {
      const blob = await squareLogo(i.files[0]), path = 'logo-' + Date.now() + '.png';
      const { error: e } = await sb.storage.from('branding').upload(path, blob, { contentType: 'image/png', upsert: false }); if (e) throw e;
      logoPath = path; prev.src = logoUrl(path); toast('Logo ready. Tap Save branding.'); } catch (e) { toast(friendly(e)); } };
    i.click(); };
  const form = FIELDS.map(([k, t, ph]) => { inputs[k] = h('input', { value: row[k] || '', placeholder: ph }); return h('div', {}, h('label', {}, t), inputs[k]); });
  const save = async () => {
    const p = { logo_path: logoPath || '' }; for (const [k] of FIELDS) p[k] = inputs[k].value;
    const { error: e } = await sb.rpc('community_set_branding', { p_id: c.id, p }); if (e) return toast(friendly(e));
    await loadBrand(); toast('Branding saved'); dispatchEvent(new Event('hashchange'));
  };
  const url = () => inputs.app_url.value.trim() || row.app_url || '';
  const qrBox = h('div', { style: 'text-align:center' });
  const drawQr = () => { qrBox.replaceChildren(); if (!/^https:\/\//.test(url())) return qrBox.append(h('p', { class: 'muted s' }, 'Enter the app link above to see the QR.')); const cv = qrCanvas(url(), 5); cv.style.width = '180px'; cv.style.height = '180px'; qrBox.append(cv); };
  inputs.app_url.addEventListener('input', drawQr); drawQr();
  const png = () => { if (!/^https:\/\//.test(url())) return toast('Enter the app link first'); const a = document.createElement('a'); a.href = qrCanvas(url(), 12).toDataURL('image/png'); a.download = 'chhipa-one-qr.png'; a.click(); };
  const poster = async () => {
    if (!/^https:\/\//.test(url())) return toast('Enter the app link first');
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), W = 210, DG = [13, 50, 30], GO = [180, 140, 40];
    doc.setFillColor(250, 248, 238); doc.rect(0, 0, W, 297, 'F'); doc.setDrawColor(...GO); doc.setLineWidth(1); doc.rect(8, 8, W - 16, 281, 'S');
    doc.setFillColor(...DG); doc.rect(8, 8, W - 16, 52, 'F');
    const lg = logoUrl(logoPath); if (lg) { try { const cv = await new Promise((ok, no) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = no; im.src = lg; });
      doc.setFillColor(255, 255, 255); doc.circle(32, 34, 15, 'F'); doc.addImage(cv, 'PNG', 19, 21, 26, 26); } catch {} }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text(doc.splitTextToSize(inputs.header_line1.value || row.name, 130), 52, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 225, 200); doc.text(inputs.header_line2.value || '', 52, 46);
    doc.setTextColor(...DG); doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.text('Chhipa One', W / 2, 90, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(60, 60, 60); doc.text('Scan to open the app', W / 2, 100, { align: 'center' });
    doc.addImage(qrCanvas(url(), 12).toDataURL('image/png'), 'PNG', 45, 110, 120, 120);
    doc.setFontSize(10); doc.text(url(), W / 2, 238, { align: 'center' });
    doc.setFontSize(11); doc.text([inputs.address_line.value, inputs.contact.value].filter(Boolean), W / 2, 252, { align: 'center' });
    doc.setFillColor(...DG); doc.rect(8, 270, W - 16, 19, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(12); doc.text(inputs.footer_text.value || 'Together We Build a Stronger Community', W / 2, 282, { align: 'center' });
    doc.save('chhipa-one-label-qr.pdf');
  };
  return h('div', {},
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Logo'), h('div', { style: 'display:flex;gap:14px;align-items:center' }, prev,
      h('div', {}, h('button', { class: 'btn alt', onclick: pick }, '📷 Upload logo'), h('p', { class: 'muted s' }, 'Square picture works best. It appears on the login page, the top bar, Home and every PDF.')))),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Labels'), ...form, h('p', {}, h('button', { class: 'btn', onclick: save }, 'Save branding'))),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'QR & printable label'), qrBox,
      h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: png }, '⬇ QR picture'), h('button', { class: 'btn', onclick: poster }, '🖨 Label / QR poster (PDF)')),
      h('p', { class: 'muted s' }, 'Print the poster for the office or mosque notice board. Anyone who scans it opens the app link.')));
}
