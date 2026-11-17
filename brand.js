// Community branding: logo + labels, shown on login, header, home and PDFs. Cached so it also shows offline.
import { sb, h } from './core.js';

export const brand = { data: null };
try { brand.data = JSON.parse(localStorage.getItem('chhipa_brand')); } catch {}

export async function loadBrand() {
  try {
    const { data, error } = await sb.rpc('public_branding');
    if (!error && data) { brand.data = data; localStorage.setItem('chhipa_brand', JSON.stringify(data)); }
  } catch {}
  return brand.data;
}
export const logoUrl = p => p ? sb.storage.from('branding').getPublicUrl(p).data.publicUrl : '';
export const brandName = () => (brand.data && brand.data.name) || 'Chhipa Jamat Barar Welfare Society';
export const brandSub = () => (brand.data && (brand.data.tagline || brand.data.short_name)) || '';
// round logo (falls back to the society stamp that ships with the app)
export const logoImg = (size = 44) => h('img', { class: 'logo', src: (brand.data && logoUrl(brand.data.logo_path)) || 'stamp.png', alt: 'logo', style: `width:${size}px;height:${size}px` });

// Resize a picked logo to a 256px square PNG (keeps transparency, ~20-60 KB).
export function squareLogo(file) {
  return new Promise((res, rej) => {
    const img = new Image(); img.onload = () => {
      const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const r = Math.min(S / img.width, S / img.height);
      const w = img.width * r, hh = img.height * r; c.getContext('2d').drawImage(img, (S - w) / 2, (S - hh) / 2, w, hh);
      c.toBlob(b => b ? res(b) : rej(new Error('Could not read the logo')), 'image/png');
    }; img.onerror = () => rej(new Error('Could not read the logo')); img.src = URL.createObjectURL(file);
  });
}
