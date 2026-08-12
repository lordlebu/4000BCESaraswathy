// Walking the Lothal slice the way a player would.
//
// These are the progression rules, exercised against real canon rather than fixtures. If
// the authored ladders and the code that climbs them ever disagree, this is what says so.

import { describe, expect, it } from 'vitest';
import {
  advance,
  answer,
  answeredSoundly,
  availableResolutions,
  blockedBy,
  canAdvance,
  disciplineProgress,
  emptyProgress,
  entryFor,
  gatherable,
  isComplete,
  languagesKnown,
  learn,
  restored,
  rungOf,
  type Progress
} from '../src/journey';
import { discoveries, discovery, fieldQuestion, lastRung, vocabulary } from '../src/content/knowledge';

/**
 * Every moment a patient player could return in.
 *
 * A rung that wants a clear noon and a rung that wants a rainy night sit on the same ladder,
 * so climbing with one fixed moment stops early and says nothing useful. Coming back in
 * different weather is what the player actually does.
 */
const MOMENTS = [
  { timeOfDay: 'night', weather: 'rain' },
  { timeOfDay: 'night', weather: 'clear' },
  { timeOfDay: 'morning', weather: 'clear' },
  { timeOfDay: 'afternoon', weather: 'rain' },
  { timeOfDay: 'evening', weather: 'clear' }
];

/** Climb a discovery as far as the rules allow, revisiting until nothing more opens. */
function climb(progress: Progress, id: string): Progress {
  let p = progress;
  for (;;) {
    const moment = MOMENTS.find((m) => canAdvance(p, id, m));
    if (!moment) return p;
    p = advance(p, id, moment);
  }
}

describe('the ladder', () => {
  it('starts with nothing noticed', () => {
    const p = emptyProgress();
    expect(rungOf(p, 'discovery_red_rice_survival')).toBe(-1);
    expect(entryFor(p, 'discovery_red_rice_survival')).toBeNull();
  });

  it('shows the diary entry for the rung reached, not the finished one', () => {
    let p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    const first = entryFor(p, 'discovery_saltreed_thatch')!;
    p = advance(p, 'discovery_saltreed_thatch');
    expect(entryFor(p, 'discovery_saltreed_thatch')).not.toBe(first);
  });

  it('will not climb past what a rung requires', () => {
    // The rice cannot reach the field until the salt is understood.
    const p = climb(emptyProgress(), 'discovery_red_rice_survival');
    const d = discovery('discovery_red_rice_survival')!;
    expect(rungOf(p, 'discovery_red_rice_survival')).toBeLessThan(lastRung(d));
    expect(blockedBy(p, 'discovery_red_rice_survival')).toContain('discovery_poisoned_ground');
  });

  it('opens once the thing it needed is understood', () => {
    let p = climb(emptyProgress(), 'discovery_dockyard_reef');
    p = climb(p, 'discovery_poisoned_ground');
    expect(isComplete(p, 'discovery_poisoned_ground')).toBe(true);
    p = climb(p, 'discovery_red_rice_survival');
    expect(isComplete(p, 'discovery_red_rice_survival')).toBe(true);
  });

  it('holds a rung back when the world is not cooperating', () => {
    // The bloom shows on a still night. It is not there at noon, and saying so is the point.
    const noon = { timeOfDay: 'afternoon', weather: 'clear' };
    let p = advance(emptyProgress(), 'discovery_silver_water', noon);
    expect(canAdvance(p, 'discovery_silver_water', noon)).toBe(false);
    expect(blockedBy(p, 'discovery_silver_water', noon)).toContain('conditions');
    expect(canAdvance(p, 'discovery_silver_water', { timeOfDay: 'night', weather: 'rain' })).toBe(true);
  });
});

