// The travel log — what the player takes away.
//
// It is the one artifact that leaves the game, so it gets held to the standard of something being
// shown to other people: no placeholders, no `undefined`, and a seed that actually reproduces the
// journey it describes.

import { describe, expect, it } from 'vitest';
import {
  buildTravelLog,
  travelLogFilename,
  travelLogToText,
  type JourneyState
} from '../src/content/travelLog';
import { landmarkKindFor, landmarkTitle } from '../src/content/landmarks';
import { generateWorld } from '../src/world/generate';

const world = generateWorld({ seed: 'play-test' });

const finished: JourneyState = {
  discovered: 210,
  observed: ['River Otter', 'Monsoon Crane'],
  reachedLandmark: true
};
const abandoned: JourneyState = { discovered: 12, observed: [], reachedLandmark: false };

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

  it('lists every sketch, and says so plainly when there are none', () => {
    const listed = travelLogToText(buildTravelLog(world, finished));
    for (const name of finished.observed) expect(listed).toContain(name);
    expect(listed).toContain('(two creatures)');

    const empty = travelLogToText(buildTravelLog(world, abandoned));
    expect(empty).toContain('(no creatures)');
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
