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
    const p = { logo_path: logoPath || '', label_cfg: CFG }; for (const [k] of FIELDS) p[k] = inputs[k].value;
    const { error: e } = await sb.rpc('community_set_branding', { p_id: c.id, p }); if (e) return toast(friendly(e));
    await loadBrand(); toast('Branding saved'); dispatchEvent(new Event('hashchange'));
  };
  const url = () => inputs.app_url.value.trim() || row.app_url || '';
  const qrBox = h('div', { style: 'text-align:center' });
  const drawQr = () => { qrBox.replaceChildren(); if (!/^https:\/\//.test(url())) return qrBox.append(h('p', { class: 'muted s' }, 'Enter the app link above to see the QR.')); const cv = qrCanvas(url(), 5); cv.style.width = '180px'; cv.style.height = '180px'; qrBox.append(cv); };
  inputs.app_url.addEventListener('input', () => { drawQr(); drawPrev(); }); drawQr();
  const png = () => { if (!/^https:\/\//.test(url())) return toast('Enter the app link first'); const a = document.createElement('a'); a.href = qrCanvas(url(), 12).toDataURL('image/png'); a.download = 'chhipa-one-qr.png'; a.click(); };
  const cfg0 = row.label_cfg || {}, CFG = { poster_title: cfg0.poster_title ?? 'Chhipa One', scan_text: cfg0.scan_text ?? 'Scan to open the app', size: cfg0.size || 'a4', theme: cfg0.theme || 'green',
    show_logo: cfg0.show_logo !== false, show_header: cfg0.show_header !== false, show_url: cfg0.show_url !== false, show_address: cfg0.show_address !== false, show_contact: cfg0.show_contact !== false, show_footer: cfg0.show_footer !== false };
  const THEMES = { green: [[13, 50, 30], [180, 140, 40], [250, 248, 238]], blue: [[16, 52, 96], [200, 160, 60], [245, 248, 252]], maroon: [[110, 20, 40], [200, 160, 60], [253, 247, 245]], black: [[25, 25, 25], [190, 150, 50], [255, 255, 255]] };
  const SIZES = { a4: [210, 297, 'A4 poster'], a5: [148, 210, 'A5 notice'], sticker: [90, 55, 'Sticker 90×55 mm'] };
  const ci = {};
  const sel = (k, opts) => { ci[k] = h('select', { onchange: () => { CFG[k] = ci[k].value; drawPrev(); } }, opts.map(([v, t]) => h('option', { value: v, selected: CFG[k] === v }, t))); return ci[k]; };
  const txt = (k, ph) => { ci[k] = h('input', { value: CFG[k], placeholder: ph, oninput: () => { CFG[k] = ci[k].value; drawPrev(); } }); return ci[k]; };
  const tog = (k, t) => { ci[k] = h('input', { type: 'checkbox', checked: CFG[k], onchange: () => { CFG[k] = ci[k].checked; drawPrev(); } }); return h('label', { class: 'chk' }, ci[k], t); };
  const prev2 = h('div');
  const drawPrev = () => { const [dg, go, cr] = THEMES[CFG.theme], rgb = c => `rgb(${c})`, [pw, ph] = SIZES[CFG.size], k = 240 / pw;
    prev2.replaceChildren(h('div', { style: `width:${pw * k}px;height:${ph * k}px;background:${rgb(cr)};border:2px solid ${rgb(go)};margin:0 auto;display:flex;flex-direction:column;font-size:${Math.max(7, 9 * Math.min(1, ph / 297) + 3)}px;text-align:center;overflow:hidden` },
      CFG.show_header ? h('div', { style: `background:${rgb(dg)};color:#fff;padding:6px;display:flex;gap:6px;align-items:center;justify-content:center` }, CFG.show_logo ? h('img', { class: 'logo', style: 'width:26px;height:26px', src: logoUrl(logoPath) || 'stamp.png' }) : null, h('b', {}, (inputs.header_line1.value || row.name))) : null,
      h('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px' }, h('b', { style: `color:${rgb(dg)};font-size:1.5em` }, CFG.poster_title), h('span', {}, CFG.scan_text),
        /^https:/.test(url()) ? (() => { const cv = qrCanvas(url(), 3); cv.style.width = cv.style.height = Math.min(110, pw * k * .45) + 'px'; return cv; })() : h('i', {}, '[QR]'),
        CFG.show_url ? h('small', {}, url()) : null, CFG.show_address ? h('small', {}, inputs.address_line.value) : null, CFG.show_contact ? h('small', {}, inputs.contact.value) : null),
      CFG.show_footer ? h('div', { style: `background:${rgb(dg)};color:#fff;padding:5px;font-style:italic` }, inputs.footer_text.value || 'Together We Build a Stronger Community') : null)); };
  const poster = async () => {
    if (!/^https:\/\//.test(url())) return toast('Enter the app link first');
    const [pw, ph] = SIZES[CFG.size], [dg, go, cr] = THEMES[CFG.theme], u = pw / 210, land = CFG.size === 'sticker';
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: [pw, ph], orientation: land ? 'landscape' : 'portrait' });
    doc.setFillColor(...cr); doc.rect(0, 0, pw, ph, 'F'); doc.setDrawColor(...go); doc.setLineWidth(land ? .5 : 1 * u + .3); doc.rect(land ? 1.5 : 8 * u, land ? 1.5 : 8 * u, pw - (land ? 3 : 16 * u), ph - (land ? 3 : 16 * u), 'S');
    let img = null; const lg = CFG.show_logo && logoUrl(logoPath);
    if (lg) { try { img = await new Promise((ok, no) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = no; im.src = lg; }); } catch {} }
    const T = (t, x, y, o) => doc.text(String(t), x, y, o), name = inputs.header_line1.value || row.name, qr = qrCanvas(url(), 12).toDataURL('image/png');
    if (land) {   // small sticker / badge: logo + name on the left, QR on the right
      doc.setFillColor(...dg); doc.rect(1.5, 1.5, pw - 3, 14, 'F');
      if (img) { doc.setFillColor(255, 255, 255); doc.circle(10, 8.5, 5.2, 'F'); doc.addImage(img, 'PNG', 5.5, 4, 9, 9); }
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); T(doc.splitTextToSize(name, pw - 24).slice(0, 2), 17, 7.5);
      doc.setTextColor(...dg); doc.setFontSize(10); T(CFG.poster_title, 6, 24); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(60, 60, 60); T(doc.splitTextToSize(CFG.scan_text, 40), 6, 29);
      if (CFG.show_address) T(doc.splitTextToSize(inputs.address_line.value || '', 42).slice(0, 2), 6, 38); if (CFG.show_contact) T(inputs.contact.value || '', 6, 46);
      doc.addImage(qr, 'PNG', pw - 33, 18, 30, 30); if (CFG.show_url) { doc.setFontSize(4.5); T(url().replace('https://', ''), pw - 18, 51, { align: 'center' }); }
      if (CFG.show_footer) { doc.setFontSize(5); doc.setFont('helvetica', 'bolditalic'); doc.setTextColor(...dg); T(inputs.footer_text.value || 'Together We Build a Stronger Community', 6, 52); }
    } else {
      const m = 8 * u, hh = 52 * u; if (CFG.show_header) { doc.setFillColor(...dg); doc.rect(m, m, pw - 2 * m, hh, 'F');
        if (img) { doc.setFillColor(255, 255, 255); doc.circle(m + 24 * u, m + hh / 2, 15 * u, 'F'); doc.addImage(img, 'PNG', m + 11 * u, m + hh / 2 - 13 * u, 26 * u, 26 * u); }
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17 * u + 2); T(doc.splitTextToSize(name, pw - 2 * m - 60 * u), m + 44 * u, m + 22 * u);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10 * u + 1); doc.setTextColor(200, 225, 200); T(inputs.header_line2.value || '', m + 44 * u, m + 38 * u); }
      doc.setTextColor(...dg); doc.setFont('helvetica', 'bold'); doc.setFontSize(26 * u + 2); T(CFG.poster_title, pw / 2, ph * .30, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(13 * u + 1); doc.setTextColor(60, 60, 60); T(CFG.scan_text, pw / 2, ph * .30 + 10 * u, { align: 'center' });
      const qs = pw * .57; doc.addImage(qr, 'PNG', (pw - qs) / 2, ph * .30 + 16 * u, qs, qs);
      let y = ph * .30 + 16 * u + qs + 8 * u; doc.setFontSize(10 * u + 1); if (CFG.show_url) { T(url(), pw / 2, y, { align: 'center' }); y += 9 * u; }
      doc.setFontSize(11 * u + 1); const extra = [CFG.show_address && inputs.address_line.value, CFG.show_contact && inputs.contact.value].filter(Boolean); if (extra.length) T(extra, pw / 2, y, { align: 'center' });
      if (CFG.show_footer) { doc.setFillColor(...dg); doc.rect(m, ph - m - 19 * u, pw - 2 * m, 19 * u, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(12 * u + 1); T(inputs.footer_text.value || 'Together We Build a Stronger Community', pw / 2, ph - m - 7 * u, { align: 'center' }); }
    }
    doc.save('chhipa-one-label-' + CFG.size + '.pdf');
  };
  Object.values(inputs).forEach(i => i.addEventListener('input', () => drawPrev()));
  setTimeout(drawPrev, 0);
  return h('div', {},
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Logo'), h('div', { style: 'display:flex;gap:14px;align-items:center' }, prev,
      h('div', {}, h('button', { class: 'btn alt', onclick: pick }, '📷 Upload logo'), h('p', { class: 'muted s' }, 'Square picture works best. It appears on the login page, the top bar, Home and every PDF.')))),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Labels'), ...form, h('p', {}, h('button', { class: 'btn', onclick: save }, 'Save branding'))),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'Label design · customize'),
      h('label', {}, 'Size'), sel('size', Object.entries(SIZES).map(([v, a]) => [v, a[2]])), h('label', {}, 'Colour theme'), sel('theme', [['green', 'Green & gold'], ['blue', 'Blue & gold'], ['maroon', 'Maroon & gold'], ['black', 'Black & gold']]),
      h('label', {}, 'Title'), txt('poster_title', 'Chhipa One'), h('label', {}, 'Line under the title'), txt('scan_text', 'Scan to open the app'),
      h('div', { class: 'chips' }, tog('show_header', 'Header'), tog('show_logo', 'Logo'), tog('show_url', 'Link'), tog('show_address', 'Address'), tog('show_contact', 'Contact'), tog('show_footer', 'Footer')),
      h('p', { class: 'muted s' }, 'Title, header, address, contact and footer text come from the fields above. Tap Save branding to keep your design.'), prev2),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, 'QR & printable label'), qrBox,
      h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: png }, '⬇ QR picture'), h('button', { class: 'btn', onclick: poster }, '🖨 Print label (PDF)')),
      h('p', { class: 'muted s' }, 'Print the poster for the office or mosque notice board. Anyone who scans it opens the app link.')));
}
