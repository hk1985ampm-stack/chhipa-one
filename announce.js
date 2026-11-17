import { crudPage } from './crud.js';
import { hi } from './core.js';
const fd = d => d ? new Date(d).toLocaleDateString('en-IN') : '';
export async function render(main) {
  await crudPage(main, { table: 'announcements', title: hi('Announcements', 'घोषणाएँ'), order: ['starts_on', false],
    fields: [{ k: 'title', label: 'Title', req: 1 }, { k: 'body', label: 'Message', type: 'textarea', rows: 5 }, { k: 'starts_on', label: 'Show from', type: 'date', req: 1, def: new Date().toISOString().slice(0, 10) }, { k: 'ends_on', label: 'Show until (optional)', type: 'date' }, { k: 'pinned', label: 'Pin to top of Home', type: 'checkbox' }],
    row: r => [(r.pinned ? '📌 ' : '') + r.title, fd(r.starts_on) + (r.ends_on ? ' → ' + fd(r.ends_on) : ''), r.body] });
}
