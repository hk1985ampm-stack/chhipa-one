import { crudPage } from './crud.js';
import { hi, h, digits } from './core.js';
export async function render(main) {
  await crudPage(main, { table: 'sevaks', title: hi('Volunteers (Sevaks)', 'सेवक'), order: ['name', true],
    fields: [{ k: 'name', label: 'Name', req: 1 }, { k: 'mobile', label: 'Mobile', type: 'tel' }, { k: 'role', label: 'Role / duty', ph: 'e.g. Janaza team, Ration drive' }, { k: 'area', label: 'Area / ward' }, { k: 'joined_on', label: 'Joined on', type: 'date' }, { k: 'active', label: 'Active', type: 'checkbox', def: true }, { k: 'note', label: 'Note', type: 'textarea', rows: 2 }],
    row: r => [r.name + (r.active ? '' : ' (inactive)'), [r.role, r.area].filter(Boolean).join(' · '), r.mobile],
    extra: r => digits(r.mobile).length === 10 ? h('a', { class: 'btn alt sm', href: 'tel:' + digits(r.mobile) }, '📞 Call') : null });
}
