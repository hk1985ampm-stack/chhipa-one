// Phase 23 · Matrimony — opt-in, masked browse, Rishta centre (staff arrange introductions), biodata PDF
import { sb, h, hi, state, toast, friendly, field, isApprover, digits } from './core.js';
import { brandName } from './brand.js';
import { readXlsx } from './xlsx.js';
import { load } from './pdf.js';

const AGE = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 35, 40, 50];
const wa = (mobile, text) => 'https://wa.me/91' + digits(mobile) + '?text=' + encodeURIComponent(text);

export async function render(main) {
  const appr = isApprover(), ro = state.profile.read_only;
  const tabs = [['browse', 'Browse', 'देखें'], !ro && ['add', 'List a member', 'जोड़ें'], appr && ['manage', 'Manage', 'प्रबंधन'], appr && ['rishta', 'Rishta centre', 'रिश्ता केंद्र'], appr && ['import', 'Import', 'इम्पोर्ट']].filter(Boolean);
  let cur = 'browse'; const bar = h('div', { class: 'chips cat-tabs' }), body = h('div');
  const go = k => { cur = k; draw(); };
  const draw = () => {
    bar.replaceChildren(...tabs.map(([k, en, hindi]) => h('button', { class: 'btn tabb ' + (cur === k ? '' : 'alt'), onclick: () => go(k) }, hi(en, hindi))));
    body.replaceChildren(); ({ browse, add, manage, rishta, import: importer })[cur](body, go);
  };
  main.append(h('h2', {}, '💍 ', hi('Matrimony', 'वैवाहिक')),
    h('p', { class: 'muted s' }, 'Only members whose family agreed are listed. Mobile numbers and addresses are never shown here — the Rishta centre introduces families.'), bar, body);
  draw();
}

// ---- Browse (masked) --------------------------------------------------------------------------
async function browse(box) {
  const g = h('select', {}, h('option', { value: '' }, 'Bride & Groom'), h('option', { value: 'female' }, 'Bride (female)'), h('option', { value: 'male' }, 'Groom (male)'));
  const lo = h('select', {}, h('option', { value: '' }, 'Age from'), AGE.map(a => h('option', { value: a }, a))), hiA = h('select', {}, h('option', { value: '' }, 'Age to'), AGE.concat([60]).map(a => h('option', { value: a }, a)));
  const gt = h('input', { placeholder: 'Gotra' }), ct = h('input', { placeholder: 'City' }), out = h('div', { class: 'grid' });
  const mine = []; let from = null;
  async function run() {
    out.replaceChildren(h('div', { class: 'skl card' }));
    const { data, error } = await sb.rpc('matrimony_browse', { p_gender: g.value || null, p_min: lo.value ? +lo.value : null, p_max: hiA.value ? +hiA.value : null, p_gotra: gt.value.trim() || null, p_city: ct.value.trim() || null });
    if (error) return out.replaceChildren(h('div', { class: 'card err' }, friendly(error)));
    if (!data.length) return out.replaceChildren(h('div', { class: 'card muted' }, 'No profiles match. Try fewer filters.'));
    out.replaceChildren(...data.map(p => h('div', { class: 'card mcard' },
      h('b', {}, p.label), h('span', { class: 'pill ' + (p.status === 'matched' ? 'approved' : 'pending') }, p.status === 'matched' ? 'Matched' : (p.gender === 'female' ? 'Bride' : 'Groom')),
      h('div', { class: 'muted s' }, [p.age ? p.age + ' yrs' : null, p.height, p.complexion].filter(Boolean).join(' · ')),
      h('div', { class: 's' }, [p.education, p.occupation].filter(Boolean).join(' · ')),
      h('div', { class: 'muted s' }, [p.gotra && 'Gotra ' + p.gotra, p.city].filter(Boolean).join(' · ')),
      p.about ? h('p', { class: 's' }, p.about) : null, p.expectations ? h('p', { class: 'muted s' }, 'Looking for: ' + p.expectations) : null,
      p.status === 'matched' ? null : h('button', { class: 'btn sm', onclick: () => interest(p) }, hi('Show interest', 'रुचि दिखाएँ')))));
  }
  async function interest(to) {
    const { data } = await sb.rpc('matrimony_browse', { p_gender: null });
    const own = (data || []).filter(x => x.mine && x.gender !== to.gender && x.status === 'approved');
    if (!own.length) return toast('Your location has no listed ' + (to.gender === 'female' ? 'groom' : 'bride') + ' profile to send from');
    const sel = h('select', {}, own.map(x => h('option', { value: x.id }, x.label + (x.age ? ' · ' + x.age : '')))), note = h('input', { placeholder: 'Short note (optional)' });
    const dlg = h('div', { class: 'card sheet' }, h('h3', {}, 'Interest in ' + to.label), field('From which profile?', sel), field('Note', note),
      h('div', { class: 'chips' }, h('button', { class: 'btn', onclick: async () => { const { error } = await sb.rpc('matrimony_interest', { p_from: sel.value, p_to: to.id, p_note: note.value }); if (error) return toast(friendly(error)); dlg.remove(); toast('Sent — the Rishta centre will contact the family'); } }, 'Send'), h('button', { class: 'btn alt', onclick: () => dlg.remove() }, 'Cancel')));
    document.body.append(dlg);
  }
  box.append(h('div', { class: 'card' }, h('div', { class: 'row' }, g, lo, hiA, gt, ct), h('p', {}, h('button', { class: 'btn', onclick: run }, hi('Search', 'खोजें')))), out); run();
}

