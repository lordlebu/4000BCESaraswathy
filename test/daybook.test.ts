import { describe, expect, it } from 'vitest';
import { emptyProgress, type Progress } from '../src/journey';
import { dayLines, diaryHolds, leftOffLines, listOf, readingOf, tomorrowLine, type DayKnowledge } from '../src/content/daybook';
import { discoveries, fieldQuestions, vocabulary } from '../src/content/knowledge';
import { recipes } from '../src/content/making';
import { homesteads } from '../src/content/homestead';
import { creatures } from '../src/content/species';
import type { Wanting } from '../src/content/goals';

const knowing = (p: Partial<Progress> = {}, rest: Partial<DayKnowledge> = {}): DayKnowledge => ({
  progress: { ...emptyProgress(), ...p },
  collection: {},
  flags: [],
  met: [],
  ...rest
});

describe('the day behind you', () => {
  it('says nothing about a day that added nothing', () => {
    const k = knowing({ rungs: { [discoveries[0]!.id]: 1 } });
    expect(dayLines(readingOf(k), k)).toEqual([]);
  });

  it('names an entry that grew, and only the ones that grew', () => {
    const [a, b] = discoveries;
    const before = readingOf(knowing({ rungs: { [a!.id]: 0, [b!.id]: 2 } }));
    const lines = dayLines(before, knowing({ rungs: { [a!.id]: 1, [b!.id]: 2 } }));
    expect(lines).toEqual([{ kind: 'entry', text: `${a!.name}: the entry grew.` }]);
  });

  it('counts a first sighting as an entry growing', () => {
    const d = discoveries[0]!;
    const lines = dayLines(readingOf(knowing()), knowing({ rungs: { [d.id]: 0 } }));
    expect(lines.map((l) => l.kind)).toEqual(['entry']);
  });

  it('gathers several entries into one line rather than a list a page long', () => {
    const five = discoveries.slice(0, 5);
    const rungs = Object.fromEntries(five.map((d) => [d.id, 0]));
    const lines = dayLines(readingOf(knowing()), knowing({ rungs }));
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toMatch(/^5 entries grew: .* and 2 more\.$/);
  });

  it('says a word with what it means', () => {
    const w = vocabulary[0]!;
    const lines = dayLines(readingOf(knowing()), knowing({ words: [w.id] }));
    expect(lines[0]!.text).toBe(`You learned the word ${w.word}: ${w.gloss}.`);
  });

  it('says a building stage went up, by its name', () => {
    const home = homesteads[0]!;
    const stage = home.stages[0]!;
    const lines = dayLines(readingOf(knowing()), knowing({}, { flags: [`homestead:${home.fieldMapId}:built:${stage.id}`] }));
    expect(lines).toEqual([{ kind: 'built', text: `${stage.name} went up.` }]);
  });

  it('puts what changed the map before what was only noticed', () => {
    const home = homesteads[0]!;
    const k = knowing(
      { rungs: { [discoveries[0]!.id]: 0 }, made: [recipes[0]!.id] },
      { flags: [`homestead:${home.fieldMapId}:built:${home.stages[0]!.id}`], collection: { [creatures[0]!.id]: { id: creatures[0]!.id, kind: 'creature' } }, met: ['someone'] }
    );
    expect(dayLines(readingOf(knowing()), k).map((l) => l.kind)).toEqual(['built', 'entry', 'made', 'species', 'stranger']);
  });

  it('says a question settled, and does not also call it a question to settle', () => {
    const q = fieldQuestions[0]!;
    const before = readingOf(knowing());
    const lines = dayLines(before, knowing({ questions: [q.id], answered: { [q.id]: 0 } }));
    expect(lines.map((l) => l.kind)).toEqual(['answered']);
  });

  it('ignores a flag that is not about settling, and a recipe it cannot name', () => {
    const lines = dayLines(readingOf(knowing()), knowing({ made: ['no-such-recipe'] }, { flags: ['stranger:agreed'] }));
    expect(lines).toEqual([]);
  });

  it('is a reading, not a reference: changing the journey later does not change the morning', () => {
    const progress = { ...emptyProgress(), words: [] as string[] };
    const reading = readingOf({ progress, collection: {}, flags: [], met: [] });
    progress.words.push(vocabulary[0]!.id);
    expect(reading.words).toEqual([]);
  });
});

describe('tomorrow', () => {
  const wanting = (wants: string[], other: string[] = []): Wanting => ({
    name: 'Carry basket',
    wants: wants.map((label) => ({ id: null, tag: 'fibre', more: 2, label })),
    other,
    ready: wants.length === 0
  });

  it('names the pin and what it still wants', () => {
    expect(tomorrowLine(wanting(['2 more any fibre']), null)).toBe('Carry basket: 2 more any fibre.');
  });

  it('says a pin is ready when nothing is left to gather', () => {
    expect(tomorrowLine(wanting([]), null)).toBe('Carry basket: nothing left to gather.');
    expect(tomorrowLine(wanting([], ['at a kiln']), null)).toBe('Carry basket: at a kiln.');
  });

  it('falls back to the next step, and to nothing', () => {
    expect(tomorrowLine(null, { line: 'You have not seen the ford yet.', action: null })).toBe('You have not seen the ford yet.');
    expect(tomorrowLine(null, null)).toBeNull();
  });
});

describe('the diary, in a breath', () => {
  it('counts entries begun and words, and says nothing of an empty diary', () => {
    expect(diaryHolds(emptyProgress())).toBeNull();
    const [a, b] = discoveries;
    expect(diaryHolds({ ...emptyProgress(), rungs: { [a!.id]: 0, [b!.id]: 3 }, words: [vocabulary[0]!.id] })).toBe(
      'Your diary holds 2 entries begun and 1 word.'
    );
  });

  it('lists names the way a sentence does', () => {
    expect(listOf(['a'])).toBe('a');
    expect(listOf(['a', 'b'])).toBe('a and b');
    expect(listOf(['a', 'b', 'c'])).toBe('a, b and c');
    expect(listOf(['a', 'b', 'c', 'd'])).toBe('a, b, c and 1 more');
  });
});

describe('where you left off', () => {
  it('says the map, what was pinned and what the diary holds', () => {
    const lines = leftOffLines({
      fieldMapId: 'field_map_narmada',
      pinned: { name: 'Carry basket', wants: [{ id: null, tag: 'fibre', more: 2, label: '2 more any fibre' }], other: [], ready: false },
      flags: [],
      progress: { ...emptyProgress(), words: [vocabulary[0]!.id] }
    });
    expect(lines).toEqual(['You were on the Narmada Plateau.', 'Carry basket: 2 more any fibre.', 'Your diary holds 1 word.']);
  });

  it('names the next building stage when nothing is pinned and the ground is agreed', () => {
    const home = homesteads.find((h) => h.grounds.some((g) => g.worries.length > 0))!;
    const ground = home.grounds[0]!;
    const flags = [
      `homestead:${home.fieldMapId}:ground:${ground.id}`,
      ...ground.worries.map((w) => `homestead:${home.fieldMapId}:eased:${w.id}`)
    ];
    const lines = leftOffLines({ fieldMapId: home.fieldMapId, pinned: null, flags, progress: emptyProgress() });
    expect(lines[1]).toBe(`Next: ${home.stages[0]!.name.toLowerCase()}.`);
  });

  it('says only where you were on a walk that has done nothing yet', () => {
    expect(leftOffLines({ fieldMapId: 'field_map_lothal', pinned: null, flags: [], progress: emptyProgress() })).toEqual([
      'You were on Lothal.'
    ]);
  });
});
