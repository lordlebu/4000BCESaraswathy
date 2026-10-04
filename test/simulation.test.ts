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
//
// **Two kinds of event, counted apart** (4 October 2026). Most are *rationed*: the road, a night, an
// arrival and work each ask once, and the pacer decides. Seven are *asked for*: walking up to a camp,
// its fire, talking with somebody, a rumour kept, the Sinauli wagon passing. Those come from doing
// something, so the simulated traveller now does them -- walks up to a standing camp and sleeps two
// nights beside it, talks with its people, makes small talk every other day, goes where a rumour sent
// it, and on North Dwarka passes the wagon once -- and the report lists them in a table of their own
// rather than as a column of zeros. The day's road moment is asked where a day's first step falls:
// on a road or beside a place, not on any land at all.

import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { isWalkable } from '../src/world/generate';
import { tileHash } from '../src/world/rng';
import type { Point } from '../src/world/types';
import { type Circumstance, type GameEvent, type Occasion } from '../src/content/events';
import { TEMPLATES, TEXT, happeningNow, kindOf, surroundingsAt, type CampTalk, type Talk } from '../src/content/happenings';
import { fieldMap, fieldMaps, npcsAt } from '../src/content/places';
import { encampmentOn, type Encampment } from '../src/content/encampments';
import { campPeople, doingLine } from '../src/content/campLife';
import { rumourAt, rumoursOn } from '../src/content/rumours';
import { PASSING_AFTER_STEPS } from '../src/content/tiers';

const JOURNEYS_PER_MAP = Number(process.env.SIM_JOURNEYS ?? 6);
const DAYS = Number(process.env.SIM_DAYS ?? 40);
const TAKES_PER_DAY = 3;
const SHELTERS = ['bedroll', 'tent', 'camp', 'roof', 'settlement', 'palace'];
const WEATHER: [string, number][] = [['clear', 60], ['mist', 15], ['rain', 20], ['storm', 5]];

/**
 * The kinds that come from doing something rather than from the pacer. Every kind the road never
 * rations (weight nought) must be here, which `the asked-for kinds are named` holds.
 */
const ASKED = ['camp', 'camp-talk', 'small-talk', 'rumour-kept', 'fireside', 'fireside-visitor', 'passing'];

/** How a day's first step is distributed: on a road, or beside where the traveller slept. */
const BESIDE_A_PLACE = 2;

interface Tally {
  days: number;
  /** Asked-for events, by kind: met by doing something. Counted apart from the rationed rhythm. */
  asked: Record<string, number>;
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
    asked: {},
    byOccasion: { road: 0, night: 0, arriving: 0, working: 0, journey: 0 },
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
      // Where a day's first step falls: on a road, or within a couple of tiles of a place -- where the
      // traveller slept. Falls back to any land on a map with neither, which no map has.
      const walked: Point[] = [];
      for (let y = 0; y < world.height; y += 1) {
        for (let x = 0; x < world.width; x += 1) {
          const t = world.tiles[y]![x]!;
          if (!isWalkable(t)) continue;
          const near = built.placed.some((p) => Math.max(Math.abs(p.at.x - x), Math.abs(p.at.y - y)) <= BESIDE_A_PLACE);
          if (t.road || near) walked.push({ x, y });
        }
      }
      const stepFor = (salt: string) => (walked.length > 0 ? walked[h(salt) % walked.length]! : tileFor(salt));
      const places = built.placed.map((p) => ({ poiId: p.poi.id, at: p.at }));
      const rumours = rumoursOn(map.id, {
        reached: () => false,
        knowsQuestion: () => false,
        hasNews: () => true,
        whereIs: (id) => (npcsAt(map.pointsOfInterest[0]!).some((n) => n.id === id) ? map.pointsOfInterest[0]! : null),
        flags: []
      });
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
      /** Rumours already followed, by their `told:` flag, so each sends the traveller once. */
      const followed = new Set<string>();
      /** Where a rumour sent the traveller, to arrive at the next day instead of the next place in order. */
      let sentTo: string | null = null;

