// Can a player actually learn a word?
//
// Until now the answer was no, and nothing said so. Words are handed over by NPC lines, the
// adapter dropped `lines` on the floor, and every test that needed a word called `learn()`
// directly — so the vocabulary mechanic was dead in the shipped game while passing its suite.
// The last block here is the guard: it finishes both slices without ever calling `learn`.

import { describe, expect, it } from 'vitest';
import {
  type Progress,
  advance,
  blockedFrom,
  canAdvance,
  canEnter,
  emptyProgress,
  hasSomethingNew,
  hear,
  isComplete,
  knowsQuestion,
  knowsRecipe,
  knowsWord,
  linesFor,
  openQuestions,
  rungOf
} from '../src/journey';
import { fieldMaps, npc, npcsAt, poisOn } from '../src/content/places';
import { discoveries, vocabulary } from '../src/content/knowledge';
import { emptySatchel } from '../src/content/satchel';
import { make, makeableNow, openGround } from '../src/content/crafting';
import { gather } from '../src/content/gathering';
import { buildFieldMap } from '../src/world/fieldMap';
import { momentAt } from '../src/game/moment';
import { DAY_MS } from '../src/game/dayNight';

describe('people say things', () => {
  it('reach the game at all', () => {
    const thrali = npc('npc_thrali')!;
    expect(thrali.lines.length).toBeGreaterThan(0);
    expect(thrali.language).toBe('kia');
    expect(thrali.knows.length).toBeGreaterThan(0);
  });

  it('open with something anyone can hear', () => {
    const open = linesFor(emptyProgress(), 'npc_thrali');
    expect(open.length).toBeGreaterThan(0);
    expect(open[0]!.gives).toContain('question_silver_water');
  });

  it('hand over the question when heard', () => {
    const p = hear(emptyProgress(), 'npc_thrali', 0).progress;
    expect(knowsQuestion(p, 'question_silver_water')).toBe(true);
    expect(openQuestions(p).map((q) => q.id)).toContain('question_silver_water');
  });

  it('keep the rest back until you have seen the thing', () => {
    const cold = linesFor(emptyProgress(), 'npc_thrali');
    // The word line waits on the silver water being observed, not merely mentioned.
    expect(cold.some((l) => l.gives.includes('word_kia_thal'))).toBe(false);

    let p = advance(emptyProgress(), 'discovery_silver_water');
    p = advance(p, 'discovery_silver_water', { timeOfDay: 'night', weather: 'rain' });
    expect(rungOf(p, 'discovery_silver_water')).toBe(1);
    expect(linesFor(p, 'npc_thrali').some((l) => l.gives.includes('word_kia_thal'))).toBe(true);
  });

  it('are indexed against what is available, not against canon order', () => {
    // Hearing line 0 of the *available* list can never trigger a locked line by accident.
    const p = hear(emptyProgress(), 'npc_thrali', 0).progress;
    expect(knowsWord(p, 'word_kia_thal')).toBe(false);
  });

  it('do nothing the second time', () => {
    const once = hear(emptyProgress(), 'npc_thrali', 0).progress;
    expect(hear(once, 'npc_thrali', 0).progress).toEqual(once);
  });

  it('can be asked whether they still have something', () => {
    expect(hasSomethingNew(emptyProgress(), 'npc_thrali')).toBe(true);

    // Two lines are reachable from the first step now, not one: the opening, and the one
    // where he shows you how a weir is set. Both have to be heard before he is out of
    // things to say — which is the assertion this test was always making, stated as a walk
    // rather than as a number so that a ninth line does not break it again.
    let p = emptyProgress();
    for (let i = 0; i < 8 && hasSomethingNew(p, 'npc_thrali'); i += 1) {
      const said = linesFor(p, 'npc_thrali');
      const next = said.findIndex((l) => l.gives.length > 0 && hear(p, 'npc_thrali', said.indexOf(l)).progress !== p);
      if (next === -1) break;
      p = hear(p, 'npc_thrali', next).progress;
    }
    expect(hasSomethingNew(p, 'npc_thrali')).toBe(false);
  });

  it('ignore an index that is not there', () => {
    const p = emptyProgress();
    expect(hear(p, 'npc_thrali', 99).progress).toBe(p);
    expect(hear(p, 'npc_nobody', 0).progress).toBe(p);
  });
});

