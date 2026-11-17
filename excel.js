import { sb, h, hi, state, toast, friendly, myLocations } from './core.js';
import { RELATIONS, GENDERS, MARITAL } from './options.js';
import { writeXlsx, readXlsx, parseCsv, download } from './xlsx.js';

const HEAD = ['Family Ref', 'Relation', 'Name', 'Gender', 'DOB (YYYY-MM-DD)', 'Age', 'Father Name', 'Mother Name', 'Mobile', 'Education', 'Occupation', 'Marital Status', 'Address', 'Gotra', 'Family Type', 'Taluka', 'Pincode', 'House'];
const KEYS = ['ref', 'relation', 'name', 'gender', 'dob', 'age', 'father_name', 'mother_name', 'mobile', 'education', 'occupation', 'marital_status', 'address', 'gotra', 'family_type', 'taluka', 'pincode', 'house_type'];
const norm = s => String(s ?? '').trim();
const key = s => norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
const REL = Object.fromEntries(RELATIONS.flatMap(r => [[key(r[0]), r[0]], [key(r[1]), r[0]]]).concat([['wife', 'spouse'], ['husband', 'spouse'], ['self', 'head'], ['father', 'father'], ['mother', 'mother']]));
const GEN = { m: 'male', male: 'male', f: 'female', female: 'female', other: 'other', o: 'other' };
const MAR = Object.fromEntries(MARITAL.map(m => [key(m[0]), m[0]]).concat([['single', 'Unmarried'], ['widow', 'Widowed'], ['widower', 'Widowed']]));
const digits = s => norm(s).replace(/\D/g, '').slice(-10);

function dateOf(v) {   // accepts yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, Excel serial
  if (v === '' || v == null) return '';
  if (typeof v === 'number') { const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return d.toISOString().slice(0, 10); }
  const s = norm(v); let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return 'BAD';
}

// rows (array of arrays, header first) -> { families:[{ref,payload,line}], errors:[{line,msg}], flat:[...] }
export function parseSheet(rows) {
  const hd = (rows[0] || []).map(key), col = {};
  KEYS.forEach((k, i) => { const j = hd.findIndex(x => x === key(HEAD[i]) || x === key(k) || (k === 'dob' && x.startsWith('dob'))); col[k] = j; });
  if (col.ref < 0 || col.name < 0 || col.relation < 0) throw new Error('Columns "Family Ref", "Relation" and "Name" are required. Please use the template.');
  const get = (r, k) => col[k] < 0 ? '' : r[col[k]];
  const errors = [], groups = new Map(), flat = [];
  rows.slice(1).forEach((r, n) => {
    const line = n + 2; if (!r || r.every(c => norm(c) === '')) return;
    const ref = norm(get(r, 'ref')), name = norm(get(r, 'name'));
    const rel = REL[key(get(r, 'relation'))], gen = GEN[norm(get(r, 'gender')).toLowerCase()], dob = dateOf(get(r, 'dob'));
    const bad = m => errors.push({ line, msg: m });
    if (!ref) return bad('Family Ref is empty');
    if (!name) return bad('Name is empty');
    if (!rel) return bad('Unknown relation "' + norm(get(r, 'relation')) + '"');
    if (!gen) return bad('Gender must be Male / Female / Other');
    if (dob === 'BAD') return bad('Date of birth not understood (use YYYY-MM-DD)');
    const age = get(r, 'age') === '' ? null : parseInt(get(r, 'age'), 10);
    if (age !== null && (isNaN(age) || age < 0 || age > 120)) return bad('Age must be 0–120');
    const mob = digits(get(r, 'mobile')); if (norm(get(r, 'mobile')) && mob.length !== 10) return bad('Mobile must be 10 digits');
    const mar = norm(get(r, 'marital_status')) ? MAR[key(get(r, 'marital_status'))] : '';
    if (norm(get(r, 'marital_status')) && !mar) return bad('Marital status must be Unmarried / Married / Widowed');
    const m = { name, relation: rel, gender: gen, dob: dob || null, age: dob ? null : age, father_name: norm(get(r, 'father_name')), mother_name: norm(get(r, 'mother_name')), mobile: mob, education: norm(get(r, 'education')), occupation: norm(get(r, 'occupation')), marital_status: mar || null };
    let g = groups.get(ref); if (!g) groups.set(ref, g = { ref, line, members: [], fam: {} });
    if (rel === 'head') for (const k of ['address', 'gotra', 'family_type', 'taluka', 'pincode', 'house_type']) { const v = norm(get(r, k)); if (v) g.fam[k] = v; }
    g.members.push({ ...m, _line: line }); flat.push({ i: flat.length, ref, name, father: m.father_name, mobile: mob, line });
  });
  const bad = new Set(errors.map(e => e.line)), families = [];
  for (const g of groups.values()) {
    const heads = g.members.filter(m => m.relation === 'head').length;
    if (heads !== 1) errors.push({ line: g.line, msg: `Family "${g.ref}" must have exactly one Head (found ${heads})` });
    if (g.members.some(m => bad.has(m._line))) errors.push({ line: g.line, msg: `Family "${g.ref}" skipped because some of its rows have errors` });
    if (heads !== 1 || g.members.some(m => bad.has(m._line))) continue;
    if (!g.fam.address) { errors.push({ line: g.line, msg: `Family "${g.ref}" has no Address on the head row` }); continue; }
    g.members.sort((a, b) => (b.relation === 'head') - (a.relation === 'head'));   // head first
    families.push({ ref: g.ref, line: g.line, fam: g.fam, members: g.members.map(({ _line, ...x }) => x) });
  }
  errors.sort((a, b) => a.line - b.line);
  return { families, errors, flat, total: flat.length };
}

