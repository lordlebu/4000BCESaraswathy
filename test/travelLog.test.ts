// The travel log — what the player takes away.
//
// It is the one artifact that leaves the game, so it gets held to the standard of something being
// shown to other people: no placeholders, no `undefined`, and a seed that actually reproduces the
// journey it describes.

import { advance, answer, canAdvance, emptyProgress, learn, type Progress } from '../src/journey';
import { discoveries, vocabulary } from '../src/content/knowledge';
import { describe, expect, it } from 'vitest';
import {
  buildTravelLog,
  travelLogFilename,
  travelLogToText,
  type JourneyState
} from '../src/content/travelLog';
import { landmarkKindFor, landmarkTitle } from '../src/content/landmarks';
import { generateWorld } from '../src/world/generate';
import { emptyCollection, metOnTile } from '../src/content/collection';

const world = generateWorld({ seed: 'play-test' });

// Keyed by species id, because that is what the collection stores. The log resolves them to
// names for its prose -- which is the point of storing the id rather than the name.
const finished: JourneyState = {
  discovered: 210,
  collection: metOnTile(emptyCollection(), {
    creature: { id: 'river-otter' },
    flora: { id: 'sweet-indigo' }
  }),
  reachedLandmark: true
};
const abandoned: JourneyState = {
  discovered: 12,
  collection: emptyCollection(),
  reachedLandmark: false
};

describe('building the log', () => {
  it('names where the journey started and where it was going', () => {
    const log = buildTravelLog(world, finished);
    const text = travelLogToText(log);
    expect(text).toContain(world.seed);
    if (world.settlement) expect(text).toContain(world.settlement.name);
    expect(text).toContain(world.landmark.name);
  });

  it('writes the arrival prose only when the landmark was actually reached', () => {
    const arrival = landmarkKindFor(world.landmark, world.seed).arrival;
    expect(travelLogToText(buildTravelLog(world, finished))).toContain(arrival);

    const unfinished = travelLogToText(buildTravelLog(world, abandoned));
    expect(unfinished).not.toContain(arrival);
    expect(unfinished).toContain('was never found');
    // An unfinished journey should still say where to look.
    expect(unfinished).toContain(world.landmark.name);
  });

  it('titles the landmark by kind, matching the arrival page', () => {
    const log = buildTravelLog(world, finished);
    expect(log.sections.flatMap((s) => s.lines).join('\n')).toContain(
      landmarkTitle(world.landmark, world.seed)
    );
  });

  it('names everything met, and says so plainly when there is nothing', () => {
    const listed = travelLogToText(buildTravelLog(world, finished));
    // Stored as ids, printed as names.
    expect(listed).toContain('River Otter');
    expect(listed).toContain('Sweet Indigo');
    expect(listed).toContain('(two species)');

    const empty = travelLogToText(buildTravelLog(world, abandoned));
    expect(empty).toContain('(no species)');
    expect(empty).toContain('came home empty');
  });

  it('never leaks undefined, null or NaN into something the player will share', () => {
    for (const state of [finished, abandoned]) {
      for (const seed of ['play-test', 'river-road', 'monsoon-evening', 'a']) {
        const text = travelLogToText(buildTravelLog(generateWorld({ seed }), state));
        expect(text, `seed ${seed}`).not.toMatch(/undefined|null|NaN|\[object/);
      }
    }
  });

  it('reports a sane percentage of the country walked', () => {
    const text = travelLogToText(buildTravelLog(world, finished));
    const percent = Number(text.match(/about (\d+) percent/)?.[1]);
    expect(percent).toBeGreaterThanOrEqual(0);
    expect(percent).toBeLessThanOrEqual(100);
  });

  it('carries a replay link that round-trips the seed', () => {
    const tricky = generateWorld({ seed: 'a seed with spaces & symbols' });
    const log = buildTravelLog(tricky, finished, 'https://example.test/game/');
    const url = new URL(log.replayUrl);
    expect(url.searchParams.get('seed')).toBe(tricky.seed);
  });
});

describe('filenames', () => {
  it('are safe, lowercase and carry the seed', () => {
    expect(travelLogFilename(generateWorld({ seed: 'River Road!' }), 'png')).toBe(
      'south-of-tethys-river-road.png'
    );
  });

  it('survive a seed with nothing usable in it', () => {
    expect(travelLogFilename(generateWorld({ seed: '!!!' }), 'md')).toBe(
      'south-of-tethys-journey.md'
    );
  });
});

describe('markdown shape', () => {
  it('reads as a document, not a dump', () => {
    const log = buildTravelLog(world, finished);
    const text = travelLogToText(log);
    expect(text.startsWith('# ')).toBe(true);
    for (const section of log.sections) expect(text).toContain(`## ${section.heading}`);
    expect(text.trimEnd().endsWith(log.replayUrl)).toBe(true);
  });
});

describe('the keepsake records the diary, not just the walk', () => {
  const world = generateWorld({ seed: 'keepsake' });
  const bare = { discovered: 40, collection: emptyCollection(), reachedLandmark: false };

  /** Climb everything, learn every word, settle a question. */
  function full(): Progress {
    let p = emptyProgress();
    for (const w of vocabulary) p = learn(p, w.id);
    const moments = ['dawn', 'morning', 'afternoon', 'evening', 'night'].flatMap((timeOfDay) =>
      ['clear', 'rain', 'mist', 'storm'].map((weather) => ({ timeOfDay, weather }))
    );
    for (let pass = 0; pass < discoveries.length; pass += 1) {
      for (const d of discoveries) {
        for (;;) {
          const m = moments.find((x) => canAdvance(p, d.id, x));
          if (!m) break;
          p = advance(p, d.id, m);
        }
      }
    }
    return answer(p, 'question_silver_water', 0);
  }

  it('says nothing about the diary when there is nothing to say', () => {
    const log = buildTravelLog(world, bare);
    const headings = log.sections.map((s) => s.heading);
    expect(headings.some((h) => /Understood|Questions settled|Words|Put back/.test(h))).toBe(false);
  });

  it('records what was understood, learned, settled and put back', () => {
    const log = buildTravelLog(world, { ...bare, progress: full() });
    const headings = log.sections.map((s) => s.heading).join(' | ');
    expect(headings).toMatch(/Understood/);
    expect(headings).toMatch(/Questions settled/);
    expect(headings).toMatch(/Words/);
    expect(headings).toMatch(/Put back/);
  });

  it('never says whether a reading was right', () => {
    // The game does not grade an answer on screen; it must not grade one in the thing the
    // player hands to somebody else.
    const text = travelLogToText(buildTravelLog(world, { ...bare, progress: full() }));
    expect(text).not.toMatch(/correct|incorrect|wrong|mistaken|sound/i);
  });

  it('names words and places in words, not ids', () => {
    const text = travelLogToText(buildTravelLog(world, { ...bare, progress: full() }));
    expect(text).not.toMatch(/word_|poi_|discovery_|question_/);
  });
});
