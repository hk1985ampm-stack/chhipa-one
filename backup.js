import { sb, h, hi, toast, friendly } from './core.js';
import { writeXlsx, download } from './xlsx.js';

const SHEETS = ['communities', 'locations', 'families', 'members', 'family_memberships', 'member_contacts', 'life_events', 'marriages', 'profiles', 'user_locations', 'options'];
const cell = v => v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : (typeof v === 'number' ? v : String(v));

export async function render(main) {
  const { data: logs } = await sb.from('backup_log').select('kind,status,rows_saved,note,created_at').order('created_at', { ascending: false }).limit(10);
  const btn = h('button', { class: 'btn' }, '⬇ Back up now (download)');
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Preparing…';
    const { data, error } = await sb.rpc('backup_dump');
    if (error) { btn.disabled = false; btn.textContent = '⬇ Back up now (download)'; return toast(friendly(error)); }
    const stamp = new Date().toISOString().slice(0, 10);
    // complete database as JSON (best for restoring)
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'chhipa-one-backup-' + stamp + '.json');
    const n = (data.members || []).length;
    await sb.rpc('backup_record', { p_rows: n, p_note: SHEETS.reduce((a, k) => a + (data[k] || []).length, 0) + ' records in ' + SHEETS.length + ' tables' });
    toast('Backup saved (' + n + ' members). Keep the files somewhere safe, e.g. Google Drive.');
    main.replaceChildren(); render(main);
  };
  const xl = h('button', { class: 'btn alt' }, '⬇ People list (Excel)');
  xl.onclick = async () => {
    const { data: rows, error } = await sb.rpc('export_rows', { p_location: null }); if (error) return toast(friendly(error));
    const K = ['family_code', 'status', 'location', 'address', 'gotra', 'family_type', 'taluka', 'pincode', 'house', 'member_code', 'relation', 'name', 'gender', 'dob', 'age', 'father', 'mother', 'mobile', 'education', 'occupation', 'marital', 'member_status'];
    download(writeXlsx([K, ...rows.map(r => K.map(k => cell(r[k])))], 'People'), 'chhipa-one-people-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  };
  main.append(h('h2', {}, hi('Backup', 'बैकअप')),
    h('div', { class: 'card' }, h('p', { class: 'muted s' }, 'Downloads the complete database (JSON) for safe keeping. Save it to Google Drive or a safe place. The Excel button gives a readable people list. Super Admin only.'), btn, ' ', xl),
    h('div', { class: 'card' }, h('b', {}, 'Daily automatic backup to Google Drive'),
      h('p', { class: 'muted s' }, 'Set up once with the steps in BACKUP-SETUP.md (GitHub Actions + a Google service account). When it runs, it appears below as “scheduled”.')),
    h('h3', {}, 'Recent backups'),
    ...((logs || []).length ? logs.map(l => h('div', { class: 'card item' }, h('span', {}, h('b', {}, new Date(l.created_at).toLocaleString()), h('div', { class: 'muted s' }, l.kind + ' · ' + l.status + ' · ' + l.rows_saved + ' members' + (l.note ? ' · ' + l.note : ''))))) : [h('div', { class: 'card muted' }, 'No backup recorded yet.')]));
}
