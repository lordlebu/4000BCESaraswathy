// Guyuk's and the Asura princess's arcs, walked beat by beat on canon's own data.

import { describe, expect, it } from 'vitest';
import { beatNow, nextBeat, storylines, type BeatWhen, type StoryFacts } from '../src/content/storylines';
import { walkers } from '../src/game/characters';

const guyuk = storylines.find((s) => s.id === 'storyline_guyuk')!;
const princess = storylines.find((s) => s.id === 'storyline_asura_princess')!;

/** Walk an arc: each step is a moment, and taking the card's first choice sets its flags. */
function walker(fieldMapId: string, held: string[] = [], carried: Record<string, number> = {}) {
  const flags: string[] = [];
  const facts = (poiId: string | null): StoryFacts => ({
    fieldMapId,
    day: 3,
    poiId,
    flags,
    holds: (id) => held.includes(id),
    carried: (id) => carried[id] ?? 0
  });
  return {
    flags,
    held,
    carried,
    /** The card this moment opens, taking its first choice; or null when nothing is due. */
    at(when: BeatWhen, poiId: string | null = null) {
      const card = beatNow(when, facts(poiId));
      if (!card) return null;
      const choice = card.choices[0]!;
      flags.push(...(choice.sets ?? []));
      for (const t of choice.takes ?? []) carried[t.id] = (carried[t.id] ?? 0) - t.n;
      held.push(...choice.grants);
      return card;
    }
  };
}

describe("Guyuk's arc", () => {
  it('is canon’s, on the Aravali, and ends with her joining', () => {
    expect(guyuk.fieldMapId).toBe('field_map_aravali');
    expect(guyuk.joins).toBe(true);
    expect(guyuk.beats.map((b) => b.id)).toEqual(['rumour', 'absent', 'ruins', 'forest', 'teaching', 'supper', 'bond']);
  });

  it('goes rumour, empty Atelier, ruins, forest, teaching, supper, bond -- each only in its moment', () => {
    const w = walker('field_map_aravali');
    // Nothing at the ruins before the rumour and the empty Atelier: beats come in order.
    expect(w.at('arriving', 'poi_alms_step')).toBeNull();
    expect(w.at('road')?.title).toBe('Word of a herbalist');
    expect(w.at('arriving', 'poi_quiet_atelier')?.title).toBe('Not here');
    const ruins = w.at('arriving', 'poi_alms_step')!;
    expect(ruins.art).toBe('guyuk-bathe-ruins');

    // The forest waits for the rice: arriving without it is quiet, and the beat is still waiting.
    expect(w.at('arriving', 'poi_vedda_ford')).toBeNull();
    w.carried.material_delta_rice = 3;
    const forest = w.at('arriving', 'poi_vedda_ford')!;
    expect(forest.art).toBe('guyuk-bathe-forest');
    expect(w.carried.material_delta_rice).toBe(0);

    // The teaching wants both mustard and dates.
    w.carried.material_mustard_seed = 3;
    expect(w.at('arriving', 'poi_quiet_atelier')).toBeNull();
    w.carried.material_date_fruit = 3;
    const teaching = w.at('arriving', 'poi_quiet_atelier')!;
    expect(teaching.art).toBe('guyuk-teaching');
    expect(w.held).toContain('recipe_seed_ball');

    expect(w.at('night')?.art).toBe('scene-rest-guyuk');
    expect(walkers(w.flags)).toEqual(['varuna', 'mithra']);
    expect(w.at('night')?.art).toBe('scene-rest-guyuk2');
    // Two walkers become three.
    expect(walkers(w.flags)).toEqual(['varuna', 'mithra', 'guyuk']);
    expect(nextBeat(guyuk, w.flags)).toBeNull();
  });

  it('never happens on another map', () => {
    const w = walker('field_map_lothal');
    expect(w.at('road')).toBeNull();
  });
});

describe("the princess's arc", () => {
  it('opens on the Fourteen, by the root tea it teaches', () => {
    const w = walker('field_map_narmada');
    expect(w.at('arriving', 'poi_basalt_quarry')).toBeNull();
    w.held.push('recipe_root_tea');
    expect(w.at('arriving', 'poi_basalt_quarry')?.art).toBe('asura-bathe-ruins');
  });

  it('goes ruins, terraces read, the University tank, the tablets, supper, bond, and she stays', () => {
    const w = walker('field_map_narmada', ['recipe_root_tea']);
    w.at('arriving', 'poi_basalt_quarry');
    // Her second quest: the terraces, read truly.
    expect(w.at('arriving', 'poi_narmada_university')).toBeNull();
    w.held.push('discovery_terrace_water');
    expect(w.at('arriving', 'poi_narmada_university')?.art).toBe('asura-bathe-settlement');
    expect(w.at('arriving', 'poi_cloud_stair')?.art).toBe('asura-teaching');
    expect(w.at('night')?.art).toBe('scene-rest-asura');
    expect(w.at('night')?.art).toBe('scene-rest-asura2');
    const farewell = w.at('arriving', 'poi_high_camp')!;
    expect(farewell.title).toBe('She stays');
    // She forms the bond and does not join: she has her people.
    expect(princess.joins).toBe(false);
    expect(walkers(w.flags)).toEqual(['varuna', 'mithra']);
  });
});

describe('the first day', () => {
  it('belongs to the place: a road or night beat waits for the second, an arrival does not', () => {
    const facts = (day: number, poiId: string | null = null): StoryFacts => ({
      fieldMapId: 'field_map_aravali', day, poiId, flags: [], holds: () => false, carried: () => 0
    });
    expect(beatNow('road', facts(0))).toBeNull();
    expect(beatNow('road', facts(1))?.title).toBe('Word of a herbalist');
  });
});

describe('every story beat has its painting', () => {
  it('draws the owner’s art for every beat that names one, not a fallback', async () => {
    const { existsSync } = await import('node:fs');
    const missing = storylines.flatMap((s) => s.beats.filter((b) => b.art && !existsSync(`src/ui/events/${b.art}.png`)).map((b) => `${s.id}:${b.id} (${b.art})`));
    expect(missing).toEqual([]);
  });
});

describe('every beat on the road or on arriving has a picture', () => {
  // The owner, 3 October 2026: Guyuk's rumour and the Atelier without her opened blank. A beat with
  // no painting of its own borrows a woven one of the same kind of moment (`BEAT_FALLBACK`).
  it('resolves to a painting that exists, its own or the fallback', async () => {
    const { existsSync } = await import('node:fs');
    const { beatEvent, BEAT_FALLBACK } = await import('../src/content/storylines');
    const painted = (name: string | undefined) => Boolean(name) && existsSync(`src/ui/events/${name}.png`);
    for (const arc of storylines) {
      for (const beat of arc.beats) {
        if (beat.when !== 'road' && beat.when !== 'arriving') continue;
        const e = beatEvent(arc, beat);
        expect(painted(e.art) || painted(e.artFallback), `${arc.id}/${beat.id} draws nothing`).toBe(true);
      }
    }
    for (const name of Object.values(BEAT_FALLBACK)) expect(painted(name), `${name} is not painted`).toBe(true);
  });
});
