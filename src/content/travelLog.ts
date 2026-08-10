// The travel log: what the player takes away.
//
// A cozy game with no win condition needs *something* at the end of a session, and this is it —
// a written record of where you went, what you saw, and what the place was called. It is the
// natural end of a journey and the thing that gets shared.
//
// Pure: builds a structure and renders it to text. No DOM, no canvas, no download — `ui/export.ts`
// owns all of that, so this stays testable under plain Node.

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
  observed: string[];
  reachedLandmark: boolean;
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

  const sketches: string[] = journey.observed.length
    ? journey.observed.map((name) => `— ${name}`)
    : ['Nothing sketched. The satchel came home empty, which happens.'];

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
        heading: `Field sketches (${count(journey.observed.length)} ${plural(
          journey.observed.length,
          'creature',
          'creatures'
        )})`,
        lines: sketches
      },
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
