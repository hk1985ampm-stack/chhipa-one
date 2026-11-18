// Office bearers (State Admin / Location Admin with ID number + phone) printed under the society header on every card.
import { sb } from './core.js';
const cache = new Map();
export async function officersFor(locId) {
  if (!locId) return [];
  if (cache.has(locId)) return cache.get(locId);
  let r = []; try { const { data, error } = await sb.rpc('location_officers', { p_location: locId }); if (!error && data) r = data; } catch {}
  cache.set(locId, r); return r;
}
export async function allOfficers() { try { const { data, error } = await sb.rpc('office_bearers'); if (!error && data) return data.map(o => ({ ...o, level: o.level === 'state_admin' ? 'state_admin' : 'location_admin' })); } catch {} return []; }
export const officerLine = o => `ID ${o.admin_code || '—'}  ·  Ph ${o.phone || '—'}  ·  ${o.area || ''}`.trim();
export const nameLine = o => o.full_name + (o.designation ? ' (' + o.designation + ')' : '');
