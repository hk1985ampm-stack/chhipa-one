// Shared letterhead for every printable document: logo, trust name, address, phone, registration no., themed colours.
import { brand, logoUrl } from './brand.js';

// dg = deep colour, lt = bright colour (gradient end), go = accent, cr = paper tint, soft = table zebra
export const THEMES = {
  emerald: { name: 'Emerald & Gold', dg: [6, 78, 59], lt: [16, 185, 129], go: [234, 179, 8], cr: [255, 252, 240], soft: [232, 250, 241] },
  royal: { name: 'Royal Blue', dg: [30, 41, 120], lt: [59, 130, 246], go: [245, 158, 11], cr: [247, 250, 255], soft: [232, 241, 255] },
  maroon: { name: 'Maroon & Rose', dg: [127, 29, 29], lt: [236, 72, 100], go: [234, 179, 8], cr: [255, 249, 246], soft: [255, 236, 238] },
  sunset: { name: 'Sunset Orange', dg: [154, 52, 18], lt: [249, 115, 22], go: [250, 204, 21], cr: [255, 251, 244], soft: [255, 240, 222] },
  violet: { name: 'Violet & Pink', dg: [76, 29, 149], lt: [168, 85, 247], go: [244, 114, 182], cr: [252, 248, 255], soft: [245, 236, 255] },
  teal: { name: 'Teal & Sun', dg: [19, 78, 94], lt: [6, 182, 212], go: [250, 204, 21], cr: [244, 253, 255], soft: [224, 247, 250] }
};
const DEF = { theme: 'emerald', logo: true, addr: true, phone: true, reg: true, tag: true, footer: '', sign_name: '', sign_title: 'Secretary' };
export const getCfg = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem('chhipa_doc_cfg') || '{}') }; } catch { return { ...DEF }; } };
export const saveCfg = c => { try { localStorage.setItem('chhipa_doc_cfg', JSON.stringify(c)); } catch {} };
const dataUrl = async u => { const r = await fetch(u); const b = await r.blob(); return new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); };
export const today = () => new Date().toLocaleDateString('en-IN');

export async function prep(cfg = getCfg()) {
  const B = brand.data || {}, th = THEMES[cfg.theme] || THEMES.emerald; let img = null;
  if (cfg.logo) { const u = logoUrl(B.logo_path) || 'stamp.png'; try { img = await dataUrl(u); } catch {} }
  const details = [cfg.addr && B.address_line, cfg.phone && B.contact && 'Ph: ' + B.contact, cfg.reg && B.reg_no && 'Reg. No. ' + B.reg_no].filter(Boolean).join('   |   ');
  return { B, th, cfg, img, details, name: B.header_line1 || B.name || 'CHHIPA JAMAT BARAR WELFARE SOCIETY', tag: cfg.tag ? (B.header_line2 || B.tagline || '') : '' };
}
export function grad(doc, x, y, w, h, c1, c2, n = 60) {
  for (let i = 0; i < n; i++) { const t = i / (n - 1); doc.setFillColor(...c1.map((v, k) => Math.round(v + (c2[k] - v) * t))); doc.rect(x + w * i / n, y, w / n + .35, h, 'F'); } }
const fit = (doc, s, w, size, min = 6) => { doc.setFontSize(size); while (size > min && doc.getTextWidth(s) > w) { size -= .5; doc.setFontSize(size); } return size; };

// Full letterhead at the top of page 1. Returns the y where content can start.
export function headFull(doc, L, title, sub, date) {
  const W = doc.internal.pageSize.getWidth(), { th } = L, hasDet = !!L.details;
  grad(doc, 0, 0, W, hasDet ? 33 : 28, th.dg, th.lt);
  doc.setFillColor(...th.go); doc.rect(0, hasDet ? 33 : 28, W, 1.2, 'F'); doc.setFillColor(...th.lt); doc.rect(0, (hasDet ? 33 : 28) + 1.2, W, .6, 'F');
  const cx = L.img ? 20 : 8, mid = (W + (L.img ? 26 : 0)) / 2 - (L.img ? 13 : 0);
  if (L.img) { doc.setFillColor(...th.go); doc.circle(17, 15, 10.4, 'F'); doc.setFillColor(255, 255, 255); doc.circle(17, 15, 9.4, 'F'); try { doc.addImage(L.img, L.img.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', 9.2, 7.2, 15.6, 15.6, undefined, 'FAST'); } catch {} }
  const cw = W - (L.img ? 44 : 20), cxm = (L.img ? 32 : 10) + cw / 2;
  doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); fit(doc, L.name, cw, 16, 9); doc.text(L.name, cxm, 12.5, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 245, 200); if (L.tag) { fit(doc, L.tag, cw, 9, 6); doc.text(L.tag, cxm, 18.6, { align: 'center' }); }
  if (hasDet) { doc.setTextColor(255, 255, 255); fit(doc, L.details, cw, 7.8, 5.5); doc.text(L.details, cxm, 26.5, { align: 'center' }); }
  const y0 = (hasDet ? 33 : 28) + 5.5;
  if (title) { doc.setFont('helvetica', 'bold'); const t = title.toUpperCase(); fit(doc, t, W - 60, 12, 8); const tw = doc.getTextWidth(t) + 14;
    doc.setFillColor(...th.dg); doc.roundedRect(W / 2 - tw / 2, y0, tw, 8, 4, 4, 'F'); doc.setDrawColor(...th.go); doc.setLineWidth(.5); doc.roundedRect(W / 2 - tw / 2, y0, tw, 8, 4, 4, 'S');
    doc.setTextColor(255, 255, 255); doc.text(t, W / 2, y0 + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70, 70, 70); if (sub) doc.text(sub, 10, y0 + 5.5); doc.text('Date: ' + (date || today()), W - 10, y0 + 5.5, { align: 'right' }); }
  return y0 + (title ? 13 : 2);
}
// Slim header repeated on later pages.
export function headSlim(doc, L, title) {
  const W = doc.internal.pageSize.getWidth(), { th } = L;
  grad(doc, 0, 0, W, 12, th.dg, th.lt, 40); doc.setFillColor(...th.go); doc.rect(0, 12, W, .8, 'F');
  if (L.img) { doc.setFillColor(255, 255, 255); doc.circle(9, 6, 4.4, 'F'); try { doc.addImage(L.img, L.img.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', 5.2, 2.2, 7.6, 7.6, undefined, 'FAST'); } catch {} }
  doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.text(L.name, W / 2, 7.4, { align: 'center', maxWidth: W - 50 });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); if (title) doc.text(title, W - 8, 7.4, { align: 'right' });
  return 18;
}
export function footers(doc, L) {
  const n = doc.internal.getNumberOfPages(), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), { th } = L;
  for (let i = 1; i <= n; i++) { doc.setPage(i); grad(doc, 0, H - 9, W, 9, th.lt, th.dg, 40); doc.setFillColor(...th.go); doc.rect(0, H - 9, W, .7, 'F');
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(255, 255, 255); const ft = L.cfg.footer || L.B.footer_text || ''; if (ft) doc.text(ft, W / 2, H - 3.4, { align: 'center', maxWidth: W - 70 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text('Printed ' + today(), 8, H - 3.4); doc.text('Page ' + i + ' of ' + n, W - 8, H - 3.4, { align: 'right' }); }
}
export const bodyBottom = doc => doc.internal.pageSize.getHeight() - 14;