// ---- List a member (with the family's consent) -------------------------------------------------
function add(box, go) {
  const q = h('input', { type: 'search', placeholder: 'Search member name… · नाम खोजें' }), res = h('div'), form = h('div');
  let t; q.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
    const { data, error } = await sb.rpc('matrimony_candidates', { p_q: q.value }); if (error) return toast(friendly(error));
    res.replaceChildren(...(data || []).map(m => h('button', { class: 'btn alt', style: 'display:block;width:100%;text-align:left;margin:4px 0', onclick: () => pick(m) }, m.name + ' · ' + (m.age ?? '?') + ' yrs · ' + m.gender + ' · ' + m.city + (m.family_code ? ' · ' + m.family_code : ''))));
    if (q.value.trim().length >= 2 && !(data || []).length) res.replaceChildren(h('p', { class: 'muted s' }, 'No eligible member found (must be an approved, unmarried adult not already listed).'));
  }, 300); };
  function pick(m) {
    res.replaceChildren(); const ht = h('input', { placeholder: 'e.g. 5\'6"' }), cx = h('input', { placeholder: 'Fair / Wheatish / Dark' }), ab = h('textarea', { rows: 3, placeholder: 'About the member' }), ex = h('textarea', { rows: 2, placeholder: 'What the family is looking for' });
    const cs = h('input', { type: 'checkbox' });
    form.replaceChildren(h('div', { class: 'card' }, h('b', {}, m.name), field('Height', ht), field('Complexion', cx), field('About', ab), field('Expectations', ex),
      h('label', { class: 'item' }, cs, ' The member and the family have agreed to be listed. Name (first name + initial), age, education, occupation and city will be visible; mobile and address stay hidden.'),
      h('p', {}, h('button', { class: 'btn', onclick: async () => {
        if (!cs.checked) return toast('Please tick the consent box');
        const { error } = await sb.rpc('matrimony_add', { p: { member_id: m.member_id, consent: true, height: ht.value, complexion: cx.value, about: ab.value, expectations: ex.value } });
        if (error) return toast(friendly(error)); toast(isApprover() ? 'Listed ✔' : 'Sent for approval ✔'); go(isApprover() ? 'manage' : 'browse');
      } }, hi('List this member', 'सूची में जोड़ें')))));
  }
  box.append(h('div', { class: 'card' }, q, res), form);
}

