// The day behind you, said at the night that ends it -- and where you were, said at the door.
//
// **A place to stop** (`docs/a-place-to-stop.md`). Each map is eighteen to twenty-three minutes as
// a floor, which the owner ruled is two sittings rather than too long -- and nothing marked where
// one sitting ends. A night already falls once or twice a map (`DAY_OF_WALKING_MS` in
// `game/fatigue.ts` is sized for exactly that), so the night is the place. Cozy games end the day
// on a page: Stardew Valley's evening tally, Spiritfarer's bed, A Short Hike's campfire. **Unlike
// Stardew there is no house to go back to** -- the owner's point -- so the page comes with *any*
// night, under a roof, at a camp or on the bare bedroll, and never says home.
//
// What the page says is the difference between two readings of what the traveller knows: one
// taken when the day began, one now. Nothing new is saved for it -- the reading at the day's start
// is kept in memory, so a reload in the middle of a day starts the page from the reload. That is
// the honest cost of no `KNOWLEDGE_VERSION` bump, and it is small: the page is a recap, and the
// diary holds everything.
//
// Pure, and free of React and Phaser. App takes the readings; the night's card draws the page.

import type { Progress } from '../journey';
import type { Collection } from './collection';
import type { Wanting } from './goals';
import type { Guide } from './guide';
import { agreed, homesteadOn, nextStage, stateOf } from './homestead';
import { fieldMap } from './places';
import { discovery, fieldQuestion, word } from './knowledge';
import { recipe } from './making';
import { metSpecies } from './species';

/** What the traveller knows, as the page reads it. */
export interface DayKnowledge {
  progress: Progress;
  collection: Collection;
  /** The journey's flags: where settling is kept. */
  flags: readonly string[];
  /** Strangers met on the road, by key. */
  met: readonly string[];
}

/** One reading of it, taken when a day begins. */
export interface DayReading {
  rungs: Record<string, number>;
  words: string[];
  recipes: string[];
  made: string[];
  answered: string[];
  questions: string[];
  species: string[];
  flags: string[];
  met: string[];
}

export function readingOf(k: DayKnowledge): DayReading {
  return {
    rungs: { ...k.progress.rungs },
    words: [...k.progress.words],
    recipes: [...k.progress.recipes],
    made: [...k.progress.made],
    answered: Object.keys(k.progress.answered),
    questions: [...k.progress.questions],
    species: Object.keys(k.collection),
    flags: [...k.flags],
    met: [...k.met]
  };
}

/** What kind of thing a line is about, for ordering and for a test to ask by. */
export type DayKind = 'built' | 'agreed' | 'settled' | 'answered' | 'entry' | 'word' | 'taught' | 'made' | 'species' | 'stranger' | 'question';

export interface DayLine {
  kind: DayKind;
  text: string;
}

/** The page a night closes on: what the day added, and one line for tomorrow. */
export interface DayPage {
  lines: DayLine[];
  tomorrow: string | null;
}

/** The order the page reads in: what changed the map first, what was only noticed last. */
const ORDER: readonly DayKind[] = ['settled', 'built', 'agreed', 'answered', 'entry', 'word', 'taught', 'made', 'species', 'stranger', 'question'];

