// Dashboard: counters + small charts. Used as its own page (#dashboard) and as a compact strip on Home.
import { sb, h, hi } from './core.js';
import { countUp, barChart, donut } from './ui.js';

export function dashboardBlock(lev = 0, pend = 0, full = true) {
  const box = h('div', { class: 'dash' }), nums = h('div', { class: 'kpis' }), charts = h('div', { class: 'charts' });
  const kpi = (ic, label, v, href) => { const n = h('b', {}, '0'); const el = h('a', { class: 'kpi', href }, h('span', { class: 'ki' }, ic), h('div', {}, n, h('small', {}, label))); setTimeout(() => countUp(n, v), 120); return el; };
  const cnt = (t, f) => { let q = sb.from(t).select('id', { count: 'exact', head: true }); if (f) q = f(q); return q.then(r => r.count || 0, () => 0); };
  box.append(nums); if (full) box.append(charts);
  nums.append(...[1, 2, 3, 4].map(() => h('div', { class: 'kpi skl' })));
  const six = new Date(); six.setDate(1); six.setMonth(six.getMonth() - 5);
  Promise.all([cnt('families', q => q.eq('status', 'approved')), cnt('members', q => q.eq('status', 'active')), cnt('members', q => q.eq('status', 'active').eq('gender', 'male')), cnt('members', q => q.eq('status', 'active').eq('gender', 'female')),
    full ? sb.from('families').select('created_at').gte('created_at', six.toISOString()).limit(3000).then(r => r.data || [], () => []) : [],
    cnt('families', q => q.eq('status', 'pending')), cnt('life_events', q => q.eq('status', 'pending'))]).then(([fam, mem, men, wom, rows, pf, pl]) => {
    nums.replaceChildren(kpi('👨‍👩‍👧', 'Families', fam, '#registry'), kpi('🧑‍🤝‍🧑', 'Members', mem, '#registry'), kpi('⏳', 'Pending', pend || pf, '#registry/pending'), kpi('🎉', 'Life events', lev || pl, '#events'));
    if (!full) return;
    const labs = [], vals = []; for (let k = 0; k < 6; k++) { const d = new Date(six.getFullYear(), six.getMonth() + k, 1); labs.push(d.toLocaleString('en', { month: 'short' })); vals.push(rows.filter(r => { const c = new Date(r.created_at); return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear(); }).length); }
    charts.replaceChildren(h('div', { class: 'card' }, h('b', {}, 'New families · last 6 months'), barChart(vals, labs)), h('div', { class: 'card' }, h('b', {}, 'Members'), donut([{ n: 'Men', v: men, c: 'var(--c2)' }, { n: 'Women', v: wom, c: 'var(--gold)' }, { n: 'Other', v: Math.max(0, mem - men - wom), c: 'var(--c1)' }])));
  });
  return box;
}
export async function render(main) { main.append(h('h2', {}, '📊 ', hi('Dashboard', 'डैशबोर्ड')), dashboardBlock(0, 0, true)); }