describe('gated sub-locations', () => {
  it('open on understanding, not on having glanced', () => {
    let p = emptyProgress();
    expect(canEnter(p, 'poi_kavik_tower', 'stair_shaft')).toBe(false);
    expect(blockedFrom(p, 'poi_kavik_tower', 'stair_shaft')).toContain('discovery_tower_collapse');

    // Noticed is not enough.
    p = advance(p, 'discovery_tower_collapse');
    expect(canEnter(p, 'poi_kavik_tower', 'stair_shaft')).toBe(false);

    // The collapse cannot be read without the reef, so climb that first.
    while (canAdvance(p, 'discovery_dockyard_reef')) p = advance(p, 'discovery_dockyard_reef');
    while (canAdvance(p, 'discovery_tower_collapse')) p = advance(p, 'discovery_tower_collapse');
    expect(isComplete(p, 'discovery_tower_collapse')).toBe(true);
    expect(canEnter(p, 'poi_kavik_tower', 'stair_shaft')).toBe(true);
    expect(blockedFrom(p, 'poi_kavik_tower', 'stair_shaft')).toEqual([]);
  });

  it('let anyone into the ungated ones', () => {
    expect(canEnter(emptyProgress(), 'poi_kavik_tower', 'lower_courses')).toBe(true);
  });

  it('say no to a place that does not exist', () => {
    expect(canEnter(emptyProgress(), 'poi_kavik_tower', 'nowhere')).toBe(false);
    expect(blockedFrom(emptyProgress(), 'poi_nowhere', 'nowhere')).toEqual([]);
  });
});

/**
 * A handful of seeds, because one is not evidence.
 *
 * Weather is seed-derived, so a rung gated on something uncommon can pass under one seed and
 * be unreachable under another — and the authored slice would look fine either way. Anything
 * asserting content is finishable runs across all of these.
 */
const SEEDS = ['lothal', 'narmada', 'dwarka', 'saraswati', 'varuna', 'tethys'];

/**
 * Walk both field maps for a few days, talking to whoever is standing there and looking at
 * whatever the sky allows. Never calls `learn` — every word has to be earned in conversation.
 */
/**
 * Every map, built once, with what a full walk of it yields.
 *
 * Built at module scope because a field map is generated from its own canon seed rather than
 * from the journey's, so all six journeys below would generate identical ground and gather
 * identical things. Doing that per journey took this file from four seconds to over two
 * minutes, which is a long time to spend proving the same thing six times.
 */
const MAPS = fieldMaps.map((m) => {
  const here = new Set(poisOn(m.id).map((x) => x.id));
  const built = buildFieldMap(m);
  return {
    climate: m.climate,
    kinds: new Set(built.placed.map((x) => x.poi.kind as string)),
    people: poisOn(m.id).flatMap((x) => npcsAt(x.id).map((n) => n.id)),
    findable: discoveries.filter((d) => d.foundAt.some((f) => here.has(f))),
    built
  };
});

/**
 * Everything a full walk of every map picks up.
 *
 * A player crossing a map does not cover all of it in a day, but they cover it over a journey,
 * and the question here is whether the ladders can be finished at all rather than how far
 * anybody walked.
 */
const GATHERED = MAPS.reduce((acc, place) => {
  const { world } = place.built;
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      acc = gather(acc, world.seed, { x, y }, world.tiles[y]![x]!.biome);
    }
  }
  return acc;
}, emptySatchel());

