// Small UI helpers: confetti, count-up, pull-to-refresh, swipe rows, empty-state pictures, install prompt, mini charts
import { h } from './core.js';

export function confetti() {
  if (document.documentElement.classList.contains('no-motion')) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; c.width = innerWidth; c.height = innerHeight; document.body.append(c);
  const x = c.getContext('2d'), cols = ['#c9a227', '#2f8f83', '#d98b95', '#5b7fd6', '#ee9b7b', '#9a86dc', '#7fa883'];
  const ps = Array.from({ length: 110 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .35, vx: (Math.random() - .5) * 13, vy: -Math.random() * 12 - 3, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[Math.random() * cols.length | 0] }));
  let t = 0; (function f() { x.clearRect(0, 0, c.width, c.height); ps.forEach(p => { p.vy += .32; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); }); if (++t < 110) requestAnimationFrame(f); else c.remove(); })();
}
export function countUp(el, to, ms = 700) { const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / ms); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString(); if (k < 1) requestAnimationFrame(f); })(t0); }

// pull down on a touch screen at the top of the page to refresh the current page
export function pullToRefresh(onRefresh) {
  let y0 = 0, pull = 0, on = false; const ind = h('div', { class: 'ptr' }, '↓ Pull to refresh'); document.body.append(ind);
  addEventListener('touchstart', e => { on = scrollY <= 0 && e.touches.length === 1 && !e.target.closest('input,textarea,select,.sheet'); y0 = e.touches[0].clientY; pull = 0; }, { passive: true });
  addEventListener('touchmove', e => { if (!on) return; pull = e.touches[0].clientY - y0; if (pull > 8 && scrollY <= 0) { ind.style.transform = `translate(-50%,${Math.min(pull, 110) - 40}px)`; ind.textContent = pull > 80 ? '↻ Release to refresh' : '↓ Pull to refresh'; ind.classList.add('show'); } }, { passive: true });
  addEventListener('touchend', () => { if (on && pull > 80) { ind.textContent = '↻ Refreshing…'; Promise.resolve(onRefresh()).finally(() => setTimeout(() => ind.classList.remove('show'), 400)); } else ind.classList.remove('show'); on = false; pull = 0; });
}

// swipe a row sideways to reveal / fire an action. left: swipe towards left. Keeps normal taps working.
export function swipeable(el, { label, color = 'var(--c2)', fn }) {
  let x0 = 0, y0 = 0, dx = 0, drag = false, moved = false; el.classList.add('swipe');
  const tag = h('span', { class: 'swipe-tag', style: 'background:' + color }, label); el.append(tag);
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; x0 = e.clientX; y0 = e.clientY; dx = 0; drag = true; moved = false; });
  el.addEventListener('pointermove', e => { if (!drag) return; dx = e.clientX - x0; if (Math.abs(e.clientY - y0) > 24 && Math.abs(dx) < 24) { drag = false; return; } if (dx < -10) { moved = true; el.style.transform = `translateX(${Math.max(dx, -110)}px)`; el.classList.add('swiping'); } });
  const end = () => { if (!drag) return; drag = false; el.style.transform = ''; el.classList.remove('swiping'); if (dx < -80) { fn(); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
}

const SVGS = {
  box: '<svg viewBox="0 0 120 90"><ellipse cx="60" cy="78" rx="34" ry="6" fill="currentColor" opacity=".12"/><path d="M24 36l36-16 36 16v30l-36 16-36-16z" fill="#fff" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M24 36l36 16 36-16M60 52v30" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="92" cy="22" r="5" fill="var(--gold)"/><circle cx="26" cy="20" r="3" fill="var(--c1)"/><path d="M100 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--gold)"/></svg>',
  people: '<svg viewBox="0 0 120 90"><ellipse cx="60" cy="80" rx="38" ry="6" fill="currentColor" opacity=".12"/><circle cx="60" cy="34" r="13" fill="#fff" stroke="currentColor" stroke-width="3"/><path d="M34 74c0-14 11-24 26-24s26 10 26 24z" fill="#fff" stroke="currentColor" stroke-width="3"/><circle cx="30" cy="42" r="8" fill="#fff" stroke="currentColor" stroke-width="3" opacity=".7"/><circle cx="90" cy="42" r="8" fill="#fff" stroke="currentColor" stroke-width="3" opacity=".7"/><path d="M96 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--gold)"/></svg>',
  bell: '<svg viewBox="0 0 120 90"><ellipse cx="60" cy="80" rx="30" ry="5" fill="currentColor" opacity=".12"/><path d="M36 62c4-6 5-12 5-24a19 19 0 0138 0c0 12 1 18 5 24z" fill="#fff" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M52 66a8 8 0 0016 0" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="60" cy="16" r="4" fill="var(--gold)"/><path d="M92 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--c1)"/></svg>',
  search: '<svg viewBox="0 0 120 90"><ellipse cx="56" cy="80" rx="34" ry="5" fill="currentColor" opacity=".12"/><circle cx="52" cy="38" r="22" fill="#fff" stroke="currentColor" stroke-width="3.5"/><path d="M68 55l22 22" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M42 36a10 10 0 0110-10" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linecap="round"/></svg>',
};
export const emptyState = (text, kind = 'box') => { const d = h('div', { class: 'empty' }); d.innerHTML = '<div class="pic">' + (SVGS[kind] || SVGS.box) + '</div>'; d.append(h('p', {}, text)); return d; };
export const pickKind = t => /notif|alert/i.test(t) ? 'bell' : /match|search|found/i.test(t) ? 'search' : /famil|member|people|agent|team|request|photo|password/i.test(t) ? 'people' : 'box';

// Install-app prompt (Android/desktop Chrome: real prompt; iPhone: how-to)
let deferred = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
export function installCard() {
  let gone = false; try { gone = localStorage.getItem('chhipa_install_x') === '1'; } catch {}
  if (standalone() || gone) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const card = h('div', { class: 'card install' }, h('div', { class: 'in-ic' }, '📲'), h('div', { style: 'flex:1' }, h('b', {}, 'Install Chhipa One on your phone'), h('div', { class: 'muted s' }, ios ? 'Tap Share, then “Add to Home Screen”.' : 'Opens like an app, works offline.')),
    ios ? null : h('button', { class: 'btn sm', onclick: async () => { if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; card.remove(); } else alert('Open the browser menu (⋮) and choose “Install app” or “Add to Home screen”.'); } }, 'Install'),
    h('button', { class: 'btn alt sm', onclick: () => { try { localStorage.setItem('chhipa_install_x', '1'); } catch {} card.remove(); } }, '✕'));
  return card;
}

