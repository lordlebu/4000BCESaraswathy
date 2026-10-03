// Asking a road's keeper about the road: how a map is left, said by somebody on it.
//
// **The owner's ask, 3 October 2026.** A map is left only from its cart point (`mayLeaveFrom`), and
// nothing in the world said so: the Travel sheet explained it to whoever opened it, and nobody else.
// Canon already names who keeps each road (`field_map.roads[].keeper`), so that person can be asked,
// the way Thrali is asked about a boat. Canon says who and where; the game composes the sentence from
// those names, like the cart line on the Travel sheet, so a renamed place renames it here too.
//
// Pure, like everything in `content/`: the conversation asks and shows the answer.

import { vehicles } from './making';
import { fieldMap, poi } from './places';

export interface RoadAnswer {
  /** What the keeper says: which way their roads go, by what, and from where. */
  line: string;
  /** Under it, plainly: what to do, in the interface's own words. */
  hint: string;
}

const lower = (name: string): string => name.replace(/^The /, 'the ');

/** "A", "A and B", "A, B and C" -- or "A or B", for places where one will do. */
function listed(names: string[], joiner = 'and'): string {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} ${joiner} ${names.at(-1)}`;
}

/**
 * What a keeper says when asked about the road, or null when this person keeps no road from here.
 *
 * Their roads only -- on Lothal Thrali sees off the dhow to the Aravali and Kunch the carts inland --
 * grouped by what carries you, and where it leaves from.
 */
export function aboutTheRoad(fieldMapId: string, npcId: string): RoadAnswer | null {
  const map = fieldMap(fieldMapId);
  if (!map) return null;
  const kept = map.roads.filter((r) => r.keeper.npc === npcId);
  if (kept.length === 0) return null;
  const yard = listed(map.departsFrom.map((id) => lower(poi(id)?.name ?? id)), 'or') || lower(map.name);
  const byVehicle = new Map<string, string[]>();
  for (const road of kept) {
    const to = fieldMap(road.to)?.name;
    if (!to) continue;
    byVehicle.set(road.by, [...(byVehicle.get(road.by) ?? []), lower(to)]);
  }
  const legs = [...byVehicle].map(([by, to]) => {
    const name = (vehicles.find((v) => v.id === by)?.name ?? 'cart').toLowerCase();
    return `the ${name} for ${listed(to)}`;
  });
  const said = listed(legs);
  return {
    line: `${said.charAt(0).toUpperCase()}${said.slice(1)} ${legs.length > 1 ? 'go' : 'goes'} from ${yard}. Come and find me there when you are ready.`,
    hint: `Stand at ${yard} and press Travel at the top of the screen.`
  };
}
