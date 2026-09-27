// How well a map knows you, in four words.
//
// **The owner's brief: "we are semi well known, not on the sidelines, although some people do not
// care about us until we affect their lives."** And the ruling beside it: no fame or charisma
// numbers -- this game has no experience points anywhere, and a score for being known is one by
// another name. So standing is read off what the save already holds, the same way `gatherable`
// reads who would come with you, and it is never stored or shown as a number.
//
//   a stranger here  -- nothing done on this map yet
//   heard of         -- you have finished something here, or met somebody on its roads
//   known            -- you have helped somebody here, or understood four things
//   trusted          -- you have helped at least half the people here you could help, and understood
//                       four things
//
// **Helping is what moves it**, because that is the brief's own test: people care once you have
// affected their lives. A person is helped when a discovery you finished names them in `helps` --
// the same fact the ending reads.
//
// Pure. The caller says which discoveries are finished, so this module holds no diary.

import { discoveries, offeredAt } from './knowledge';
import { fieldMap, npc, npcsAt, poi } from './places';
import type { StrangerCulture } from './travellers';

export type Standing = 'stranger' | 'heard-of' | 'known' | 'trusted';

/** Lowest first, so a comparison is an index. */
export const STANDINGS: readonly Standing[] = ['stranger', 'heard-of', 'known', 'trusted'];

/** How a standing reads, on its own. */
export const STANDING_WORDS: Readonly<Record<Standing, string>> = {
  stranger: 'A stranger here',
  'heard-of': 'Heard of here',
  known: 'Known here',
  trusted: 'Trusted here'
};

/** How many things understood on a map count, on their own, as being known there. */
export const KNOWN_BY_UNDERSTANDING = 4;

export interface Facts {
  /** Whether a discovery is finished: `isComplete` from `journey.ts`. */
  finished: (discoveryId: string) => boolean;
  /** Strangers met, as the save keeps them: `<fieldMapId>:<traveller id>`. */
  met: readonly string[];
}

export interface StandingOn {
  standing: Standing;
  /** People of this map a finished discovery helped. */
  helped: string[];
  /** People of this map any discovery could help. */
  helpable: string[];
  /** Discoveries on this map finished. */
  understood: number;
}

/** Every discovery a map offers, once each. */
function discoveriesOn(fieldMapId: string): string[] {
  const ids = (fieldMap(fieldMapId)?.pointsOfInterest ?? []).flatMap((id) =>
    offeredAt(id, poi(id)?.discoveries ?? [])
  );
  return [...new Set(ids)];
}

/** Every named person who belongs to a place on this map, once each. */
function peopleOn(fieldMapId: string): string[] {
  const ids = (fieldMap(fieldMapId)?.pointsOfInterest ?? []).flatMap((id) => npcsAt(id).map((n) => n.id));
  return [...new Set(ids)];
}

/** Everybody a finished discovery helps, on any map. */
function helpedBy(facts: Facts): Set<string> {
  const out = new Set<string>();
  for (const d of discoveries) if (facts.finished(d.id)) for (const who of d.helps) out.add(who);
  return out;
}

/** How well this map knows you. */
export function standingOn(fieldMapId: string, facts: Facts): StandingOn {
  const people = peopleOn(fieldMapId);
  const couldHelp = new Set(discoveries.flatMap((d) => d.helps));
  const helpable = people.filter((id) => couldHelp.has(id));
  const all = helpedBy(facts);
  const helped = people.filter((id) => all.has(id));
  const understood = discoveriesOn(fieldMapId).filter((id) => facts.finished(id)).length;
  const metHere = facts.met.some((key) => key.startsWith(`${fieldMapId}:`));

  const half = Math.max(1, Math.ceil(helpable.length / 2));
  const standing: Standing =
    helped.length >= half && helped.length > 0 && understood >= KNOWN_BY_UNDERSTANDING
      ? 'trusted'
      : helped.length > 0 || understood >= KNOWN_BY_UNDERSTANDING
        ? 'known'
        : understood > 0 || metHere
          ? 'heard-of'
          : 'stranger';

  return { standing, helped, helpable, understood };
}

/** Canon's language to canon's people, for the two that are both. */
const PEOPLE_OF_LANGUAGE: Readonly<Record<string, StrangerCulture>> = { kia: 'kia', maru: 'maru' };

/**
 * Whether a stranger of this people has reason to care about you.
 *
 * **Some people do not care until you affect their lives.** A stranger warms to you when the map
 * knows you, or when you have helped somebody of their own people anywhere. A cold stranger is civil
 * and brief, and does not pass on what they have heard.
 */
export function warmTo(culture: StrangerCulture | null, standing: Standing, facts: Facts): boolean {
  if (STANDINGS.indexOf(standing) >= STANDINGS.indexOf('known')) return true;
  if (!culture) return false;
  for (const who of helpedBy(facts)) {
    const person = npc(who);
    if (person && PEOPLE_OF_LANGUAGE[person.language] === culture) return true;
  }
  return false;
}