// tiny SVG charts
export function barChart(vals, labels, w = 260, hgt = 90) {
  const mx = Math.max(1, ...vals), bw = w / vals.length;
  const bars = vals.map((v, i) => { const bh = Math.max(3, (v / mx) * (hgt - 26)); return `<rect class="bar" x="${i * bw + bw * .18}" y="${hgt - 16 - bh}" width="${bw * .64}" height="${bh}" rx="5" style="animation-delay:${i * 70}ms"/><text x="${i * bw + bw / 2}" y="${hgt - 3}" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">${labels[i]}</text><text x="${i * bw + bw / 2}" y="${hgt - 20 - bh}" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">${v || ''}</text>`; }).join('');
  const d = h('div', { class: 'chart' }); d.innerHTML = `<svg viewBox="0 0 ${w} ${hgt}" width="100%">${bars}</svg>`; return d;
}
export function donut(parts, size = 92) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1, R = 34, C = 2 * Math.PI * R; let off = 0;
  const arcs = parts.map(p => { const len = p.v / tot * C, s = `<circle cx="46" cy="46" r="${R}" fill="none" stroke="${p.c}" stroke-width="14" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 46 46)"/>`; off += len; return s; }).join('');
  const d = h('div', { class: 'donut' }); d.innerHTML = `<svg viewBox="0 0 92 92" width="${size}" height="${size}"><circle cx="46" cy="46" r="${R}" fill="none" stroke="var(--g2)" stroke-width="14"/>${arcs}<text x="46" y="51" text-anchor="middle" font-size="16" font-weight="800" fill="currentColor">${tot === 1 && !parts.some(p => p.v) ? 0 : tot}</text></svg>`;
  d.append(h('div', { class: 'legend' }, parts.map(p => h('span', {}, h('i', { style: 'background:' + p.c }), p.n + ' ' + p.v)))); return d;
}

// long-press (or drag, with a mouse) an item to move it; the new order is reported through done()
export function sortable(box, sel, done) {
  let drag = null, timer = 0, sx = 0, sy = 0, off = 0, moved = false;
  const clear = () => clearTimeout(timer);
  box.addEventListener('pointerdown', e => { const it = e.target.closest(sel); if (!it) return; sx = e.clientX; sy = e.clientY; clear(); timer = setTimeout(() => { drag = it; moved = true; off = sy - it.getBoundingClientRect().top; it.classList.add('dragging'); box.classList.add('sorting'); try { it.setPointerCapture(e.pointerId); } catch {} navigator.vibrate && navigator.vibrate(15); }, e.pointerType === 'mouse' ? 160 : 320); });
  box.addEventListener('pointermove', e => {
    if (!drag) { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10) clear(); return; }
    for (const s of box.querySelectorAll(sel)) { if (s === drag) continue; const r = s.getBoundingClientRect(); if (e.clientY > r.top && e.clientY < r.bottom) { const after = drag.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING; box.insertBefore(drag, after ? s.nextSibling : s); break; } }
    drag.style.transform = ''; const nat = drag.getBoundingClientRect().top; drag.style.transform = `translateY(${e.clientY - off - nat}px)`;
  });
  const end = () => { clear(); if (!drag) return; drag.style.transform = ''; drag.classList.remove('dragging'); box.classList.remove('sorting'); drag = null; done(); setTimeout(() => (moved = false), 60); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  box.addEventListener('contextmenu', e => { if (drag) e.preventDefault(); });
}