      const ask = (occasion: Occasion, day: number, at: Point, salt: string, extra: {
        shelter?: string | null;
        poiId?: string | null;
        timeOfDay: string;
        camp?: Encampment | null;
        campStanding?: string | null;
        campPerson?: CampTalk | null;
        talk?: Talk | null;
        passing?: { id: string; vehicle: string } | null;
        force?: { kind?: string; asked?: boolean } | null;
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
          flags,
          poiId: extra.poiId ?? null,
          campKind: extra.camp?.kind ?? null
        };
        const moment = { timeOfDay: extra.timeOfDay, weather: weather(`w:${day}`) };
        const around = surroundingsAt(world, at, map.id, moment, roll, {
          poiId: extra.poiId ?? null,
          camp: extra.camp ?? null,
          campStanding: extra.campStanding ?? null,
          campPerson: extra.campPerson ?? null,
          talk: extra.talk ?? null,
          passing: extra.passing ?? null
        });
        const event = happeningNow(now, roll, around, [], extra.force ?? null);
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
        if (ASKED.includes(kind)) tally.asked[kind] = (tally.asked[kind] ?? 0) + 1;
        else {
          tally.byOccasion[occasion] += 1;
          tally.byKind[kind] = (tally.byKind[kind] ?? 0) + 1;
        }
        tally.materials += (choice.gives ?? []).reduce((n, g) => n + g.n, 0);
        if (kind === 'company-again') tally.recognised += 1;
        if (kind === 'kindness-returned') tally.chains += 1;
        return event;
      };

