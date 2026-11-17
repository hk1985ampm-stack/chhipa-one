import { h, hi, state } from './core.js';

const tile = (href, en, hindi, soon) =>
  h(soon ? 'div' : 'a', { class: 'tile' + (soon ? ' soon' : ''), href: soon ? null : href },
    h('span', {}, en), h('span', { class: 'hi' }, hindi), soon ? h('span', { class: 'tag' }, 'Coming in Phase ' + soon) : null);

export async function render(main) {
  const p = state.profile, sup = p.role === 'super_admin';
  main.append(
    h('h2', {}, 'Welcome, ' + p.full_name),
    h('div', { class: 'card' }, h('input', { type: 'search', placeholder: 'Search name, Family ID, Member ID, mobile… · खोजें', onfocus: () => (location.hash = 'registry') }),
      h('div', { class: 'muted', style: 'margin-top:6px;font-size:14px' }, 'Tap Family Registry to search.')),
    h('div', { class: 'grid' },
      tile('#registry', 'Family Registry', 'परिवार रजिस्टर'),
      tile('#add', 'Add Family', 'परिवार जोड़ें'),
      ['super_admin', 'location_admin'].includes(p.role) ? tile('#registry/pending', 'Pending Approvals', 'लंबित स्वीकृति') : null,
      tile('#events', 'Life Events', 'जीवन घटनाएँ'),
      sup ? tile('#locations', 'Locations', 'स्थान') : null,
      sup ? tile('#lists', 'Dropdown Lists', 'ड्रॉपडाउन सूची') : null,
      sup ? tile('#staff', 'Staff & Agents', 'स्टाफ / एजेंट') : null,
      sup ? tile('#audit', 'Audit Log', 'ऑडिट लॉग') : null));
}
