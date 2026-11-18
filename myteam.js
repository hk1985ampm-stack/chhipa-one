// "My Team" for State Admins (assign Location Admins + Agents of their state) and Location Admins (assign Agents of their locations)
import { sb, h, hi, state } from './core.js';
import { teamTab } from './team.js';
export async function render(main) {
  const { data } = await sb.from('user_locations').select('locations(id,code,city,state,status,community_id)').eq('user_id', state.profile.user_id);
  const locs = (data || []).map(x => x.locations).filter(Boolean);
  if (!locs.length) return main.append(h('p', { class: 'muted' }, 'No locations are assigned to you yet.'));
  main.append(h('h2', {}, hi('My Team', 'मेरी टीम')), await teamTab({ id: locs[0].community_id }, locs));
}
