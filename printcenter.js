import { h, hi, toast, friendly, myLocations, state, isApprover } from './core.js';
import { fetchFamilies, makePdf, DOCS } from './bulkpdf.js';

export async function render(main) {
  const p = state.profile;
  if (!(isApprover() || p.can_export)) return main.append(h('div', { class: 'card' }, 'Print Center is for admins or users with export permission.'));
  const locs = await myLocations(), loc = h('select', {}, h('option', { value: '' }, 'All locations'), locs.map(l => h('option', { value: l.id }, l.city)));
  const photos = h('input', { type: 'checkbox' }), title = h('input', { placeholder: 'Notice / meeting title' }), date = h('input', { type: 'date', value: new Date().toISOString().slice(0, 10) }), body = h('textarea', { rows: 5, placeholder: 'Notice text (used for Notice PDF)' });
  const msg = h('p', { class: 'muted' }); let busy = false;
  const go = async k => {
    if (busy) return; busy = true; msg.textContent = 'Collecting data…';
    try {
      const fams = await fetchFamilies(loc.value || null, n => msg.textContent = 'Collecting data… ' + n + ' families');
      if (!fams.length) { msg.textContent = 'No approved families found.'; return; }
      msg.textContent = 'Building PDF…';
      await makePdf(k, fams, { place: loc.value ? loc.selectedOptions[0].textContent : 'All locations', photos: photos.checked, title: title.value, body: body.value, date: date.value ? new Date(date.value).toLocaleDateString('en-IN') : '' });
      msg.textContent = '✓ Done · ' + fams.length + ' families'; toast('PDF ready');
    } catch (e) { msg.textContent = friendly(e); } finally { busy = false; }
  };
  main.append(h('h2', {}, hi('Print Center', 'प्रिंट सेंटर')),
    h('div', { class: 'card' }, h('label', {}, 'Location'), loc, h('label', { class: 'chk' }, photos, ' Include photos on ID cards (slower)')),
    h('div', { class: 'card' }, h('label', {}, 'Notice / attendance title'), title, h('label', {}, 'Date'), date, h('label', {}, 'Notice text'), body),
    h('div', { class: 'tiles' }, DOCS.map(([k, t, d]) => h('button', { class: 'tile', onclick: () => go(k) }, h('b', {}, t), h('small', {}, d)))), msg);
}
