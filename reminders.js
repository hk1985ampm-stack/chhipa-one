import { sb, h, hi, toast, friendly, myLocations, digits } from './core.js';
import { brand } from './brand.js';

const TPL = {
  birthday: 'Assalamu Alaikum {name} 🎂\nHappy Birthday! May Allah bless you with health, happiness and long life.\n— {org}',
  eid: 'Eid Mubarak {name} 🌙\nWishing you and your family joy and blessings this Eid.\n— {org}',
  notice: 'Assalamu Alaikum {name},\n{text}\n— {org}'
};
const wa = (mob, text) => { const d = digits(mob); return d.length === 10 ? 'https://wa.me/91' + d + '?text=' + encodeURIComponent(text) : null; };
const fill = (t, o) => t.replace(/\{name\}/g, o.name).replace(/\{org\}/g, o.org).replace(/\{text\}/g, o.text || '');

async function loadHeads(loc) {
  const out = []; for (let from = 0; ; from += 500) {
    let q = sb.from('families').select('id,family_code,phone,locations(city), family_memberships(relation,is_active, members(full_name,status,removed_at, member_contacts(mobile)))').eq('status', 'approved').is('removed_at', null).range(from, from + 499);
    if (loc) q = q.eq('location_id', loc); const { data, error } = await q; if (error) throw error; out.push(...data); if (data.length < 500) break; }
  return out.map(f => { const hd = (f.family_memberships || []).find(r => r.relation === 'head' && r.is_active && r.members && r.members.status === 'active'); const c = hd && hd.members.member_contacts; return { id: f.id, code: f.family_code, city: f.locations && f.locations.city, name: hd ? hd.members.full_name : '', mobile: ((Array.isArray(c) ? c[0] : c) || {}).mobile || f.phone || '' }; }).filter(x => x.name);
}
async function loadBirthdays(loc, days) {
  const rows = []; for (let from = 0; ; from += 1000) {
    let q = sb.from('members').select('id,full_name,dob,status,removed_at, member_contacts(mobile), family_memberships(family_id, is_active, families(family_code,location_id,phone,locations(city)))').eq('status', 'active').is('removed_at', null).not('dob', 'is', null).range(from, from + 999);
    const { data, error } = await q; if (error) throw error; rows.push(...data); if (data.length < 1000) break; }
  const now = new Date(); now.setHours(0, 0, 0, 0); const res = [];
  rows.forEach(m => { const fm = (m.family_memberships || []).find(x => x.is_active && x.families); if (!fm) return; if (loc && fm.families.location_id !== loc) return;
    const d = new Date(m.dob), nx = new Date(now.getFullYear(), d.getMonth(), d.getDate()); if (nx < now) nx.setFullYear(now.getFullYear() + 1); const left = Math.round((nx - now) / 864e5); if (left > days) return;
    const c = m.member_contacts; res.push({ name: m.full_name, turns: nx.getFullYear() - d.getFullYear(), left, date: nx, mobile: ((Array.isArray(c) ? c[0] : c) || {}).mobile || fm.families.phone || '', fid: fm.family_id, code: fm.families.family_code, city: fm.families.locations && fm.families.locations.city }); });
  return res.sort((a, b) => a.left - b.left);
}

export async function render(main) {
  const org = (brand.data && (brand.data.short_name || brand.data.name)) || 'Chhipa Jamat', locs = await myLocations();
  const loc = h('select', {}, h('option', { value: '' }, 'All locations'), locs.map(l => h('option', { value: l.id }, l.city))), days = h('select', {}, [['0', 'Today'], ['7', 'Next 7 days'], ['30', 'Next 30 days']].map(([v, t]) => h('option', { value: v, selected: v === '7' }, t)));
  const tab = h('div', { class: 'seg' }), out = h('div'); let mode = 'birthday', tmpl = h('textarea', { rows: 4 }), custom = h('textarea', { rows: 3, placeholder: 'Message text for Broadcast' });
  const setMode = m => { mode = m; tmpl.value = TPL[m]; draw(); };
  const row = (r, text, sub) => { const url = wa(r.mobile, fill(text, { name: r.name, org, text: custom.value })); return h('div', { class: 'card', style: 'display:flex;gap:8px;align-items:center;justify-content:space-between' }, h('div', {}, h('b', {}, r.name), h('div', { class: 'muted' }, sub)), url ? h('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener' }, '💬 WhatsApp') : h('small', { class: 'muted' }, 'No mobile')); };
  async function draw() {
    tab.replaceChildren(...[['birthday', '🎂 Birthdays'], ['eid', '🌙 Eid'], ['notice', '📣 Broadcast']].map(([k, t]) => h('button', { class: 'btn ' + (k === mode ? '' : 'alt'), onclick: () => setMode(k) }, t)));
    out.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
    try {
      if (mode === 'birthday') { const list = await loadBirthdays(loc.value || null, +days.value);
        out.replaceChildren(h('p', { class: 'muted' }, list.length + ' birthdays'), ...list.map(r => row(r, tmpl.value, `${r.left === 0 ? 'Today' : 'In ' + r.left + ' day(s)'} · turns ${r.turns} · ${r.code} · ${r.city || ''}`)));
      } else { const heads = await loadHeads(loc.value || null);
        out.replaceChildren(h('p', { class: 'muted' }, heads.length + ' family heads · tap each to open WhatsApp with the message ready (WhatsApp has no bulk-send link, so this is one tap per family)'), ...heads.map(r => row(r, tmpl.value, `${r.code} · ${r.city || ''}`))); }
    } catch (e) { out.replaceChildren(h('div', { class: 'card' }, friendly(e))); }
  }
  main.append(h('h2', {}, hi('Reminders & WhatsApp', 'रिमाइंडर')), h('div', { class: 'card' }, h('label', {}, 'Location'), loc, h('label', {}, 'Birthdays window'), days, h('label', {}, 'Message template  ({name}, {org}, {text})'), tmpl, h('label', {}, 'Broadcast text'), custom, h('p', {}, h('button', { class: 'btn', onclick: draw }, 'Refresh list'))), tab, out);
  [loc, days].forEach(e => e.addEventListener('change', draw)); let dt; [tmpl, custom].forEach(e => e.addEventListener('input', () => { clearTimeout(dt); dt = setTimeout(draw, 600); }));
  setMode('birthday');
}
