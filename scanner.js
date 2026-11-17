import { sb, h, hi, toast } from './core.js';

async function openCode(raw) {
  const m = /ID:([A-Za-z0-9\-_/]+)/.exec(raw) || /^([A-Za-z0-9\-_/]+)$/.exec(raw.trim());
  if (!m) return toast('Not a Chhipa code');
  let code = m[1];
  let { data } = await sb.from('families').select('id').eq('family_code', code).limit(1);
  if (!data || !data.length) { const r = await sb.from('members').select('family_memberships(family_id)').eq('member_code', code).limit(1); data = r.data && r.data[0] && r.data[0].family_memberships.map(x => ({ id: x.family_id })); }
  if (data && data.length) location.hash = '#family/' + data[0].id; else toast('No family found for ' + code);
}

export async function render(main) {
  const v = h('video', { playsinline: true, muted: true, style: 'width:100%;max-height:60vh;background:#000;border-radius:12px' }), st = h('p', { class: 'muted' }, ''), inp = h('input', { placeholder: 'Type Family ID / Member ID' });
  let stream, stop = false;
  const cleanup = () => { stop = true; stream && stream.getTracks().forEach(t => t.stop()); };
  window.addEventListener('hashchange', cleanup, { once: true });
  main.append(h('h2', {}, hi('Scan QR', 'क्यू आर स्कैन')), h('div', { class: 'card' }, v, st), h('div', { class: 'card' }, h('label', {}, 'Or enter code manually'), inp, h('p', {}, h('button', { class: 'btn', onclick: () => inp.value && openCode(inp.value) }, 'Open'))));
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices) { st.textContent = 'Camera scanning is not supported on this browser — use the manual box below, or your phone camera app.'; return; }
  try {
    const det = new BarcodeDetector({ formats: ['qr_code'] });
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); v.srcObject = stream; await v.play(); st.textContent = 'Point the camera at a Chhipa QR…';
    const tick = async () => { if (stop) return; try { const r = await det.detect(v); if (r.length) { cleanup(); return openCode(r[0].rawValue); } } catch {} setTimeout(tick, 250); }; tick();
  } catch (e) { st.textContent = 'Camera not available: ' + (e.message || e); }
}
