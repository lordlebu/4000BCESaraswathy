// Hundreds of days of road, walked headless, to see what the event layer actually does.
//
// **Unit tests prove the rules; this measures the rhythm.** Whether a player meets something every
// other day or every fifth, whether one kind crowds out the rest, whether a chain ever completes --
// none of that is a property of one template, and all of it is a property of the pacer, the
// weights, the cooldowns and the maps together. So this walks seeded journeys over the real maps,
// through the real `happeningNow`, and keeps count.
//
// It asserts only what is a rule (nothing once-only comes round twice, nothing recurs inside its
// wait) and bands that were **measured first and then set around what was measured**, per
// `docs/testing.md`. `npm run simulate` runs it larger and prints the full report.

import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { isWalkable } from '../src/world/generate';
import { tileHash } from '../src/world/rng';
import type { Point } from '../src/world/types';
import { type Circumstance, type GameEvent, type Occasion } from '../src/content/events';
import { TEMPLATES, TEXT, happeningNow, kindOf, surroundingsAt } from '../src/content/happenings';
import { fieldMap, fieldMaps } from '../src/content/places';

const JOURNEYS_PER_MAP = Number(process.env.SIM_JOURNEYS ?? 6);
const DAYS = Number(process.env.SIM_DAYS ?? 40);
const TAKES_PER_DAY = 3;
const SHELTERS = ['bedroll', 'tent', 'camp', 'roof', 'settlement', 'palace'];
const WEATHER: [string, number][] = [['clear', 60], ['mist', 15], ['rain', 20], ['storm', 5]];

interface Tally {
  days: number;
  byOccasion: Record<Occasion, number>;
  byKind: Record<string, number>;
  eventDays: number;
  quietestRun: number;
  materials: number;
  recognised: number;
  chains: number;
  repeats: number;
  violations: string[];
}

function simulate(): Tally {
  const tally: Tally = {
    days: 0,
    byOccasion: { road: 0, night: 0, arriving: 0, working: 0 },
    byKind: {},
    eventDays: 0,
    quietestRun: 0,
    materials: 0,
    recognised: 0,
    chains: 0,
    repeats: 0,
    violations: []
  };

  for (const map of fieldMaps) {
    for (let j = 0; j < JOURNEYS_PER_MAP; j += 1) {
      const seed = `sim-${map.id}-${j}`;
      const built = buildFieldMap(fieldMap(map.id)!, { seed });
      const { world } = built;
      const land: Point[] = [];
      for (let y = 0; y < world.height; y += 2) {
        for (let x = 0; x < world.width; x += 2) if (isWalkable(world.tiles[y]![x]!)) land.push({ x, y });
      }
      const h = (salt: string) => tileHash(seed, 0, 0, salt);
      const tileFor = (salt: string) => land[h(salt) % land.length]!;
      const weather = (salt: string) => {
        let n = h(salt) % 100;
        for (const [w, share] of WEATHER) if ((n -= share) < 0) return w;
        return 'clear';
      };

      let seen: string[] = [];
      let last: Record<string, number> = {};
      let met: string[] = [];
      let flags: string[] = [];
      let quiet = 0;

      const ask = (occasion: Occasion, day: number, at: Point, salt: string, extra: {
        shelter?: string | null;
        poiId?: string | null;
        timeOfDay: string;
      }): GameEvent | null => {
        const roll = (s: string) => tileHash(seed, at.x, at.y, `${salt}:${s}`);
        const now: Circumstance = {
          occasion,
          shelter: extra.shelter ?? null,
          fieldMapId: map.id,
          day,
          holds: [],
          seen,
          met,
          last,
          flags
        };
        const moment = { timeOfDay: extra.timeOfDay, weather: weather(`w:${day}`) };
        const around = surroundingsAt(world, at, map.id, moment, roll, { poiId: extra.poiId ?? null });
        const event = happeningNow(now, roll, around, []);
        if (!event) return null;

        // The rules, checked as the journey goes rather than trusted.
        const kind = kindOf(event.id)!;
        const words = TEXT[kind]!;
        if (last[event.id] !== undefined) {
          tally.repeats += 1;
          if (words.again_after === null) tally.violations.push(`${event.id} came round twice`);
          else if (day - last[event.id]! < words.again_after) {
            tally.violations.push(`${event.id} came back after ${day - last[event.id]!} days`);
          }
        }

        // A player who chooses: by hash, so both branches of every card get walked.
        const choice = event.choices[roll('choose') % event.choices.length]!;
        if (!seen.includes(event.id)) seen = [...seen, event.id];
        last = { ...last, [event.id]: day };
        flags = [...new Set([...flags, ...(choice.sets ?? [])])];
        if (event.stranger && !met.includes(event.stranger.id)) met = [...met, event.stranger.id];
        tally.byOccasion[occasion] += 1;
        tally.byKind[kind] = (tally.byKind[kind] ?? 0) + 1;
        tally.materials += (choice.gives ?? []).reduce((n, g) => n + g.n, 0);
        if (kind === 'company-again') tally.recognised += 1;
        if (kind === 'kindness-returned') tally.chains += 1;
        return event;
      };

      for (let day = 0; day < DAYS; day += 1) {
        let any = false;
        const morning = h(`tod:${day}`) % 2 ? 'morning' : 'afternoon';
        if (ask('road', day, tileFor(`road:${day}`), `road:${day}`, { timeOfDay: morning })) any = true;
        const arrival = built.placed[day];
        if (arrival && ask('arriving', day, arrival.at, `arriving:${arrival.poi.id}`, { poiId: arrival.poi.id, timeOfDay: morning })) {
          any = true;
        }
        for (let t = 0; t < TAKES_PER_DAY; t += 1) {
          if (ask('working', day, tileFor(`take:${day}:${t}`), `working:${day}:${t}`, { timeOfDay: morning })) any = true;
        }
        const shelter = SHELTERS[h(`shelter:${day}`) % SHELTERS.length]!;
        if (ask('night', day, tileFor(`night:${day}`), `night:${day}`, { shelter, timeOfDay: 'night' })) any = true;

        tally.days += 1;
        if (any) {
          tally.eventDays += 1;
          quiet = 0;
        } else {
          quiet += 1;
          tally.quietestRun = Math.max(tally.quietestRun, quiet);
        }
      }
    }
  }
  return tally;
}

