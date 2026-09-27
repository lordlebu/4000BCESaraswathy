// Somebody speaking first, when you bump into them.
//
// The owner, 27 September: some chats should start without the player, especially with named
// people, especially on a first meeting or when they want something. These hold who has a reason,
// how often a reason turns into speaking, and that nobody does it twice in a day.

import { describe, expect, it } from 'vitest';
import { SPEAKS_FIRST, asksSomething, whoSpeaksFirst, type Bumped } from '../src/content/bumping';
import { emptyProgress, hear, linesFor, reasonToSpeak } from '../src/journey';
import { npc } from '../src/content/places';
import { add, emptySatchel } from '../src/content/satchel';
import { tileHash } from '../src/world/rng';

const named = (key: string, reason: Bumped['reason']): Bumped => ({ key, npcId: key, travellerId: null, reason });

describe('who has a reason to speak first', () => {
  it('is somebody never met, once, and then somebody who wants something', () => {
    // Thrali introduces himself, and hands over the silver-water question: both reasons.
    expect(reasonToSpeak(emptyProgress(), 'npc_thrali', emptySatchel(), false)).toBe('first');
    expect(reasonToSpeak(emptyProgress(), 'npc_thrali', emptySatchel(), true)).toBe('wants');
  });

  it('wants something when they see a thing of theirs on you', () => {
    // Uma's mat: a priced line, offered only once it is carried.
    const priced = npc('npc_uma')!.lines.find((l) => l.costs)!;
    expect(priced, 'Uma no longer wants anything').toBeTruthy();
    expect(reasonToSpeak(emptyProgress(), 'npc_uma', emptySatchel(), true)).toBeNull();
    expect(reasonToSpeak(emptyProgress(), 'npc_uma', add(emptySatchel(), priced.costs!), true)).toBe('wants');
  });

  it('has no reason once everything they had to say is said', () => {
    let progress = emptyProgress();
    // Hear everything Thrali will say, in rounds: a line can open another.
    for (let round = 0; round < 6; round += 1) {
      for (let i = 0; i < linesFor(progress, 'npc_thrali').length; i += 1) progress = hear(progress, 'npc_thrali', i).progress;
    }
    const asking = linesFor(progress, 'npc_thrali').some((l) => l.gives.some((g) => g.startsWith('question_')));
    expect(asking, 'the question line is still offered after hearing it').toBe(true);
    expect(reasonToSpeak(progress, 'npc_thrali', emptySatchel(), true)).toBeNull();
  });

  it('counts only lines that ask: a question, or a thing wanted', () => {
    const line = { text: '', requires: [], gives: [], costs: null };
    expect(asksSomething(line, false)).toBe(false);
    expect(asksSomething({ ...line, gives: ['word_x'] }, false)).toBe(false);
    expect(asksSomething({ ...line, gives: ['question_x'] }, false)).toBe(true);
    expect(asksSomething({ ...line, costs: 'mat_x' }, false)).toBe(true);
    expect(asksSomething({ ...line, gives: ['question_x'] }, true), 'a spent line asks again').toBe(false);
  });
});

describe('who actually speaks', () => {
  it('speaks on a roll under the chance for their reason, and not over it', () => {
    const one = [named('npc_a', 'first')];
    expect(whoSpeaksFirst(one, 0, new Set(), () => SPEAKS_FIRST.first - 0.01)?.key).toBe('npc_a');
    expect(whoSpeaksFirst(one, 0, new Set(), () => SPEAKS_FIRST.first)).toBeNull();
  });

  it('puts a first meeting before somebody who wants something, and both before a stranger', () => {
    const all = [
      { key: 'map:company_carrier', npcId: null, travellerId: 'company_carrier', reason: 'passing' as const },
      named('npc_b', 'wants'),
      named('npc_a', 'first')
    ];
    expect(whoSpeaksFirst(all, 0, new Set(), () => 0)?.key).toBe('npc_a');
    expect(whoSpeaksFirst(all.slice(0, 2), 0, new Set(), () => 0)?.key).toBe('npc_b');
  });

  it('speaks first once a day at most', () => {
    const one = [named('npc_a', 'first')];
    expect(whoSpeaksFirst(one, 3, new Set(['npc_a@3']), () => 0)).toBeNull();
    expect(whoSpeaksFirst(one, 4, new Set(['npc_a@3']), () => 0)?.key).toBe('npc_a');
  });

  it('comes out near the stated chance over many meetings, with the game’s own seeded roll', () => {
    for (const reason of ['first', 'wants', 'passing'] as const) {
      let spoke = 0;
      const trials = 4000;
      for (let day = 0; day < trials; day += 1) {
        const roll = (salt: string) => (tileHash('bumping', 0, 0, salt) % 10_000) / 10_000;
        if (whoSpeaksFirst([named('npc_a', reason)], day, new Set(), roll)) spoke += 1;
      }
      expect(Math.abs(spoke / trials - SPEAKS_FIRST[reason]), `${reason}: ${spoke} of ${trials}`).toBeLessThan(0.03);
    }
  });
});
