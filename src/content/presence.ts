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
import { travellersOn, type Traveller, type TravellerState } from './travellers';
import { busyLine } from './campLife';
import type { CampKind } from './encampments';

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
  /** Whether they are beside you, so pressing opens at once rather than calling them to stop. */
  beside: boolean;
  /** Whether they keep a camp: talked to where they are, rather than walked with. */
  atCamp: boolean;
  /** What else the row has to say: that they will wait, and who else could be meant. */
  detail: string | null;
}

/** Somebody the scene reports near the player, as `travellers-nearby` carries them. */
export interface NearbyTraveller {
  id: string;
  npcId: string | null;
  steps: number;
  beside: boolean;
  /** What they are doing at or for a camp, when they are: `CampActivity`, or `visit` / `trade`. */
  doing?: string | null;
}

/**
 * What a player calls somebody on the road: a name if canon gave one or they told you theirs.
 * Somebody at a camp is called by what they do there -- "the head drover" -- until then.
 */
function roadName(traveller: Traveller, fieldMapId: string, met: readonly string[]): string {
  if (traveller.npcId) return traveller.name;
  const known = met.includes(`${fieldMapId}:${traveller.id}`) && traveller.givenName !== null;
  if (known) return traveller.givenName!;
  const title = (traveller as Traveller & { title?: string }).title;
  return traveller.campId && title ? `the ${title}` : `the ${traveller.role.split(',')[0]}`;
}

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/**
 * Which of the people near the player the row is about.
 *
 * **Reported from play: with two people the same distance away, nobody could tell who the row
 * meant.** Somebody the player chose by tapping them stays chosen for as long as they are in view.
 * Otherwise it is the nearest, and between two equally near it stays with whoever it already meant,
 * so the row does not flick from one name to the other as they walk. The id breaks a tie only when
 * nothing else can, which is the order `nearby` already sorts by.
 */
export function talkTarget(
  near: readonly NearbyTraveller[],
  chosen: string | null,
  previous: string | null
): NearbyTraveller | null {
  if (near.length === 0) return null;
  const picked = chosen ? near.find((t) => t.id === chosen) : undefined;
  if (picked) return picked;
  const closest = Math.min(...near.map((t) => t.steps));
  const tied = near.filter((t) => t.steps === closest);
  return tied.find((t) => t.id === previous) ?? tied[0]!;
}

/**
 * The action-rail row for one person on the road, or null when nobody is near.
 *
 * **Anybody in view can be talked to, and pressing from a distance calls out.** It used to be
 * greyed until you were beside them, and a traveller on a long leg out-walks the player, so the
 * row named people who could never be reached. Now they stop and wait (`Waiting` in
 * `travellers.ts`), the player walks up, and the conversation opens on arrival. `near` is the
 * scene's `travellers-nearby`, closest first; `met` is the save's list of strangers met, keyed by
 * map; `chosen` and `previous` are `talkTarget`'s; `roster` is everybody who could be near, which
 * is the road's travellers and, while a camp stands, its people (`campPeople`).
 */
export function roadTalk(
  near: readonly NearbyTraveller[],
  fieldMapId: string,
  met: readonly string[],
  chosen: string | null = null,
  previous: string | null = null,
  roster: readonly Traveller[] = travellersOn(fieldMapId),
  campKind: CampKind | null = null
): RoadTalk | null {
  const target = talkTarget(
    near.filter((t) => roster.some((r) => r.id === t.id)),
    chosen,
    previous
  );
  if (!target) return null;
  const traveller = roster.find((t) => t.id === target.id)!;
  const who = roadName(traveller, fieldMapId, met);
  const others = near
    .filter((t) => t.id !== target.id)
    .flatMap((t) => {
      const other = roster.find((r) => r.id === t.id);
      return other ? [roadName(other, fieldMapId, met)] : [];
    });
  const parts: string[] = [];
  // Busy with a camp: sitting at its fire as a visitor, or trading at the turn-off with its runner.
  const busy = busyLine(target.doing, who, campKind);
  if (busy) parts.push(busy);
  if (!target.beside) {
    parts.push(
      traveller.campId
        ? `${capital(who)} will stop what they are doing when you walk up.`
        : `${capital(who)} will stop and wait while you walk up.`
    );
  }
  if (others.length > 0) {
    const list = others.length === 1 ? others[0]! : `${others.slice(0, -1).join(', ')} and ${others.at(-1)}`;
    parts.push(`${capital(list)} ${others.length === 1 ? 'is' : 'are'} near too: tap somebody on the map to choose.`);
  }
  return {
    travellerId: traveller.id,
    npcId: traveller.npcId,
    // Somebody at a camp is talked to where they are; somebody on the road is walked with.
    label: traveller.npcId || traveller.campId ? `Talk to ${who}` : `Walk with ${who}`,
    beside: target.beside,
    atCamp: Boolean(traveller.campId),
    detail: parts.length > 0 ? parts.join(' ') : null
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
