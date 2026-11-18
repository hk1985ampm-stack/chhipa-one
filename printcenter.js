import { h, hi, toast, friendly, myLocations, state, isApprover, optList, sb, isStateOrSuper } from './core.js';
import { fetchFamilies, makePdf, makeNotice, DOCS, DUES_DOCS } from './bulkpdf.js';
import { THEMES, getCfg, saveCfg } from './letterhead.js';
import { brand } from './brand.js';

// Full-screen viewer for a PDF (view only): open in a new tab, download or print from here.
export function showPdf(res) {
  const ov = h('div', { class: 'pdfview' }), close = () => { URL.revokeObjectURL(res.url); ov.remove(); };
  ov.append(h('div', { class: 'pv-bar' }, h('b', {}, 'Preview'), h('a', { class: 'btn alt sm', href: res.url, target: '_blank', rel: 'noopener' }, 'Open full screen'),
    h('a', { class: 'btn sm', href: res.url, download: res.name }, '⬇ Download'), h('button', { class: 'btn alt sm', onclick: close }, '✕ Close')),
    h('iframe', { src: res.url, title: 'PDF preview' }), h('p', { class: 'muted s' }, 'If the preview stays blank on your phone, use “Open full screen”.'));
  document.body.append(ov);
}

export async function render(main) {
  const p = state.profile;
  if (!(isApprover() || p.can_export)) return main.append(h('div', { class: 'card' }, 'Print Center is for admins or users with export permission.'));
  const locs = await myLocations(), loc = h('select', {}, h('option', { value: '' }, 'All locations'), locs.map(l => h('option', { value: l.id }, l.city)));
  const cfg = getCfg(), B = brand.data || {};
  const photos = h('input', { type: 'checkbox' }), withDues = h('input', { type: 'checkbox' });
  const msg = h('p', { class: 'muted' }); let busy = false;

  // ---- letterhead & theme (remembered on this device)
  const theme = h('select', { onchange: () => { cfg.theme = theme.value; saveCfg(cfg); drawPrev(); } }, Object.entries(THEMES).map(([k, t]) => h('option', { value: k, selected: cfg.theme === k }, t.name)));
  const chk = (k, t) => { const c = h('input', { type: 'checkbox', checked: !!cfg[k], onchange: () => { cfg[k] = c.checked; saveCfg(cfg); drawPrev(); } }); return h('label', { class: 'chk' }, c, ' ' + t); };
  const foot = h('input', { value: cfg.footer, placeholder: B.footer_text || 'Footer line (optional)', oninput: () => { cfg.footer = foot.value; saveCfg(cfg); } });
  const prev = h('div', { class: 'lh-prev' });
  const drawPrev = () => { const t = THEMES[cfg.theme], rgb = c => `rgb(${c})`, det = [cfg.addr && B.address_line, cfg.phone && B.contact && 'Ph: ' + B.contact, cfg.reg && B.reg_no && 'Reg. No. ' + B.reg_no].filter(Boolean).join('  |  ');
    prev.replaceChildren(h('div', { class: 'lh-band', style: `background:linear-gradient(90deg,${rgb(t.dg)},${rgb(t.lt)});border-bottom:4px solid ${rgb(t.go)}` }, cfg.logo ? h('img', { class: 'logo', src: (B.logo_path && sb.storage.from('branding').getPublicUrl(B.logo_path).data.publicUrl) || 'stamp.png', alt: '' }) : null,
      h('div', {}, h('b', {}, B.header_line1 || B.name || 'CHHIPA JAMAT BARAR WELFARE SOCIETY'), cfg.tag && B.header_line2 ? h('div', { class: 's' }, B.header_line2) : null, det ? h('div', { class: 'xs' }, det) : null))); };
  drawPrev();
  const setup = h('details', { class: 'card' }, h('summary', {}, hi('Letterhead & colours', 'लेटरहेड और रंग')), prev,
    h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Colour theme'), theme), h('div', {}, h('label', {}, 'Footer line'), foot)),
    h('div', { class: 'chips' }, chk('logo', 'Logo'), chk('tag', 'Sub-title'), chk('addr', 'Address'), chk('phone', 'Phone'), chk('reg', 'Registration no.')),
    h('p', { class: 'muted s' }, 'Name, logo, address, phone and registration number come from Communities → Logo & Label. Choices here are remembered on this device.'));

  // ---- family documents
  const go = async (k, mode) => {
    if (busy) return; busy = true; msg.textContent = 'Collecting data…';
    try {
      const fams = await fetchFamilies(loc.value || null, n => msg.textContent = 'Collecting data… ' + n + ' families');
      if (!fams.length) { msg.textContent = 'No approved families found.'; return; }
      let dues = null;
      if (withDues.checked && isStateOrSuper() && DUES_DOCS.includes(k)) { const fy = new Date().getFullYear(); const { data, error } = await sb.rpc('donation_status', { p_fy: fy, p_location: loc.value || null }); if (error) throw error;
        dues = new Map(data.map(r => [r.family_id, { paid: r.paid, due: r.due }])); dues.fy = fy; }
      msg.textContent = 'Building PDF…';
      const res = await makePdf(k, fams, { place: loc.value ? loc.selectedOptions[0].textContent : 'All locations', photos: photos.checked, cfg: { ...cfg }, dues }, mode);
      msg.textContent = '✓ Done · ' + fams.length + ' families'; if (mode === 'view') showPdf(res); else toast('PDF ready');
    } catch (e) { msg.textContent = friendly(e); } finally { busy = false; }
  };

  // ---- notice / letter builder
  const cats = optList('notice_category'), cat = h('select', {}, (cats.length ? cats : ['General Notice']).map(c => h('option', {}, c)));
  const nTitle = h('input', { placeholder: 'Subject / heading' }), nTo = h('input', { placeholder: 'To (optional), e.g. All members of Chhipa Jamat' }), nRef = h('input', { placeholder: 'Ref. no. (optional)' });
  const nDate = h('input', { type: 'date', value: new Date().toISOString().slice(0, 10) }), nBody = h('textarea', { rows: 7, placeholder: 'Notice text' });
  const nSign = h('input', { value: cfg.sign_name, placeholder: 'Signatory name', oninput: () => { cfg.sign_name = nSign.value; saveCfg(cfg); } }), nDes = h('input', { value: cfg.sign_title, list: 'dsg', placeholder: 'Designation', oninput: () => { cfg.sign_title = nDes.value; saveCfg(cfg); } });
  const nSize = h('select', {}, h('option', { value: 'a4' }, 'A4 (full page)'), h('option', { value: 'a5' }, 'A5 (half page)'));
  const notice = async mode => { if (!nTitle.value.trim() && !nBody.value.trim()) return toast('Write a heading or the notice text first');
    try { const res = await makeNotice({ category: cat.value, title: nTitle.value, to: nTo.value, ref: nRef.value, body: nBody.value, sign_name: nSign.value, sign_title: nDes.value, size: nSize.value, cfg: { ...cfg },
      date: nDate.value ? new Date(nDate.value).toLocaleDateString('en-IN') : '' }, mode); if (mode === 'view') showPdf(res); else toast('Notice ready'); } catch (e) { toast(friendly(e)); } };
  const noticeCard = h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, hi('Notice / Letter', 'सूचना / पत्र')), h('p', { class: 'muted s' }, 'Printed on your letterhead with logo, address, phone and registration number. Add new categories in Office → Dropdown lists.'),
    h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Category'), cat), h('div', {}, h('label', {}, 'Page size'), nSize)),
    h('label', {}, 'Heading'), nTitle, h('label', {}, 'To'), nTo, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Ref. no.'), nRef), h('div', {}, h('label', {}, 'Date'), nDate)),
    h('label', {}, 'Text'), nBody, h('div', { class: 'row' }, h('div', {}, h('label', {}, 'Signed by'), nSign), h('div', {}, h('label', {}, 'Designation'), nDes)),
    h('datalist', { id: 'dsg' }, ['President', 'Vice President', 'Secretary', 'Joint Secretary', 'Treasurer', 'Trustee', 'Member'].map(d => h('option', { value: d }))),
    h('div', { class: 'actions' }, h('button', { class: 'btn alt', onclick: () => notice('view') }, '👁 View'), h('button', { class: 'btn', onclick: () => notice('save') }, '⬇ Download PDF')));

  main.append(h('h2', {}, hi('Print Center', 'प्रिंट सेंटर')), setup,
    h('div', { class: 'card' }, h('label', {}, 'Location'), loc, h('label', { class: 'chk' }, photos, ' Include photos on ID cards (slower)'),
      isStateOrSuper() ? h('label', { class: 'chk' }, withDues, ' Include dues / donation (State Admin & Super Admin only) in directory, all-families, detailed and city-wise lists') : null),
    h('div', { class: 'doc-grid' }, DOCS.map(([k, t, d]) => h('div', { class: 'tile doc' }, h('b', {}, t), h('small', {}, d),
      h('div', { class: 'doc-btns' }, h('button', { class: 'btn alt sm', onclick: () => go(k, 'view') }, '👁 View'), h('button', { class: 'btn sm', onclick: () => go(k, 'save') }, '⬇ PDF'))))),
    msg, noticeCard);
}
