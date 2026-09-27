// Who is at a place right now, and where everybody else who belongs there has gone.
//
// **A place used to list everybody who ever visits it.** `npcsAt` reads canon's `found_at` as a
// set, so Kunch -- authored at the Camp in the Kilns, the Marsh Shrine and the Eastern Field -- was
// listed at all three at once, and Thrali was "here" at the Camp on the evenings he was resting at
// the Drowned Dockyard. Meanwhile the map hides anybody who has stopped at a place, so the panel
// was the only way to know who was there, and it was wrong. Reported from play: "if I walk into a
// town, I am not aware who is there."
//
// Three kinds of person, and one answer for each:
//
//   - **Somebody authored in one place** is always there. Uma is on the roof.
//   - **Somebody walking a circuit** is where the scene says: at the place they stopped at, or on
//     the road to the next. `travellers.ts` owns that rule and this only reads its answer.
//   - **Somebody authored in several places but not walking**, because `TRAVELLERS_PER_MAP` capped
//     the roster -- the Aravali has five circuit people and draws three. They keep a place for the
//     whole day, the next one on their circuit each day, so they are in one place and not five.
//
// Pure: no React, no Phaser and no clock. The caller brings the day and what the scene reported.

import { fieldMap, npcsAt, poi, type Npc } from './places';
import { travellersOn, type TravellerState } from './travellers';

/** What the scene said about one traveller, as `travellers-changed` carries it. */
export interface Reported {
  npcId: string | null;
  state: TravellerState;
}

/** Somebody who belongs here and is somewhere else, with where, as a player reads it. */
export interface Away {
  npc: Npc;
  /** "On the road to the Drowned Dockyard", "At the Marsh Shrine today". */
  where: string;
  /** The same, as the sentence a place opens with: "Kunch has stopped at the Marsh Shrine." */
  says: string;
}

export interface Presence {
  here: Npc[];
  away: Away[];
}

/** A place's name mid-sentence: canon titles most with their article, "The Rail-Head". */
function placeName(poiId: string | null): string | null {
  const name = poiId ? (poi(poiId)?.name ?? null) : null;
  return name ? name.replace(/^The /, 'the ') : null;
}

/**
 * Who is at this place now, and where the rest of its people are.
 *
 * `reported` is what the scene last said about the map's travellers. **Before it has said anything,
 * a traveller counts as here**, which is what the game showed before this existed: better to list
 * somebody for the first half-second of a map than to tell a player a place is empty when it is not.
 */
export function whoIsHere(
  poiId: string,
  fieldMapId: string,
  day: number,
  reported: readonly Reported[]
): Presence {
  const onMap = new Set(fieldMap(fieldMapId)?.pointsOfInterest ?? []);
  const walking = new Set(
    travellersOn(fieldMapId)
      .map((t) => t.npcId)
      .filter((id): id is string => id !== null)
  );
  const here: Npc[] = [];
  const away: Away[] = [];

  for (const person of npcsAt(poiId)) {
    if (walking.has(person.id)) {
      const state = reported.find((r) => r.npcId === person.id)?.state;
      if (!state || (state.resting && (state.atPoi === poiId || state.atPoi === null))) {
        here.push(person);
      } else if (state.resting) {
        const at = placeName(state.atPoi);
        away.push({
          npc: person,
          where: `Stopped at ${at}`,
          says: `${person.name} has stopped at ${at}.`
        });
      } else {
        const to = placeName(state.boundFor);
        away.push(
          state.boundFor === poiId
            ? { npc: person, where: 'On the road here', says: `${person.name} is on the way here.` }
            : {
                npc: person,
                where: to ? `On the road to ${to}` : 'On the road',
                says: to ? `${person.name} is on the road to ${to}.` : `${person.name} is on the road.`
              }
        );
      }
      continue;
    }

    const circuit = person.foundAt.filter((id) => onMap.has(id));
    if (circuit.length < 2) {
      here.push(person);
      continue;
    }
    const today = circuit[((day % circuit.length) + circuit.length) % circuit.length]!;
    if (today === poiId) here.push(person);
    else {
      const at = placeName(today);
      away.push({ npc: person, where: `At ${at} today`, says: `${person.name} is at ${at} today.` });
    }
  }

  return { here, away };
}

/**
 * Where the people who belong here have gone, as one line under the list of who is here.
 *
 * "Thrali is on the road to the Drowned Dockyard." Null when everybody is in. One line rather than
 * a second list, because the place panel is read in a dock that does not grow: measured on a
 * landscape phone, a separate line and list took the share of the place on screen from 25% to 21%.
 */
export function awayLine(presence: Presence): string | null {
  return presence.away.length > 0 ? presence.away.map((a) => a.says).join(' ') : null;
}

/** Somebody on the road the player can walk up to, as the action rail offers them. */
export interface RoadTalk {
  travellerId: string;
  /** The canon person, whose conversation opens. Null for a stranger, who walks with you instead. */
  npcId: string | null;
  label: string;
  /** Why not yet, or null when they are beside you. */
  blocked: string | null;
}

/**
 * The action-rail row for the nearest person on the road, or null when nobody is near.
 *
 * **Greyed until you are beside them, and that is the teaching.** Reported from play: nobody on the
 * road could be spoken to. A row that appears as somebody comes into view, saying who they are and
 * to walk up beside them, is how a player learns the road has people to meet. `near` is the scene's
 * `travellers-nearby`, closest first; `met` is the save's list of strangers met, keyed by map.
 */
export function roadTalk(
  near: readonly { id: string; npcId: string | null; beside: boolean }[],
  fieldMapId: string,
  met: readonly string[]
): RoadTalk | null {
  const first = near[0];
  if (!first) return null;
  const traveller = travellersOn(fieldMapId).find((t) => t.id === first.id);
  if (!traveller) return null;
  const known = met.includes(`${fieldMapId}:${traveller.id}`) && traveller.givenName !== null;
  const who = traveller.npcId
    ? traveller.name
    : known
      ? traveller.givenName!
      : `the ${traveller.role.split(',')[0]}`;
  const Who = who[0]!.toUpperCase() + who.slice(1);
  return {
    travellerId: traveller.id,
    npcId: traveller.npcId,
    label: traveller.npcId ? `Talk to ${who}` : `Walk with ${who}`,
    blocked: first.beside ? null : `${Who} is on the road nearby. Walk up beside them.`
  };
}

/** Who is at one place, as the map marks it: a pip each, brighter for somebody with news. */
export interface PlaceMark {
  poiId: string;
  people: { npcId: string; fresh: boolean }[];
}

/**
 * Who is at every place on the map, for the marks drawn over them.
 *
 * **So a player can see from the road where people are.** The map draws nobody standing at a place
 * -- they would stand on the roof -- so without these the only way to find somebody was to walk into
 * every place in turn. `fresh` is the caller's answer to "has this person something new to say",
 * which is `hasSomethingNew` in `journey.ts`; passed in so this module need not hold a diary.
 * Places with nobody in are left out.
 */
export function peopleAtPlaces(
  fieldMapId: string,
  day: number,
  reported: readonly Reported[],
  fresh: (npcId: string) => boolean
): PlaceMark[] {
  const out: PlaceMark[] = [];
  for (const poiId of fieldMap(fieldMapId)?.pointsOfInterest ?? []) {
    const here = whoIsHere(poiId, fieldMapId, day, reported).here;
    if (here.length > 0) out.push({ poiId, people: here.map((n) => ({ npcId: n.id, fresh: fresh(n.id) })) });
  }
  return out;
}