function templateBlob() {
  const ex = [
    ['F1', 'head', 'Abdul Rahim Chhipa', 'male', '1975-03-12', '', 'Ghulam Chhipa', 'Fatima Chhipa', '9876543210', '12th', 'Business', 'Married', 'Ward 4, Main Road', 'Taak', 'Joint', 'Chandur Bazar', '444704', 'Own House'],
    ['F1', 'spouse', 'Shabana Chhipa', 'female', '', 45, 'Yusuf Khan', '', '', '10th', 'Housewife', 'Married', '', '', '', '', '', ''],
    ['F1', 'son', 'Imran Chhipa', 'male', '2004-08-01', '', 'Abdul Rahim Chhipa', 'Shabana Chhipa', '', 'Graduate', 'Student', 'Unmarried', '', '', '', '', '', ''],
    ['F2', 'head', 'Example Second Head', 'male', '', 60, '', '', '', '', 'Retired', 'Married', 'Near Masjid', 'Rao', 'Nuclear', '', '', 'Rented']];
  const help = [[], ['HOW TO FILL — delete the example rows above first.'], ['One row per person. Rows with the same Family Ref are one family (F1, F2, A-17 … anything).'], ['Each family needs exactly ONE row with Relation = head. Address, Gotra, Family Type, Taluka, Pincode, House go on the head row only.'], ['Relation: ' + RELATIONS.map(r => r[0]).join(', ')], ['Gender: male / female / other. Marital Status: Unmarried / Married / Widowed. Give DOB or Age (DOB wins).']];
  return writeXlsx([HEAD, ...ex, ...help], 'Families');
}

