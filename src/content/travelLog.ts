// The travel log: what the player takes away.
//
// A cozy game with no win condition needs *something* at the end of a session, and this is it —
// a written record of where you went, what you saw, and what the place was called. It is the
// natural end of a journey and the thing that gets shared.
//
// Pure: builds a structure and renders it to text. No DOM, no canvas, no download — `ui/export.ts`
// owns all of that, so this stays testable under plain Node.

import { isComplete, languagesKnown, restored, type Progress } from '../journey';
import { discoveries, fieldQuestion, vocabulary } from './knowledge';
import { poi } from './places';
import { type Collection, everythingMet } from './collection';
import { metSpecies } from './species';
import { landmarkTitle, landmarkKindFor } from './landmarks';
import type { World } from '../world/types';

export interface LogSection {
  heading: string;
  lines: string[];
}

export interface TravelLog {
  title: string;
  subtitle: string;
  sections: LogSection[];
  /** A link that regenerates this exact world. The seed is the whole save file. */
  replayUrl: string;
}

export interface JourneyState {
  discovered: number;
  /**
   * The flora and fauna met, keyed by species id.
   *
   * Was an array of creature names appended by a button. The log renders names because it is
   * prose, so it resolves each id through `metSpecies` -- which is exactly why the record is
   * keyed by id and not by the name it happens to print today.
   */
  collection: Collection;
  reachedLandmark: boolean;
  /**
   * What the player came to understand.
   *
   * The log used to record tiles walked, creatures sketched and whether the landmark was
   * found — the whole of the old game. A player could climb eighteen ladders, learn two
   * languages, settle a question and put a field back, and the keepsake would still read
   * "the satchel came home empty". Optional so a caller with nothing to say can omit it.
   */
  progress?: Progress;
}

/**
 * The sections the diary earns, in the order a naturalist would keep them.
 *
 * Every one is omitted when empty rather than printed hollow. A record someone shows other
 * people should not list the headings of things that did not happen — the same rule the diary
 * itself follows on screen.
 *
 * Exported, because the Progress surface renders exactly this and the export writes exactly
 * this. They were two compositions over one `Progress`: this function built the keepsake while
 * `Diary.tsx` built the screen, and the pair had already drifted -- the same four things,
 * grouped and headed differently, with nothing keeping them honest. One builder means the page
 * a player reads and the page they keep cannot disagree.
 */
export function diarySections(progress: Progress | undefined): LogSection[] {
  if (!progress) return [];
  const out: LogSection[] = [];

  const understood = discoveries.filter((d) => isComplete(progress, d.id));
  if (understood.length) {
    out.push({
      heading: `Understood (${count(understood.length)} ${plural(understood.length, 'thing', 'things')})`,
      lines: understood.map((d) => `— ${d.name}`)
    });
  }

  // What the player concluded, never whether it was right. The game does not grade a reading
  // on screen and must not do it in the thing they hand to someone else.
  const settled = Object.entries(progress.answered)
    .map(([id, index]) => {
      const q = fieldQuestion(id);
      return q ? `— ${q.question.split(/(?<=[.?])\s/)[0]} ${q.resolutions[index]?.conclusion ?? ''}` : null;
    })
    .filter((line): line is string => line !== null);
  if (settled.length) out.push({ heading: 'Questions settled', lines: settled });

  const languages = languagesKnown(progress);
  if (Object.keys(languages).length) {
    out.push({
      heading: 'Words',
      lines: vocabulary
        .filter((w) => progress.words.includes(w.id))
        .map((w) => `— ${w.word} (${w.language}): ${w.gloss}`)
    });
  }

  const put = restored(progress);
  if (put.length) {
    out.push({
      heading: 'Put back',
      lines: put.map((id) => `— ${poi(id)?.name ?? id}`)
    });
  }

  return out;
}

/** "three" reads better than "3" in a sentence, up to the point where it stops being worth it. */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
function count(n: number): string {
  return n < WORDS.length ? WORDS[n]! : String(n);
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function buildTravelLog(world: World, journey: JourneyState, origin = ''): TravelLog {
  const kind = landmarkKindFor(world.landmark, world.seed);
  const from = world.settlement?.name ?? 'a camp with no name';
  const total = world.width * world.height;

  const route: string[] = [
    `Set out from ${from}.`,
    `Walked ${journey.discovered} of ${total} places — about ${Math.round(
      (journey.discovered / total) * 100
    )} percent of the country.`
  ];
  if (world.rivers.length) {
    // Deliberately "runs through" rather than "crossed": this lists every river in the world, and
    // the player may never have gone near one of them. The log is a record someone shows other
    // people, so it does not get to claim things that did not happen.
    const named = world.rivers.map((r) => r.name);
    const last = named.pop()!;
    route.push(
      named.length
        ? `Water runs through this country: ${named.join(', ')}, and ${last}.`
        : `One river runs through this country: ${last}.`
    );
  }

  const found = everythingMet(journey.collection);
  const seen: string[] = found.length
    ? found.map((m) => `— ${metSpecies(m.id)?.name ?? m.id}`)
    : ['Nothing met. The satchel came home empty, which happens.'];

  const ending: string[] = journey.reachedLandmark
    ? [`${landmarkTitle(world.landmark, world.seed)}.`, '', kind.arrival]
    : [
        `${world.landmark.name} was never found. It is still out there, ${bearing(world)} of ${from}.`,
        'The seed below will put it back exactly where it was.'
      ];

  return {
    title: 'South of Tethys — Travel Journal',
    subtitle: `A journey through Jambhudweepa, on the seed "${world.seed}".`,
    sections: [
      { heading: 'The route', lines: route },
      {
        heading: `Met along the way (${count(found.length)} ${plural(
          found.length,
          'species',
          'species'
        )})`,
        lines: seen
      },
      ...diarySections(journey.progress),
      { heading: journey.reachedLandmark ? 'The place itself' : 'Unfinished', lines: ending }
    ],
    replayUrl: `${origin}?seed=${encodeURIComponent(world.seed)}`
  };
}

function bearing(world: World): string {
  const from = world.settlement ?? world.start;
  const dx = world.landmark.x - from.x;
  const dy = world.landmark.y - from.y;
  const parts: string[] = [];
  if (Math.abs(dy) > Math.abs(dx) / 2) parts.push(dy > 0 ? 'south' : 'north');
  if (Math.abs(dx) > Math.abs(dy) / 2) parts.push(dx > 0 ? 'east' : 'west');
  return parts.join('-') || 'somewhere out';
}

/** Markdown, because it reads fine as plain text and pastes well anywhere. */
export function travelLogToText(log: TravelLog): string {
  const out: string[] = [`# ${log.title}`, '', log.subtitle, ''];
  for (const section of log.sections) {
    out.push(`## ${section.heading}`, '');
    out.push(...section.lines, '');
  }
  out.push('---', `Walk it yourself: ${log.replayUrl}`);
  return out.join('\n');
}

/** A filename that sorts sensibly and does not need quoting. */
export function travelLogFilename(world: World, extension: string): string {
  const slug = world.seed.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `south-of-tethys-${slug || 'journey'}.${extension}`;
}