function report(t: Tally): string {
  const total = Object.values(t.byOccasion).reduce((a, b) => a + b, 0);
  const per = (n: number) => (n / t.days).toFixed(2);
  const kinds = Object.values(TEMPLATES).flat().map((x) => x.kind);
  const lines = [
    `# Event simulation`,
    ``,
    `${fieldMaps.length} maps x ${JOURNEYS_PER_MAP} journeys x ${DAYS} days = ${t.days} days of road.`,
    ``,
    `| measure | value |`,
    `|---|---|`,
    `| woven events per day | ${per(total)} |`,
    `| days with at least one event | ${((t.eventDays / t.days) * 100).toFixed(0)}% |`,
    `| longest run of quiet days | ${t.quietestRun} |`,
    `| road / night / arriving / working per day | ${per(t.byOccasion.road)} / ${per(t.byOccasion.night)} / ${per(t.byOccasion.arriving)} / ${per(t.byOccasion.working)} |`,
    `| materials given per 30 days | ${((t.materials / t.days) * 30).toFixed(1)} |`,
    `| strangers recognised | ${t.recognised} |`,
    `| kindnesses returned | ${t.chains} |`,
    `| repeats of the same event | ${t.repeats} |`,
    `| rule violations | ${t.violations.length} |`,
    ``,
    `| kind | events | share |`,
    `|---|---|---|`,
    ...kinds.map((k) => `| ${k} | ${t.byKind[k] ?? 0} | ${(((t.byKind[k] ?? 0) / total) * 100).toFixed(1)}% |`)
  ];
  return lines.join('\n') + '\n';
}

describe('a simulated road', () => {
  const tally = simulate();
  const total = Object.values(tally.byOccasion).reduce((a, b) => a + b, 0);
  if (process.env.SIM_OUT) writeFileSync(process.env.SIM_OUT, report(tally));

  it('breaks no storylet rule, however long the walk', () => {
    expect(tally.violations).toEqual([]);
  });

  it('has something happen on most days, and never goes quiet for long', () => {
    // Measured before these were set: 0.81 a day at 6 journeys a map over 40 days, 0.76 at 25 over
    // 60; the longest quiet run 4 both times; the largest kind 21-22%. See docs/testing.md on
    // choosing a threshold. The bands sit well outside what was measured, so they fail on a
    // change of rhythm rather than on noise.
    expect(total / tally.days, 'events per day').toBeGreaterThan(0.5);
    expect(total / tally.days, 'events per day').toBeLessThan(1.1);
    expect(tally.quietestRun, 'the longest run of days with nothing').toBeLessThanOrEqual(7);
  });

  it('lets no one kind crowd out the rest', () => {
    for (const [kind, n] of Object.entries(tally.byKind)) {
      expect(n / total, `${kind} is ${((n / total) * 100).toFixed(0)}% of everything`).toBeLessThan(0.3);
    }
  });

  it('reaches the second meeting and the returned kindness in ordinary play', () => {
    expect(tally.recognised, 'nobody was ever recognised').toBeGreaterThan(0);
    expect(tally.chains, 'no kindness was ever returned').toBeGreaterThan(0);
  });
});
