// The adapter is the only place that knows how to turn canon's shape into the engine's, so
// these are the invariants that shape has to keep. They replace a straight diff against the
// old flat export, which proved the migration was lossless and then stopped being useful the
// moment those files were deleted.

import { describe, expect, it } from 'vitest';
import { creatures, flora } from '../src/content/species';
import placesBundle from '../data/canon/places.json';
import speciesBundle from '../data/canon/species.json';

const renderable = new Set(
  (placesBundle as { biomes: { id: string; renderable?: boolean }[] }).biomes
    .filter((b) => b.renderable)
    .map((b) => b.id)
);

describe('the adapter', () => {
  it('brings across every species canon holds', () => {
    // Counted from the bundle rather than written down. A literal here has to be edited every
    // time canon grows a species, which turns an invariant into a chore and teaches whoever hits
    // it that the number is the thing to change -- when the point is that the adapter must not
    // silently drop anything.
    const bundle = speciesBundle as { fauna: unknown[]; flora: unknown[] };
    expect(creatures.length).toBe(bundle.fauna.length);
    expect(flora.length).toBe(bundle.flora.length);
  });

  it('never lets a biome the engine cannot draw reach a placed species', () => {
    // Canon can say `sky_island` or `underworld`; the walk has nowhere to put them.
    for (const s of [...creatures, ...flora]) {
      for (const b of s.biomes) expect(renderable.has(b)).toBe(true);
    }
  });

  it('holds back anything left with nowhere to stand', () => {
    for (const s of [...creatures, ...flora]) {
      if (s.biomes.length === 0) expect(s.placement).toBe('lore');
    }
  });

  it('gives every species a sentence for the journal', () => {
    // `journal_prompt` is the player-facing line and `notes` the canon reference fact; a
    // species with neither would print an empty paragraph.
    for (const s of [...creatures, ...flora]) {
      if (s.placement !== 'lore') expect(s.journalPrompt.length).toBeGreaterThan(10);
    }
  });

  it('recovers a region for species authored in canon rather than the bestiary', () => {
    // Those carry only `habitats`. Losing the fallback relabelled forty of them `canon`.
    const stranded = [...creatures, ...flora].filter((s) => s.region === 'canon');
    expect(stranded.length).toBeLessThan(5);
  });

  it('keeps the authored order, because pickFor indexes into it', () => {
    const starters = creatures.slice(0, 6).map((c) => c.id);
    expect(starters).toContain('river-otter');
    expect(starters).toContain('cloud-antelope');
  });
});
