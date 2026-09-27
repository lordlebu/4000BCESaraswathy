// How long a map takes to play, estimated from what is on it.
//
// **The endgame plan sets a target of ten to fifteen minutes a map, and nobody had measured one.**
// This is the instrument, not the target: it walks a tour of every place on the map along the
// routes travellers take, at the scene's step time and each tile's travel cost, and adds the time
// to read everything the map's places, people and discoveries say, plus a moment for each press.
//
// It is a floor rather than a forecast. Nobody walks a perfect tour, a rung that wants night or rain
// sends a player back, and the time spent deciding what to do next is not counted at all. What it is
// good for is comparing maps with each other and a map with itself after a change -- which is what
// "is Lothal still about fifteen minutes" needs.
//
// CI runs it small, and checks only that the instrument reads sanely. `npm run simulate` runs it
// larger and prints the report beside the event layer's.

import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import type { Point, World } from '../src/world/types';
import { fieldMaps, npcsAt, poi } from '../src/content/places';
import { discovery, offeredAt } from '../src/content/knowledge';
import { travelCost } from '../src/content/species';
import { wayBetween } from '../src/content/travellers';
import { beats } from '../src/content/conversation';

const SEEDS = Number(process.env.MINUTES_SEEDS ?? 2);

/**
 * The scene's step, in milliseconds on plain ground. `WorldScene.ts` holds the real one and cannot
 * be imported under Node, so this is a copy, and the note beside that constant says so.
 */
const STEP_MS = 425;
/** Words a minute. About what a player reads game text at, which is slower than prose on a page. */
const READING_WPM = 200;
/** A press, and the moment of deciding to make it: a look closer, a "go on", a choice. */
const PRESS_SECONDS = 1.5;

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Milliseconds to walk a way, tile by tile, at each tile's cost. */
function walkMs(world: World, way: readonly Point[]): number {
  let ms = 0;
  for (const p of way.slice(1)) {
    const tile = world.tiles[p.y]?.[p.x];
    ms += STEP_MS * (tile ? (travelCost(tile.biome) ?? 1) : 1);
  }
  return ms;
}

interface Estimate {
  places: number;
  people: number;
  rungs: number;
  words: number;
  walk: number;
  read: number;
  press: number;
}

/** One map on one seed: a nearest-first tour from the start, and everything on it read once. */
function estimate(mapId: string, seed: string): Estimate {
  const map = fieldMaps.find((m) => m.id === mapId)!;
  const built = buildFieldMap(map, { seed });
  const { world } = built;

  let walk = 0;
  let from = world.start;
  const left = [...built.placed];
  while (left.length > 0) {
    let best = 0;
    let bestMs = Infinity;
    left.forEach((p, i) => {
      const ms = walkMs(world, wayBetween(world, from, p.at));
      if (ms < bestMs) {
        bestMs = ms;
        best = i;
      }
    });
    walk += Number.isFinite(bestMs) ? bestMs : 0;
    from = left[best]!.at;
    left.splice(best, 1);
  }

  let text = 0;
  let presses = 0;
  let rungs = 0;
  const people = new Set<string>();
  // A discovery found at two places is climbed once.
  const looked = new Set<string>();
  for (const poiId of map.pointsOfInterest) {
    const place = poi(poiId);
    if (!place) continue;
    text += words(place.arrival);
    for (const id of offeredAt(place.id, place.discoveries)) {
      if (looked.has(id)) continue;
      looked.add(id);
      for (const rung of discovery(id)?.rungs ?? []) {
        rungs += 1;
        presses += 1;
        text += words(rung.entry);
      }
    }
    for (const person of npcsAt(poiId)) {
      if (people.has(person.id)) continue;
      people.add(person.id);
      presses += 1; // choosing them from the list
      for (const line of person.lines) {
        text += words(line.text);
        presses += beats(line.text).length;
      }
    }
  }

  return {
    places: map.pointsOfInterest.length,
    people: people.size,
    rungs,
    words: text,
    walk: walk / 60_000,
    read: text / READING_WPM,
    press: (presses * PRESS_SECONDS) / 60
  };
}

/** The mean over seeds, since where places land moves the walk. */
function measured(): Map<string, Estimate> {
  const out = new Map<string, Estimate>();
  for (const map of fieldMaps) {
    const runs = Array.from({ length: SEEDS }, (_, s) => estimate(map.id, `minutes-${s}`));
    const mean = (k: keyof Estimate) => runs.reduce((sum, r) => sum + r[k], 0) / runs.length;
    out.set(map.id, {
      places: mean('places'),
      people: mean('people'),
      rungs: mean('rungs'),
      words: mean('words'),
      walk: mean('walk'),
      read: mean('read'),
      press: mean('press')
    });
  }
  return out;
}

function report(all: Map<string, Estimate>): string {
  const rows = [...all].map(([id, e]) => {
    const total = e.walk + e.read + e.press;
    return `| ${id.replace('field_map_', '')} | ${e.places} | ${e.people} | ${e.rungs} | ${Math.round(e.words)} | ${e.walk.toFixed(1)} | ${e.read.toFixed(1)} | ${e.press.toFixed(1)} | **${total.toFixed(1)}** |`;
  });
  return [
    `## Minutes per map (a floor, over ${SEEDS} seed${SEEDS === 1 ? '' : 's'})`,
    '',
    `A nearest-first tour of every place at ${STEP_MS} ms a step times each tile's cost, every word read at ${READING_WPM} a minute, ${PRESS_SECONDS} s a press. Target: 10 to 15.`,
    '',
    '| map | places | people | rungs | words | walk | read | press | total |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows,
    ''
  ].join('\n');
}

describe('how long a map takes', () => {
  const all = measured();
  if (process.env.MINUTES_OUT) writeFileSync(process.env.MINUTES_OUT, report(all));

  it('reads every map as something that takes minutes, not seconds or hours', () => {
    // A sanity band on the instrument, not the target. Outside it, the estimate is broken -- a
    // tour that walked nowhere, or a map whose words were not found -- rather than the map too long.
    for (const [id, e] of all) {
      const total = e.walk + e.read + e.press;
      expect(e.walk, `${id}: the tour walked nowhere`).toBeGreaterThan(0.2);
      expect(e.words, `${id}: nothing on the map was read`).toBeGreaterThan(200);
      expect(total, `${id}: ${total.toFixed(1)} minutes`).toBeGreaterThan(2);
      expect(total, `${id}: ${total.toFixed(1)} minutes`).toBeLessThan(120);
    }
  });
});
