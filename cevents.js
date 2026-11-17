import { crudPage } from './crud.js';
import { hi } from './core.js';
const fd = d => d ? new Date(d).toLocaleDateString('en-IN') : '';
export async function render(main) {
  await crudPage(main, { table: 'community_events', title: hi('Community Events', 'सामुदायिक कार्यक्रम'), order: ['event_on', false],
    fields: [{ k: 'title', label: 'Event name', req: 1 }, { k: 'kind', label: 'Type', type: 'select', opts: ['Jalsa', 'Eid Milan', 'Health Camp', 'Education', 'Sports', 'Relief / Drive', 'Other'] }, { k: 'event_on', label: 'Date', type: 'date', req: 1 }, { k: 'event_time', label: 'Time', ph: 'e.g. 5:00 PM' }, { k: 'venue', label: 'Venue' }, { k: 'description', label: 'Details', type: 'textarea' }],
    row: r => [r.title, [r.kind, fd(r.event_on), r.event_time, r.venue].filter(Boolean).join(' · '), r.description] });
}