// ---- Manage (admins) --------------------------------------------------------------------------
async function manage(box) {
  const st = h('select', {}, [['', 'All'], ['pending', 'Waiting for approval'], ['approved', 'Approved'], ['matched', 'Matched'], ['withdrawn', 'Withdrawn'], ['rejected', 'Rejected']].map(([v, l]) => h('option', { value: v }, l)));
  const out = h('div'); st.value = 'pending';
  async function run() {
    const { data, error } = await sb.rpc('matrimony_manage', { p_status: st.value || null }); if (error) return out.replaceChildren(h('div', { class: 'card err' }, friendly(error)));
    if (!data.length) return out.replaceChildren(h('div', { class: 'card muted' }, 'Nothing here.'));
    const set = async (id, s) => { const { error: e } = await sb.rpc('matrimony_decide', { p_id: id, p_status: s }); e ? toast(friendly(e)) : (toast('Done'), run()); };
    out.replaceChildren(...data.map(p => h('div', { class: 'card item' }, h('span', {}, h('b', {}, p.name), ' ', h('span', { class: 'pill ' + (p.status === 'approved' ? 'approved' : 'pending') }, p.status),
      h('div', { class: 'muted s' }, [p.gender, p.age && p.age + ' yrs', p.gotra, p.city, p.family_code, p.mobile].filter(Boolean).join(' · '))),
      h('span', { class: 'chips' }, p.status === 'pending' ? [h('button', { class: 'btn sm', onclick: () => set(p.id, 'approved') }, 'Approve'), h('button', { class: 'btn sm alt', onclick: () => set(p.id, 'rejected') }, 'Reject')] : null,
        p.status === 'approved' ? [h('button', { class: 'btn sm alt', onclick: () => set(p.id, 'matched') }, 'Matched'), h('button', { class: 'btn sm alt', onclick: () => biodata(p.id) }, 'Biodata PDF')] : null,
        ['approved', 'matched', 'pending'].includes(p.status) ? h('button', { class: 'btn sm alt', onclick: () => confirm('Remove ' + p.name + ' from the list?') && set(p.id, 'withdrawn') }, 'Withdraw') : null))));
  }
  st.onchange = run; box.append(h('div', { class: 'card' }, st), out); run();
}

async function biodata(id) {
  const { data: b, error } = await sb.rpc('matrimony_biodata', { p_id: id }); if (error) return toast(friendly(error));
  await load('jspdf.min.js'); const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(brandName(), 105, 18, { align: 'center' });
  doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text('Marriage Biodata', 105, 26, { align: 'center' }); doc.line(20, 30, 190, 30);
  const rows = [['Name', b.name], ['Gender', b.gender], ['Age', b.age && b.age + ' years'], ['Date of birth', b.dob], ['Height', b.height], ['Complexion', b.complexion], ['Education', b.education], ['Occupation', b.occupation],
    ['Gotra', b.gotra], ['Father', b.father], ['Mother', b.mother], ['City', [b.city, b.state].filter(Boolean).join(', ')], ['About', b.about], ['Looking for', b.expectations]].filter(r => r[1]);
  let y = 42; for (const [k, v] of rows) { doc.setFont('helvetica', 'bold'); doc.text(k, 24, y); doc.setFont('helvetica', 'normal'); const l = doc.splitTextToSize(String(v), 110); doc.text(l, 70, y); y += 8 * l.length; }
  doc.setFontSize(9); doc.text('Contact the society office for introductions · Ref ' + (b.family_code || ''), 105, 285, { align: 'center' });
  doc.save('biodata-' + b.name.replace(/\W+/g, '-') + '.pdf'); toast('Biodata downloaded');
}

