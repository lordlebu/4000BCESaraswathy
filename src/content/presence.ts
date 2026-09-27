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

/** "Uma", "Uma and Bekh", "Uma, Bekh and Kunch". */
function listed(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * The line a place opens with: who is here, and where the others went.
 *
 * One sentence for the people present and one for each who is away, so walking in tells you who to
 * talk to and where to find the rest. Null when nobody belongs to this place at all -- a place
 * with no people is described by its prose, and "Nobody is here" would suggest somebody should be.
 */
export function companyLine(presence: Presence): string | null {
  const { here, away } = presence;
  if (here.length === 0 && away.length === 0) return null;
  const parts: string[] = [];
  if (here.length > 0) {
    parts.push(`${listed(here.map((n) => n.name))} ${here.length === 1 ? 'is' : 'are'} here.`);
  } else {
    parts.push('Nobody is here just now.');
  }
  for (const a of away) parts.push(a.says);
  return parts.join(' ');
}