      for (let day = 0; day < DAYS; day += 1) {
        let any = false;
        const morning = h(`tod:${day}`) % 2 ? 'morning' : 'afternoon';
        if (ask('road', day, stepFor(`road:${day}`), `road:${day}`, { timeOfDay: morning })) any = true;
        const arrival = (sentTo ? built.placed.find((p) => p.poi.id === sentTo) : null) ?? built.placed[day];
        sentTo = null;
        const standing = encampmentOn(world, map.id, places, day);
        if (arrival) {
          // A place a stranger sent you to keeps the promise first, unrationed, as `App` asks it.
          const kept =
            rumourAt(arrival.poi.id, flags) &&
            ask('arriving', day, arrival.at, `rumour:${arrival.poi.id}`, {
              poiId: arrival.poi.id,
              campStanding: standing?.id ?? null,
              timeOfDay: morning,
              force: { kind: 'rumour-kept', asked: true }
            });
          if (kept) any = true;
          else if (ask('arriving', day, arrival.at, `arriving:${arrival.poi.id}`, { poiId: arrival.poi.id, timeOfDay: morning })) any = true;
        }

        // **What a traveller goes and does.** Asked for, never rationed -- the same force `App` uses.
        // Small talk every other day, with whatever rumour is going.
        if (day % 2 === 1) {
          const talk: Talk = { standing: 'stranger', warm: day % 4 === 1, rumour: rumours[(day >> 1) % Math.max(1, rumours.length)] ?? null };
          const at = stepFor(`talk:${day}`);
          if (ask('road', day, at, `small-talk:${day}`, { timeOfDay: morning, talk, force: { kind: 'small-talk', asked: true } })) any = true;
        }
        // Asking about a rumour leaves a `told:` flag naming where it points; go there tomorrow.
        const told = flags.find((f) => f.startsWith('told:') && !followed.has(f));
        if (told) {
          followed.add(told);
          sentTo = told.slice('told:'.length).split('@')[1] ?? null;
        }
        // A camp standing today is walked up to on its first day, talked at, and slept beside twice.
        let campNight: Encampment | null = null;
        if (standing && day - standing.from < 2) {
          if (day === standing.from && ask('arriving', day, standing.at, `camp:${standing.id}`, { camp: standing, timeOfDay: morning, force: { kind: 'camp', asked: true } })) any = true;
          if (day === standing.from) {
            const keepers = campPeople(standing, map.id, seed);
            const person = keepers[day % Math.max(1, keepers.length)];
            if (person) {
              const campPerson: CampTalk = { person, doing: doingLine(person.kind, person.slot, 'chore'), meal: false };
              if (ask('road', day, standing.at, `camp-talk:${standing.id}`, { timeOfDay: morning, campPerson, force: { kind: 'camp-talk', asked: true } })) any = true;
            }
          }
          campNight = standing;
        }
        // The Sinauli wagon on North Dwarka, met once, after the first day's walking (`PASSING_AFTER_STEPS`).
        if (map.id === 'field_map_dwarka' && day === Math.max(1, Math.ceil(PASSING_AFTER_STEPS / 80))) {
          const at = stepFor(`passing:${day}`);
          if (ask('road', day, at, `passing:${day}`, { timeOfDay: morning, passing: { id: 'sinauli-wagon', vehicle: 'vehicle_sinauli_wagon' }, force: { kind: 'passing', asked: true } })) any = true;
        }
        for (let t = 0; t < TAKES_PER_DAY; t += 1) {
          if (ask('working', day, tileFor(`take:${day}:${t}`), `working:${day}:${t}`, { timeOfDay: morning })) any = true;
        }
        const shelter = SHELTERS[h(`shelter:${day}`) % SHELTERS.length]!;
        if (campNight) {
          // Beside a camp: its first night is asked for, its second rationed with the camp beside you.
          const first = day === campNight.from;
          if (ask('night', day, campNight.at, `fireside:${campNight.id}:${day}`, { shelter, timeOfDay: 'night', camp: campNight, force: first ? { asked: true } : null })) any = true;
        } else if (ask('night', day, tileFor(`night:${day}`), `night:${day}`, { shelter, timeOfDay: 'night' })) any = true;

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
  const kinds = Object.values(TEMPLATES).flat().map((x) => x.kind).filter((k) => !ASKED.includes(k));
  const journeys = fieldMaps.length * JOURNEYS_PER_MAP;
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
    ...kinds.map((k) => `| ${k} | ${t.byKind[k] ?? 0} | ${(((t.byKind[k] ?? 0) / total) * 100).toFixed(1)}% |`),
    ``,
    `## Asked for: met by doing something`,
    ``,
    `Not rationed and not in the rhythm above. The simulated traveller walks up to each standing camp and`,
    `sleeps two nights beside it, talks with somebody there, makes small talk every other day, goes where`,
    `a rumour sent it, and on North Dwarka passes the Sinauli wagon once.`,
    ``,
    `| kind | events | per journey |`,
    `|---|---|---|`,
    ...ASKED.map((k) => `| ${k} | ${t.asked[k] ?? 0} | ${((t.asked[k] ?? 0) / journeys).toFixed(2)} |`)
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
    //
    // **Re-measured 4 October 2026, when the traveller began doing things** -- camps, talk, rumours,
    // the wagon -- whose events share the rationed ones' cooldowns: 0.57 a day at 6 x 40, 0.54 at
    // 25 x 60, the longest quiet run 3 and 4, the largest kind about 15%, and now 79-80% of days
    // with something in them. The floor moved from 0.5, which those sat just above, to 0.35.
    expect(total / tally.days, 'events per day').toBeGreaterThan(0.35);
    expect(total / tally.days, 'events per day').toBeLessThan(1.1);
    expect(tally.quietestRun, 'the longest run of days with nothing').toBeLessThanOrEqual(7);
  });

  it('lets no one kind crowd out the rest', () => {
    for (const [kind, n] of Object.entries(tally.byKind)) {
      expect(n / total, `${kind} is ${((n / total) * 100).toFixed(0)}% of everything`).toBeLessThan(0.3);
    }
  });

  it('names every kind the road never rations as asked for', () => {
    for (const [kind, words] of Object.entries(TEXT)) {
      if (words.weight === 0) expect(ASKED, `${kind} is never rationed and not counted as asked for`).toContain(kind);
    }
  });

  it('meets every asked-for kind when the traveller does what it takes', () => {
    // The report used to show these as nought, which read as broken: the simulation never walked up
    // to a camp or talked to anybody. Now it does, and each kind has to happen somewhere.
    for (const kind of ASKED) expect(tally.asked[kind] ?? 0, `${kind} never happened`).toBeGreaterThan(0);
  });

  it('reaches the second meeting and the returned kindness in ordinary play', () => {
    expect(tally.recognised, 'nobody was ever recognised').toBeGreaterThan(0);
    expect(tally.chains, 'no kindness was ever returned').toBeGreaterThan(0);
  });
});