// ---- Rishta centre ----------------------------------------------------------------------------
async function rishta(box) {
  const out = h('div'); box.append(out);
  async function run() {
    const { data, error } = await sb.rpc('matrimony_interests_list'); if (error) return out.replaceChildren(h('div', { class: 'card err' }, friendly(error)));
    if (!data.length) return out.replaceChildren(h('div', { class: 'card muted' }, 'No interests yet.'));
    const set = async (id, s) => { const { error: e } = await sb.rpc('matrimony_interest_set', { p_id: id, p_status: s }); e ? toast(friendly(e)) : run(); };
    out.replaceChildren(...data.map(i => h('div', { class: 'card' }, h('b', {}, i.from_name + ' → ' + i.to_name), ' ', h('span', { class: 'pill ' + (i.status === 'new' ? 'pending' : 'approved') }, i.status),
      h('div', { class: 'muted s' }, new Date(i.created_at).toLocaleDateString() + (i.note ? ' · ' + i.note : '')),
      h('div', { class: 's' }, i.from_name + ' (' + (i.from_city || '') + ') ' + (i.from_mobile || '—'), h('br'), i.to_name + ' (' + (i.to_city || '') + ') ' + (i.to_mobile || '—')),
      h('div', { class: 'chips' },
        digits(i.to_mobile).length === 10 ? h('a', { class: 'btn sm alt', target: '_blank', rel: 'noopener', href: wa(i.to_mobile, 'Assalamu alaikum. A family from ' + (i.from_city || 'our community') + ' has shown interest in a rishta for ' + i.to_name + '. May we share the details? — ' + brandName()), onclick: () => set(i.id, 'shared') }, 'WhatsApp girl/boy’s family') : null,
        digits(i.from_mobile).length === 10 ? h('a', { class: 'btn sm alt', target: '_blank', rel: 'noopener', href: wa(i.from_mobile, 'Assalamu alaikum. We have informed the other family about your interest. — ' + brandName()) }, 'WhatsApp interested family') : null,
        h('button', { class: 'btn sm alt', onclick: () => set(i.id, 'declined') }, 'Declined'), h('button', { class: 'btn sm alt', onclick: () => set(i.id, 'closed') }, 'Close')))));
  }
  run();
}

// ---- Import old matrimony sheet ---------------------------------------------------------------
function importer(box) {
  const f = h('input', { type: 'file', accept: '.xlsx' }), out = h('div');
  f.onchange = async () => {
    const file = f.files[0]; if (!file) return; out.replaceChildren(h('p', { class: 'muted' }, 'Matching with the registry…'));
    try {
      const rows = await readXlsx(await file.arrayBuffer()); const hd = rows[0].map(x => String(x).trim().toLowerCase()), c = k => hd.indexOf(k);
      const list = rows.slice(1).filter(r => r[c('name')]).map(r => ({ name: String(r[c('name')]).trim(), mobile: String(r[c('mobile')] || ''), height: String(r[c('height')] || ''), complexion: String(r[c('complexion')] || ''), about: String(r[c('about')] || '') }));
      const { data, error } = await sb.rpc('matrimony_import', { p_rows: list }); if (error) throw error;
      out.replaceChildren(h('div', { class: 'card' }, h('b', {}, data.added + ' profiles added (waiting for approval in Manage)'), h('p', { class: 'muted s' }, data.skipped + ' were already listed.'),
        data.not_found.length ? h('div', {}, h('b', { style: 'color:#b3261e' }, data.not_found.length + ' not matched — import the families first, or add them with “List a member”:'), h('ul', {}, data.not_found.map(n => h('li', {}, n)))) : null));
    } catch (e) { out.replaceChildren(h('div', { class: 'card err' }, friendly(e))); }
  };
  box.append(h('div', { class: 'card' }, h('p', { class: 'muted s' }, 'Upload the matrimony file made from your old backup. Each person is matched to the registry by name and family mobile. Import the families first. Consent is recorded as given by the old record — please confirm with families before approving.'), f), out);
}
