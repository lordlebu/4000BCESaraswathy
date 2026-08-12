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
  knowsWord,
  linesFor,
  openQuestions,
  rungOf
} from '../src/journey';
import { fieldMaps, npc, npcsAt, poisOn } from '../src/content/places';
import { discoveries, vocabulary } from '../src/content/knowledge';
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
    const p = hear(emptyProgress(), 'npc_thrali', 0);
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
    const p = hear(emptyProgress(), 'npc_thrali', 0);
    expect(knowsWord(p, 'word_kia_thal')).toBe(false);
  });

  it('do nothing the second time', () => {
    const once = hear(emptyProgress(), 'npc_thrali', 0);
    expect(hear(once, 'npc_thrali', 0)).toEqual(once);
  });

  it('can be asked whether they still have something', () => {
    expect(hasSomethingNew(emptyProgress(), 'npc_thrali')).toBe(true);
    const p = hear(emptyProgress(), 'npc_thrali', 0);
    // Only the opening line is reachable yet, and it has been heard.
    expect(hasSomethingNew(p, 'npc_thrali')).toBe(false);
  });

  it('ignore an index that is not there', () => {
    const p = emptyProgress();
    expect(hear(p, 'npc_thrali', 99)).toBe(p);
    expect(hear(p, 'npc_nobody', 0)).toBe(p);
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
function liveIt(seed: string, days: number): Progress {
  let p = emptyProgress();

  // Each map has its own people, its own findable discoveries and — since canon gained
  // `climate` — its own sky. Walking both under one weather would quietly test a world that
  // does not exist, and would hide a plateau rung that only the plateau's mist can open.
  const places = fieldMaps.map((m) => {
    const here = new Set(poisOn(m.id).map((x) => x.id));
    return {
      climate: m.climate,
      people: poisOn(m.id).flatMap((x) => npcsAt(x.id).map((n) => n.id)),
      findable: discoveries.filter((d) => d.foundAt.some((f) => here.has(f)))
    };
  });

  for (let ms = 0; ms <= days * DAY_MS; ms += DAY_MS / 96) {
    for (let settle = 0; settle < 6; settle += 1) {
      let moved = false;

      for (const place of places) {
        const moment = momentAt(seed, ms, 0, place.climate);

        for (const id of place.people) {
          const before = p;
          for (let i = 0; i < linesFor(p, id).length; i += 1) p = hear(p, id, i);
          if (p !== before) moved = true;
        }
        for (const d of place.findable) {
          if (canAdvance(p, d.id, moment)) {
            p = advance(p, d.id, moment);
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
