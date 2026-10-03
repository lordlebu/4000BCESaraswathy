// The firsts: a boat lent, a line first ridden, each marked once with a card.
//
// **The owner's rulings, 3 October 2026.** On Lothal the dugout is no longer in the kit from the first
// morning. Thrali lends it, at the Camp in the Kilns or the Drowned Dockyard, and only from the third
// day, so the delta is waded before it is paddled. The first ride on the Aravali's line is a moment
// with Hesh. Canon says who, where and in what words (`field_map.firsts`); this file says when, and
// what the save remembers.
//
// What the save remembers is two flags in the knowledge half, so none of this costs a version bump:
// `lent:<vehicle>` once a boat is yours, and `first:<id>` once its card has been seen.
//
// Pure, like everything in `content/`: the dock and the scene ask, and neither works it out.

import { boatFor, type KitItem } from './kit';
import { fieldMap, type First } from './places';
import { LEND_FROM_DAY } from './tiers';
import { anyConditions, type GameEvent } from './events';

/** The flag a lent vehicle leaves in the save. */
export const lentFlag = (vehicle: string): string => `lent:${vehicle}`;
/** The flag a first's card leaves once seen. */
export const seenFlag = (first: First): string => `first:${first.id}`;

/** The vehicles the journey has been lent, read out of the save's flags. */
export function lentVehicles(flags: readonly string[]): string[] {
  return flags.filter((f) => f.startsWith('lent:')).map((f) => f.slice('lent:'.length));
}

/**
 * A boat asked for in the address, for the browser suite: `?lent=dugout`. A convenience on the
 * principle of `?at=` -- a spec that tests paddling should not have to walk three days to Thrali.
 */
export function lentFromSearch(search: string): string[] {
  return new URLSearchParams(search).get('lent') === 'dugout' ? ['vehicle_log_dugout'] : [];
}

/** The first on this map that lends this vehicle, if one does. */
export function lendingOf(fieldMapId: string, vehicle: string): First | null {
  return fieldMap(fieldMapId)?.firsts.find((f) => f.vehicle === vehicle && f.notYet !== null) ?? null;
}

/**
 * The boat the traveller has on this map, or null.
 *
 * A map lists the dugout among its vehicles (canon's `vehicles`); where a first lends it, it is the
 * traveller's only once lent. That is Lothal today, and the only map with a boat at all.
 */
export function boatOn(fieldMapId: string, lent: readonly string[]): KitItem | null {
  const map = fieldMap(fieldMapId);
  if (!map) return null;
  const boat = boatFor(map.vehicles);
  if (!boat) return null;
  return lendingOf(fieldMapId, boat.id) && !lent.includes(boat.id) ? null : boat;
}

/** What asking somebody about a boat comes to, here and now. */
export type Asked =
  | { kind: 'lend'; first: First }
  | { kind: 'not-yet'; first: First; line: string };

/**
 * Whether the person being talked to can be asked for a boat here, and what they say.
 *
 * Null when there is nothing to ask: another person, another place, or the boat already lent.
 * Before `LEND_FROM_DAY` the answer is canon's `not_yet`; from then on, the loan itself.
 */
export function askAboutBoat(input: {
  fieldMapId: string;
  npcId: string;
  poiId: string | null;
  day: number;
  flags: readonly string[];
}): Asked | null {
  const map = fieldMap(input.fieldMapId);
  if (!map) return null;
  const lent = lentVehicles(input.flags);
  const first = map.firsts.find(
    (f) =>
      f.notYet !== null &&
      f.npc === input.npcId &&
      !lent.includes(f.vehicle) &&
      (f.at.length === 0 || (input.poiId !== null && f.at.includes(input.poiId)))
  );
  if (!first) return null;
  if (input.day < LEND_FROM_DAY) return { kind: 'not-yet', first, line: first.notYet! };
  return { kind: 'lend', first };
}

/** The first ride's card on this map, when it has not been seen yet; null otherwise. */
export function firstRide(fieldMapId: string, vehicle: string, flags: readonly string[]): First | null {
  const first = fieldMap(fieldMapId)?.firsts.find((f) => f.vehicle === vehicle && f.notYet === null) ?? null;
  return first && !flags.includes(seenFlag(first)) ? first : null;
}

/**
 * A first as the event card shows it: canon's prose, the painting, and one choice whose line is the
 * person's own. Built rather than authored, so the card is the one every other moment uses.
 */
export function firstEvent(first: First, title: string, verb: string): GameEvent {
  return {
    id: first.id,
    title,
    occasion: 'road',
    conditions: anyConditions(),
    prose: first.prose.join(' '),
    art: first.art,
    choices: [{ id: 'go', label: verb, needs: [], line: first.line, grants: [] }],
    once: true
  };
}