/** "a", "a and b", "a, b and c", "a, b, c and 2 more". */
export function listOf(names: readonly string[], most = 3): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  const shown = names.slice(0, most);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(', ')} and ${rest} more`;
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

const fresh = <T>(now: readonly T[], before: readonly T[]): T[] => now.filter((x) => !before.includes(x));

/**
 * What today added, in the order the page reads it. Empty for a day that added nothing, which is a
 * real day -- the page says so rather than inventing something.
 */
export function dayLines(before: DayReading, now: DayKnowledge): DayLine[] {
  const after = readingOf(now);
  const lines: DayLine[] = [];

  // Settling, read from the flags `homestead.ts` keeps: `homestead:<map>:<kind>:<id>`.
  for (const flag of fresh(after.flags, before.flags)) {
    const [head, mapId, kind, id] = flag.split(':');
    if (head !== 'homestead' || !mapId) continue;
    const home = homesteadOn(mapId);
    if (!home) continue;
    if (kind === 'built' && id) {
      const stage = home.stages.find((s) => s.id === id);
      if (stage) lines.push({ kind: 'built', text: `${stage.name} went up.` });
    } else if (kind === 'ground' && id) {
      const ground = home.grounds.find((g) => g.id === id);
      lines.push({ kind: 'agreed', text: `The ground was agreed${ground ? `: ${ground.name}` : ''}.` });
    } else if (kind === 'settled') {
      lines.push({ kind: 'settled', text: `${home.name} is settled.` });
    }
  }

  const answered = fresh(after.answered, before.answered)
    .map((id) => fieldQuestion(id)?.question)
    .filter((q): q is string => Boolean(q));
  for (const q of answered) lines.push({ kind: 'answered', text: `You settled a question: ${q}` });

  const grew = Object.keys(after.rungs)
    .filter((id) => (after.rungs[id] ?? -1) > (before.rungs[id] ?? -1))
    .map((id) => discovery(id)?.name)
    .filter((n): n is string => Boolean(n));
  if (grew.length === 1) lines.push({ kind: 'entry', text: `${grew[0]}: the entry grew.` });
  else if (grew.length > 1) lines.push({ kind: 'entry', text: `${grew.length} entries grew: ${listOf(grew)}.` });

  const words = fresh(after.words, before.words)
    .map((id) => word(id))
    .filter((w): w is NonNullable<ReturnType<typeof word>> => w !== null);
  for (const w of words) lines.push({ kind: 'word', text: `You learned the word ${w.word}: ${w.gloss}.` });

  const taught = fresh(after.recipes, before.recipes)
    .map((id) => recipe(id)?.name)
    .filter((n): n is string => Boolean(n));
  if (taught.length > 0) lines.push({ kind: 'taught', text: `Somebody showed you how to make ${listOf(taught.map((n) => n.toLowerCase()))}.` });

  const made = fresh(after.made, before.made)
    .map((id) => recipe(id)?.name)
    .filter((n): n is string => Boolean(n));
  if (made.length > 0) lines.push({ kind: 'made', text: `You made ${listOf(made.map((n) => n.toLowerCase()))} for the first time.` });

  const species = fresh(after.species, before.species)
    .map((id) => metSpecies(id)?.name)
    .filter((n): n is string => Boolean(n));
  if (species.length === 1) lines.push({ kind: 'species', text: `You met the ${species[0]!.toLowerCase()}.` });
  else if (species.length > 1)
    lines.push({ kind: 'species', text: `You met ${species.length} living things new to you: ${listOf(species.map((n) => n.toLowerCase()))}.` });

  const strangers = fresh(after.met, before.met).length;
  if (strangers > 0) lines.push({ kind: 'stranger', text: strangers === 1 ? 'You fell in with a stranger on the road.' : `You fell in with ${strangers} strangers on the road.` });

  const asked = fresh(after.questions, before.questions)
    .filter((id) => !after.answered.includes(id))
    .map((id) => fieldQuestion(id)?.question)
    .filter((q): q is string => Boolean(q));
  for (const q of asked) lines.push({ kind: 'question', text: `A question to settle: ${q}` });

  return lines.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/**
 * One line for tomorrow: what is pinned and what it still wants, or else the next step.
 *
 * The same two answers the dock already gives -- `goals.wanting` and `guide.nextStep` -- so the
 * night's page and the dock cannot disagree about what is next.
 */
export function tomorrowLine(pinned: Wanting | null, guide: Guide | null): string | null {
  if (pinned) {
    if (pinned.wants.length === 0) return `${pinned.name}: ${pinned.other[0] ?? 'nothing left to gather'}.`;
    return `${pinned.name}: ${pinned.wants.map((w) => w.label).join(', ')}.`;
  }
  return guide?.line ?? null;
}

/** What the diary holds, said in a breath: "14 entries begun and 3 words". */
export function diaryHolds(progress: Progress): string | null {
  const entries = Object.keys(progress.rungs).filter((id) => (progress.rungs[id] ?? -1) >= 0 && discovery(id)).length;
  const words = progress.words.length;
  const parts = [
    entries > 0 ? `${entries} ${entries === 1 ? 'entry' : 'entries'} begun` : null,
    words > 0 ? `${words} ${words === 1 ? 'word' : 'words'}` : null
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? `Your diary holds ${parts.join(' and ')}.` : null;
}

/**
 * Where you left off, said at the front door before "Go on walking".
 *
 * **There is no house to come back to**, so a returning player needs telling where they are rather
 * than being shown it: which map, what they were working towards, and how much the diary holds.
 * Three short lines, from what the save already holds -- the pin, the homestead's flags, progress.
 * The pin wins over the next building stage, as it does in the dock.
 */
export function leftOffLines(f: {
  fieldMapId: string;
  pinned: Wanting | null;
  flags: readonly string[];
  progress: Progress;
}): string[] {
  const lines: string[] = [];
  const map = fieldMap(f.fieldMapId);
  if (map) lines.push(`You were on ${map.name.replace(/^The /, 'the ')}.`);
  let towards = tomorrowLine(f.pinned, null);
  if (!towards) {
    const home = homesteadOn(f.fieldMapId);
    const state = stateOf(f.fieldMapId, f.flags);
    const ground = home?.grounds.find((g) => g.id === state.ground);
    const stage = home && ground && agreed(ground, state) && !state.settled ? nextStage(home, state) : null;
    if (stage) towards = `Next: ${stage.name.toLowerCase()}.`;
  }
  if (towards) lines.push(towards);
  const holds = diaryHolds(f.progress);
  if (holds) lines.push(holds);
  return lines;
}