describe('words', () => {
  it('are what open the Kia readings', () => {
    let p = climb(emptyProgress(), 'discovery_ghost_mangrove_channel');
    expect(blockedBy(p, 'discovery_ghost_mangrove_channel')).toContain('word_kia_thal');
    p = learn(p, 'word_kia_thal');
    expect(canAdvance(p, 'discovery_ghost_mangrove_channel')).toBe(true);
  });

  it('accumulate into a language rather than a level', () => {
    let p = learn(emptyProgress(), 'word_kia_thal');
    p = learn(p, 'word_kia_uvai');
    expect(languagesKnown(p).kia).toBe(2);
    // Learning the same word twice is not two words.
    expect(languagesKnown(learn(p, 'word_kia_thal')).kia).toBe(2);
  });
});

describe('field questions', () => {
  it('offer the wrong reading first, and let the player take it', () => {
    // The moon reading is what the University would say. It is available early and it is wrong.
    let p = climb(emptyProgress(), 'discovery_silver_water');
    const open = availableResolutions(p, 'question_silver_water');
    expect(open.length).toBeGreaterThan(0);
    p = answer(p, 'question_silver_water', 0);
    expect(answeredSoundly(p, 'question_silver_water')).toBe(false);
  });

  it('offer the sound reading once the evidence is in', () => {
    let p = climb(emptyProgress(), 'discovery_silver_water');
    p = climb(p, 'discovery_dockyard_reef');
    const open = availableResolutions(p, 'question_silver_water');
    expect(open.some((r) => r.sound)).toBe(true);
  });

  it('carry both the local and the academic account', () => {
    const q = fieldQuestion('question_eastern_field')!;
    expect(q.localKnowledge).toBeTruthy();
    expect(q.academicHypothesis).toBeTruthy();
    // Neither is presented as automatically right.
    expect(q.resolutions.filter((r) => r.sound)).toHaveLength(1);
  });
});

describe('helping people', () => {
  it('needs the discovery finished, not merely started', () => {
    const p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    expect(gatherable(p)).not.toContain('npc_uma');
  });

  it('counts whoever a finished discovery names', () => {
    const p = climb(emptyProgress(), 'discovery_saltreed_thatch');
    expect(isComplete(p, 'discovery_saltreed_thatch')).toBe(true);
    expect(gatherable(p)).toContain('npc_uma');
  });

  it('leaves out the people who would not come', () => {
    // Bekh stays. Somebody has to be there when the rest go.
    let p = climb(emptyProgress(), 'discovery_dockyard_reef');
    p = climb(p, 'discovery_poisoned_ground');
    p = climb(p, 'discovery_red_rice_survival');
    expect(isComplete(p, 'discovery_red_rice_survival')).toBe(true);
    expect(gatherable(p)).not.toContain('npc_bekh');
  });

  it('records what was put back', () => {
    let p = climb(emptyProgress(), 'discovery_dockyard_reef');
    p = climb(p, 'discovery_poisoned_ground');
    p = climb(p, 'discovery_red_rice_survival');
    expect(restored(p)).toContain('poi_eastern_field');
  });
});

describe('the knowledge tree', () => {
  it('counts rungs climbed against rungs there are', () => {
    const p = climb(emptyProgress(), 'discovery_saltreed_thatch');
    const botany = disciplineProgress(p).botany!;
    expect(botany.climbed).toBeGreaterThan(0);
    expect(botany.climbed).toBeLessThan(botany.total);
  });

  it('never claims more progress than exists', () => {
    // Everything knowable, known: learn every word, then climb until nothing more opens.
    // Repeated because finishing one discovery is what unlocks the next.
    let p = emptyProgress();
    for (const w of vocabulary) p = learn(p, w.id);
    for (let pass = 0; pass < discoveries.length; pass += 1) {
      for (const d of discoveries) p = climb(p, d.id);
    }
    const totals = disciplineProgress(p);
    expect(Object.keys(totals).length).toBeGreaterThan(0);
    for (const d of Object.values(totals)) {
      expect(d.climbed).toBeLessThanOrEqual(d.total);
    }
    // And the slice is actually finishable — no ladder is authored so it can never be
    // climbed, which is the failure this whole file exists to catch.
    for (const d of discoveries) {
      expect(isComplete(p, d.id), `${d.id} cannot be finished`).toBe(true);
    }
  });
});