export async function render(main) {
  const p = state.profile, sup = p.role === 'super_admin';
  const locs = await myLocations();
  const locSel = h('select', {}, locs.map(l => h('option', { value: l.id }, l.city + ' (' + l.code + ')')));
  const out = h('div'), file = h('input', { type: 'file', accept: '.xlsx,.csv' });
  const canExport = sup || p.can_export;

  const exportBtn = h('button', { class: 'btn', onclick: async e => {
    e.target.disabled = true;
    const { data, error } = await sb.rpc('export_rows', { p_location: locSel.value || null });
    e.target.disabled = false; if (error) return toast(friendly(error));
    const rows = [['Family ID', 'Status', 'Location', 'Address', 'Gotra', 'Family Type', 'Taluka', 'Pincode', 'House', 'Member ID', 'Relation', 'Name', 'Gender', 'DOB', 'Age', 'Father', 'Mother', 'Mobile', 'Education', 'Occupation', 'Marital', 'Member Status'],
      ...data.map(r => ['family_code', 'status', 'location', 'address', 'gotra', 'family_type', 'taluka', 'pincode', 'house', 'member_code', 'relation', 'name', 'gender', 'dob', 'age', 'father', 'mother', 'mobile', 'education', 'occupation', 'marital', 'member_status'].map(k => r[k] ?? ''))];
    download(writeXlsx(rows, 'Export'), 'chhipa-one-export-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast(data.length + ' rows exported');
  } }, '⬇ Export to Excel');

  async function onFile() {
    const f = file.files[0]; if (!f) return; file.value = '';
    out.replaceChildren(h('p', { class: 'muted' }, 'Reading file…'));
    let res;
    try {
      const rows = /\.csv$/i.test(f.name) ? parseCsv(await f.text()) : await readXlsx(await f.arrayBuffer());
      res = parseSheet(rows);
    } catch (e) { return out.replaceChildren(h('div', { class: 'card' }, h('b', {}, 'Cannot read this file'), h('p', { class: 'muted' }, e.message))); }
    const { data: dup } = res.flat.length ? await sb.rpc('import_dupes', { p_rows: res.flat.map(x => ({ i: x.i, name: x.name, father: x.father, mobile: x.mobile })) }) : { data: [] };
    const dupRefs = new Set((dup || []).map(d => res.flat[d.idx].ref));
    const skip = new Set();
    const nm = res.families.reduce((a, f2) => a + f2.members.length, 0);
    const go = h('button', { class: 'btn' }, 'Import ' + res.families.length + ' families');
    const upd = () => { const n = res.families.filter(x => !skip.has(x.ref)).length; go.textContent = 'Import ' + n + ' families'; go.disabled = !n; };
    go.onclick = async () => {
      const todo = res.families.filter(x => !skip.has(x.ref)); go.disabled = true;
      const loc = locSel.value;
      const { data: batch, error } = await sb.rpc('import_begin', { p_location: loc, p_file: f.name, p_rows: res.total });
      if (error) { go.disabled = false; return toast(friendly(error)); }
      const prog = h('p', { class: 'muted' }); out.prepend(prog); let ok = 0; const fails = [];
      for (const fm of todo) {
        prog.textContent = `Importing ${ok + fails.length + 1} of ${todo.length}…`;
        const { data, error: e } = await sb.rpc('family_create', { p: { client_ref: crypto.randomUUID(), location_id: loc, address: fm.fam.address, gotra: fm.fam.gotra || null, family_type: fm.fam.family_type || null, taluka: fm.fam.taluka || null, pincode: fm.fam.pincode || null, house_type: fm.fam.house_type || null, phone: fm.members[0].mobile || null, members: fm.members } });
        if (e) { fails.push(fm.ref + ': ' + friendly(e)); continue; }
        await sb.rpc('import_tag', { p_batch: batch, p_family: data.family_id, p_members: fm.members.length }); ok++;
      }
      await sb.rpc('import_finish', { p_batch: batch });
      done(batch, ok, fails);
    };
    out.replaceChildren(h('div', { class: 'card' }, h('b', {}, f.name), h('div', { class: 'muted' }, `${res.total} rows · ${res.families.length} valid families (${nm} members) · ${res.errors.length} problems`)),
      res.errors.length ? h('div', { class: 'card' }, h('b', { style: 'color:#b3261e' }, 'Problems — these are NOT imported'), h('ul', {}, res.errors.slice(0, 50).map(e => h('li', {}, 'Row ' + e.line + ': ' + e.msg))), res.errors.length > 50 ? h('p', { class: 'muted' }, '…and ' + (res.errors.length - 50) + ' more') : null) : null,
      dupRefs.size ? h('div', { class: 'card' }, h('b', {}, 'Possible duplicates — already in the registry'), h('p', { class: 'muted' }, 'Untick to skip the family.'),
        ...[...dupRefs].map(ref => { const ds = (dup || []).filter(d => res.flat[d.idx].ref === ref).slice(0, 2); const cb = h('input', { type: 'checkbox', checked: true, onchange: () => { cb.checked ? skip.delete(ref) : skip.add(ref); upd(); } });
          return h('label', { class: 'item' }, cb, ' ', h('span', {}, h('b', {}, ref), ' · ' + ds.map(d => res.flat[d.idx].name + ' = ' + (d.member_code || '') + (d.family_code ? ' / ' + d.family_code : '')).join('; '))); })) : null,
      res.families.length ? h('div', { class: 'card' }, h('table', {}, h('tr', {}, ['Ref', 'Head', 'Members'].map(t => h('th', {}, t))), ...res.families.slice(0, 15).map(x => h('tr', {}, h('td', {}, x.ref), h('td', {}, x.members[0].name), h('td', {}, String(x.members.length)))))
        , res.families.length > 15 ? h('p', { class: 'muted' }, '…and ' + (res.families.length - 15) + ' more families') : null, h('p', {}, go)) : null);
    upd();
  }
  function done(batch, ok, fails) {
    history();
    out.replaceChildren(h('div', { class: 'card' }, h('b', {}, ok + ' families imported ✔'), fails.length ? h('ul', {}, fails.map(x => h('li', {}, x))) : null,
      h('p', { class: 'muted' }, 'Wrong file? You can undo this whole import (families are moved to Removed Entries).'),
      h('button', { class: 'btn alt', onclick: () => undo(batch) }, '↩ Undo this import')));
  }
  async function undo(batch) {
    if (!confirm('Remove every family created by this import?')) return;
    const { data, error } = await sb.rpc('import_rollback', { p_batch: batch });
    error ? toast(friendly(error)) : (toast(data + ' families removed'), out.replaceChildren(), history());
  }
  const hist = h('div');
  async function history() {
    const { data } = await sb.from('import_batches').select('id,file_name,families_created,members_created,status,created_at').order('created_at', { ascending: false }).limit(8);
    hist.replaceChildren(...(data || []).map(b => h('div', { class: 'card item' }, h('span', {}, h('b', {}, b.file_name || 'file'), h('div', { class: 'muted s' }, new Date(b.created_at).toLocaleString() + ' · ' + b.families_created + ' families · ' + b.status)),
      b.status === 'imported' ? h('button', { class: 'btn alt', onclick: () => undo(b.id) }, 'Undo') : null)));
  }
  main.append(...[
    h('h2', {}, hi('Excel Import / Export', 'एक्सेल इम्पोर्ट / एक्सपोर्ट')),
    h('div', { class: 'card' }, h('label', {}, 'Location'), locSel,
      h('p', { class: 'muted s' }, 'Import adds families into this location. Export downloads this location’s data.')),
    h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '⬆ Import families'),
      h('p', { class: 'muted s' }, 'Download the template, fill one row per person, upload it. You will see a preview and problems before anything is saved.'),
      h('p', {}, h('button', { class: 'btn alt', onclick: () => download(templateBlob(), 'chhipa-one-import-template.xlsx') }, '⬇ Download template')), file,
      h('p', { class: 'muted s' }, 'Accepts .xlsx or .csv. Imported families are approved immediately and get Family IDs.')),
    out,
    canExport ? h('div', { class: 'card' }, h('h3', { style: 'margin-top:0' }, '⬇ Export'), h('p', { class: 'muted s' }, 'Every export is recorded in the audit log.'), exportBtn) : null,
    h('h3', {}, 'Recent imports'), hist].filter(Boolean));
  file.addEventListener('change', onFile); await history();
}