function liveIt(seed: string, days: number): Progress {
  let p = emptyProgress();
  // **It gathers and crafts too, and that is not decoration.** Six rungs need a tool, and a
  // tool has to be picked up off the ground and made. Handing this function a satchel of tools
  // would be exactly the cheating this describe block is named for, so it does what a player
  // does: walks the tiles, picks up what is there, and makes what it can. If the making layer
  // ever stops being able to produce a cutting edge, the ladders stop finishing and this says
  // so — which is the only reason it is worth the extra work in here.
  let bag = emptySatchel();

  // Each map has its own people, its own findable discoveries and — since canon gained
  // `climate` — its own sky. Walking both under one weather would quietly test a world that
  // does not exist, and would hide a plateau rung that only the plateau's mist can open.
  const places = MAPS;
  // What a full walk of every map yields. Hoisted to module scope and shared: a field map is
  // built from its own canon seed, not from the journey's, so all six journeys gather exactly
  // the same things and generating the ground six times over cost more than the rest of this
  // file put together.
  bag = { ...GATHERED };

  /**
   * Make whatever is possible, standing where this map allows, until nothing more opens.
   *
   * Called only when the repertoire has actually grown, and that guard is load-bearing rather
   * than tidy: without it this runs inside the innermost loop — six seeds by three days by
   * ninety-six ticks by six settling passes by three maps — and the suite goes from four
   * seconds to over two minutes. The only thing that can make a new recipe possible is
   * learning one, so learning one is the trigger.
   */
  let repertoire = -1;
  function makeWhatYouCan(kinds: Set<string>): void {
    if (p.recipes.length === repertoire) return;
    repertoire = p.recipes.length;
    for (let pass = 0; pass < 8; pass += 1) {
      let made = false;
      for (const bench of [openGround(), ...[...kinds].map((k) => ({ kind: k }))]) {
        for (const r of makeableNow(bag, bench)) {
          if (!knowsRecipe(p, r.id)) continue;
          const next = make(bag, r.id, bench);
          if (next !== bag) {
            bag = next;
            made = true;
          }
        }
      }
      if (!made) break;
    }
  }

  for (let ms = 0; ms <= days * DAY_MS; ms += DAY_MS / 96) {
    for (let settle = 0; settle < 6; settle += 1) {
      let moved = false;

      for (const place of places) {
        const moment = momentAt(seed, ms, 0, place.climate);

        for (const id of place.people) {
          const before = p;
          const beforeBag = bag;
          for (let i = 0; i < linesFor(p, id, bag).length; i += 1) {
            const heard = hear(p, id, i, bag);
            p = heard.progress;
            bag = heard.satchel;
          }
          if (p !== before || bag !== beforeBag) moved = true;
        }

        // Talking can teach a recipe, so making sits between the conversation and the climb.
        const bagBefore = bag;
        makeWhatYouCan(place.kinds);
        if (bag !== bagBefore) moved = true;

        for (const d of place.findable) {
          if (canAdvance(p, d.id, moment, bag)) {
            p = advance(p, d.id, moment, bag);
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }
  return p;
}

describe('the whole thing, without cheating', () => {
  it('teaches every word through someone who says it', () => {
    for (const seed of SEEDS) {
      const p = liveIt(seed, 3);
      for (const w of vocabulary) {
        expect(knowsWord(p, w.id), `${w.id} unlearnable under seed ${seed}`).toBe(true);
      }
    }
  });

  it('finishes every ladder in both slices', () => {
    for (const seed of SEEDS) {
      const p = liveIt(seed, 3);
      for (const d of discoveries) {
        expect(isComplete(p, d.id), `${d.id} unreachable under seed ${seed}`).toBe(true);
      }
    }
  });

  it('hands over every question that has someone to raise it', () => {
    const p = liveIt('lothal', 3);
    expect(openQuestions(p).length).toBeGreaterThanOrEqual(4);
  });

  it('opens the gated depths, having done the work', () => {
    const p = liveIt(SEEDS[0]!, 3);
    expect(canEnter(p, 'poi_kavik_tower', 'flooded_undercroft')).toBe(true);
    expect(canEnter(p, 'poi_long_archive', 'sequence_stacks')).toBe(true);
    expect(canEnter(p, 'poi_long_archive', 'unread_shelf')).toBe(true);
    expect(canEnter(p, 'poi_cloud_stair', 'the_turn')).toBe(true);
  });
});
