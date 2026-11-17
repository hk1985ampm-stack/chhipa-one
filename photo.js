import { sb, toast, friendly } from './core.js';

const cache = new Map();
export async function photoUrl(path) {
  if (!path) return '';
  if (cache.has(path)) return cache.get(path);
  const { data } = await sb.storage.from('photos').createSignedUrl(path, 3600);
  const u = data ? data.signedUrl : ''; cache.set(path, u); return u;
}

// Resize to ~300x360 JPEG (about 30-40 KB) so thousands of photos fit in the free storage.
function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image(); img.onload = () => {
      const W = 300, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H;
      const r = Math.max(W / img.width, H / img.height), w = img.width * r, hh = img.height * r;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, (W - w) / 2, (H - hh) / 2, w, hh);
      c.toBlob(b => b ? res(b) : rej(new Error('Could not read the photo')), 'image/jpeg', 0.8);
    }; img.onerror = () => rej(new Error('Could not read the photo')); img.src = URL.createObjectURL(file);
  });
}

export function pickPhoto(memberId, done) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    if (!inp.files[0]) return;
    try {
      const blob = await shrink(inp.files[0]), path = 'members/' + memberId + '.jpg';
      const up = await sb.storage.from('photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      const { error } = await sb.rpc('member_set_photo', { p_member: memberId, p_path: path });
      if (error) throw error;
      cache.delete(path); toast('Photo saved'); done && done();
    } catch (e) { toast(friendly(e)); }
  };
  inp.click();
}
