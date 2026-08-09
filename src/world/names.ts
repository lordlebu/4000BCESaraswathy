// Place names.
//
// A map where the village is called "Settlement at 26, 6" is a debug view. A map where it is called
// Nirakoli is a place. This is the cheapest thing in the whole plan that makes the world feel
// inhabited rather than generated.
//
// The names are **invented**, not borrowed. `docs/game-plan.md` asks for something that evokes
// ancient Jambhudweepa without claiming to be historically accurate, so the syllables here are
// built to sound plausible against the setting rather than lifted from real toponyms — a made-up
// river reading as a real one someone could look up would be worse than an obviously invented one.
//
// Pure and seeded: no data files, no `Math.random()`, so the same seed always names the same river.

import { tileHash } from './rng';
import type { Point } from './types';

export type PlaceKind = 'settlement' | 'river' | 'landmark' | 'region';

// Single consonants and the aspirated pairs, nothing longer. Multi-syllable onsets were tried and
// removed: combined with a two-syllable stem and a two-syllable suffix they produced names like
// "Niraishaamgrama", which is a mouthful rather than a place.
const ONSETS = ['v', 'k', 's', 'm', 'n', 't', 'r', 'l', 'p', 'h', 'g', 'y', 'dh', 'bh', 'ch', 'sh', 'kh', 'th'];

/** Opening vowels may be long; interior ones stay short so names do not sprawl. */
const VOWELS = ['a', 'i', 'u', 'e', 'o', 'aa', 'ai'];
const SHORT_VOWELS = ['a', 'i', 'u', 'e', 'o'];

// Never empty. A one-syllable stem that also ends on its vowel leaves almost nothing in front of
// the suffix — "Ni" + "koli", "Go" + "pura" — and one such pairing came out as "Nasa", which is
// not a word this setting wants to borrow. The closing consonant gives every short stem a body.
const CODAS = ['n', 'm', 'r', 'l', 's', 't'];

/** Endings that say what kind of place this is without spelling it out. */
const SUFFIXES: Record<PlaceKind, string[]> = {
  settlement: ['koli', 'pura', 'grama', 'vati', 'thali', 'ghat', 'sthan'],
  river: ['dhara', 'nira', 'vahi', 'sarin', 'tira', 'ravi'],
  landmark: ['van', 'kund', 'shila', 'tala', 'gir', 'asa'],
  region: ['desha', 'bhumi', 'vana', 'khand']
};

/** One pull from a list, keyed by place and salt so a tile always names the same way. */
function pick<T>(list: readonly T[], seed: string, at: Point, salt: string): T {
  return list[tileHash(seed, at.x, at.y, salt) % list.length]!;
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Name a place.
 *
 * Every suffix is itself two syllables, so the stem is kept to one or two and only the shorter
 * form is allowed a closing consonant. That keeps names to three or four syllables — Bhinkoli,
 * Tanvati, Chalipura — while still varying their shape, because a map where every name has the
 * same rhythm reads as generated, which is the thing we are trying to hide.
 */
export function placeName(seed: string, kind: PlaceKind, at: Point): string {
  const open = `${pick(ONSETS, seed, at, 'on0')}${pick(VOWELS, seed, at, 'vo0')}`;
  const stem =
    tileHash(seed, at.x, at.y, 'length') % 2 === 0
      ? `${open}${pick(CODAS, seed, at, 'co0')}`
      : `${open}${pick(ONSETS, seed, at, 'on1')}${pick(SHORT_VOWELS, seed, at, 'vo1')}`;

  const suffix = pick(SUFFIXES[kind], seed, at, 'suffix');
  // Two vowels meeting across the join ("chali-asa") reads badly, so drop one.
  const joined = /[aeiou]$/.test(stem) && /^[aeiou]/.test(suffix) ? stem.slice(0, -1) + suffix : stem + suffix;
  return capitalise(joined);
}

/** Rivers read better with an article: "the Nirasdhara". */
export function riverName(seed: string, source: Point): string {
  return `the ${placeName(seed, 'river', source)}`;
}
