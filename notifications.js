import { sb, h, toast, friendly } from './core.js';

const when = t => new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export async function render(main) {
  const { data, error } = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return main.append(h('p', { class: 'err' }, friendly(error)));
  const unread = (data || []).filter(n => !n.is_read);
  const all = h('button', { class: 'btn alt', onclick: async () => { await sb.rpc('notif_mark_read'); render2(); } }, 'Mark all read');
  const render2 = () => { main.replaceChildren(); render(main); };
  main.append(...[h('h2', {}, 'Notifications'), unread.length ? h('div', { class: 'actions' }, h('span'), all) : null,
    !(data || []).length ? h('p', { class: 'muted' }, 'No notifications yet.') : null,
    (data || []).map(n => h('a', { class: 'card note' + (n.is_read ? '' : ' unread'), href: n.link || '#notifications',
      onclick: () => { if (!n.is_read) sb.rpc('notif_mark_read', { p_ids: [n.id] }); } },
      h('b', {}, n.title), n.body ? h('div', { class: 'muted' }, n.body) : null, h('div', { class: 'muted', style: 'font-size:12px' }, when(n.created_at))))].flat().filter(Boolean));
}
