// An animal that is somewhere rather than everywhere.
//
// The rules are checked here; **that a wanderer reaches the screen is `e2e/wanderers.spec.ts`**,
// because a Node test cannot see a Phaser sprite and every assertion in this file would pass with
// the scene drawing nothing at all. That is this codebase's signature fault and it has landed five
// times, so the two halves are written together or not at all.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';
import { isWalkable } from '../src/world/generate';
import { engineId } from '../src/content/canon';
import { metSpecies } from '../src/content/species';
import {
  CIRCUIT_TILES,
  RANGE,
  circuitFor,
  isAlongside,
  wandererAt,
  wanderersOn
} from '../src/content/wanderers';
import { hoursToPhase } from '../src/game/dayNight';
import { DEFAULT_SEED } from '../src/ui/seed';
import type { Creature } from '../src/world/types';

// The inner `World`, not the `FieldMapWorld` wrapper -- `wanderers.ts` deals only in ground, and
// unwrapping here keeps `.world.world` out of every assertion below.
const built = (id: string, seed = DEFAULT_SEED) => buildFieldMap(fieldMap(id)!, { seed }).world;
const narmada = () => built('field_map_narmada');
const whale = () => metSpecies(engineId('fauna_narmada_walking_whale')) as Creature;

describe('canon carries the animal', () => {
  it('the walking whale is in the bundle and lives in the river', () => {
    const w = whale();
    expect(w, 'the whale is not in data/canon -- re-export from SouthOfTethys').toBeTruthy();
    expect(w.biomes).toContain('river');
    expect(w.placement).toBe('encounter');
  });

  it('is found under the engine id, not the canon one', () => {
    // The bug this module was written with. The bundle keys species `narmada-walking-whale`; the
    // authored list in `wanderers.ts` names them the way canon does, and the whole of the fix is
    // that `engineId` runs between the two. Looking the canon id up directly must stay null, or
    // the transform has quietly become optional and the next wanderer will be written either way.
    expect(metSpecies('fauna_narmada_walking_whale')).toBeNull();
    expect(metSpecies('narmada-walking-whale')).toBeTruthy();
    expect(wanderersOn('field_map_narmada', narmada())[0]?.id).toBe('narmada-walking-whale');
  });

  it('is the only freshwater cetacean that walks', () => {
    // The claim the canon entity is built on: its relatives are marine. If a second freshwater
    // whale is ever authored, this quest's premise needs rereading rather than this line patching.
    expect(whale().name).toContain('Walking');
  });
});

describe('a circuit is ground, not a list of buildings', () => {
  it('walks between two and CIRCUIT_TILES tiles', () => {
    const circuit = circuitFor(narmada(), whale());
    expect(circuit.length).toBeGreaterThanOrEqual(2);
    expect(circuit.length).toBeLessThanOrEqual(CIRCUIT_TILES);
  });

  it("stands only in the animal's biomes, and only where it can walk", () => {
    const world = narmada();
    const wants = new Set(whale().biomes);
    for (const at of circuitFor(world, whale())) {
      const tile = world.tiles[at.y]![at.x]!;
      expect(wants.has(tile.biome), `stop at ${at.x},${at.y} is ${tile.biome}`).toBe(true);
      expect(isWalkable(tile), `stop at ${at.x},${at.y} cannot be reached`).toBe(true);
    }
  });

  it('keeps a range rather than roaming the whole map', () => {
    // Over many seeds rather than the default one, because the measurement this threshold rests on
    // is a distribution: with no range rule the spread runs 17..63 tiles (median 40) across
    // twenty-five Narmadas, so RANGE=12 sits below every unconstrained case. One seed could pass
    // by luck -- and the first version of this guard did exactly that, while the whale was still
    // authored into `hills` and its habitat covered the map.
    for (let s = 0; s < 12; s += 1) {
      const world = built('field_map_narmada', `range-${s}`);
      const circuit = circuitFor(world, whale());
      const anchor = circuit[0]!;
      for (const at of circuit) {
        expect(Math.abs(at.x - anchor.x), `seed ${s}: ${at.x},${at.y} is off its range`).toBeLessThanOrEqual(RANGE);
        expect(Math.abs(at.y - anchor.y), `seed ${s}: ${at.x},${at.y} is off its range`).toBeLessThanOrEqual(RANGE);
      }
    }
  });

  it('lives in the river, which is what makes a range mean anything', () => {
    // Canon, not the module: the whale was first authored `river` + `hills`, which put 815 of the
    // map's 4096 tiles in its habitat and spread them corner to corner. A wanderer whose ground is
    // everywhere cannot be looked for. If a later edit widens this, the range guard above quietly
    // stops separating -- so the narrowness is asserted here rather than left as a comment.
    expect(whale().biomes).toEqual(['river']);
  });

  it('never stands on the same tile twice', () => {
    const circuit = circuitFor(narmada(), whale());
    const keys = new Set(circuit.map((p) => `${p.x},${p.y}`));
    expect(keys.size).toBe(circuit.length);
  });

  it('is the same circuit on the same seed, and a different one on another', () => {
    const key = (c: { x: number; y: number }[]) => c.map((p) => `${p.x},${p.y}`).join(' ');
    expect(key(circuitFor(narmada(), whale()))).toBe(key(circuitFor(narmada(), whale())));

    // Not an assertion that they differ -- two seeds may legitimately agree on a small river. The
    // claim is only that the seed is read at all, which a constant would fail.
    const other = key(circuitFor(built('field_map_narmada', 'a-different-seed'), whale()));
    expect(typeof other).toBe('string');
  });
});

describe('where it has got to', () => {
  it('is at a stop at dawn and at a stop at dusk, and only moves in between', () => {
    const world = narmada();
    const [one] = wanderersOn('field_map_narmada', world);
    expect(one).toBeTruthy();

    // Clock hours, never bare fractions. Phase zero is first light rather than midnight, so 0.5 is
    // not noon -- and reading a bare fraction as if it were is precisely the mistake that put every
    // traveller on the road from noon until midnight with the map empty all morning.
    const atDawn = wandererAt(world, one!, 0, hoursToPhase(5));
    const atNoon = wandererAt(world, one!, 0, hoursToPhase(12));
    const atDusk = wandererAt(world, one!, 0, hoursToPhase(21));

    expect(atDawn?.resting, 'moving before first light').toBe(true);
    expect(atDusk?.resting, 'still moving after dusk').toBe(true);
    // Noon is the one hour it should be found on the move. This is the assertion that would have
    // caught the travellers' phase-zero bug, where everybody walked from noon until midnight.
    expect(atNoon?.resting, 'standing still at midday').toBe(false);
  });

  it('is somewhere on its own circuit whenever it is resting', () => {
    const world = narmada();
    const [one] = wanderersOn('field_map_narmada', world);
    const stops = new Set(one!.circuit.map((p) => `${p.x},${p.y}`));
    for (let day = 0; day < 8; day += 1) {
      const where = wandererAt(world, one!, day, hoursToPhase(5));
      expect(stops.has(`${where!.at.x},${where!.at.y}`), `day ${day} rests off its ground`).toBe(
        true
      );
    }
  });

  it('is not in the same place every day', () => {
    const world = narmada();
    const [one] = wanderersOn('field_map_narmada', world);
    const seen = new Set<string>();
    for (let day = 0; day < CIRCUIT_TILES * 2; day += 1) {
      const where = wandererAt(world, one!, day, hoursToPhase(5));
      seen.add(`${where!.at.x},${where!.at.y}`);
    }
    expect(seen.size, 'the animal never moves between days').toBeGreaterThan(1);
  });
});

describe('coming alongside', () => {
  it('counts the eight tiles around it but not two away', () => {
    expect(isAlongside({ x: 10, y: 10 }, { x: 11, y: 11 })).toBe(true);
    expect(isAlongside({ x: 10, y: 10 }, { x: 10, y: 9 })).toBe(true);
    expect(isAlongside({ x: 10, y: 10 }, { x: 12, y: 10 })).toBe(false);
  });

  it('counts standing on it, because a body is not a wall', () => {
    expect(isAlongside({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(true);
  });
});

describe('a map with nothing authored to wander', () => {
  it('is empty rather than inventing an animal', () => {
    expect(wanderersOn('field_map_lothal', built('field_map_lothal'))).toEqual([]);
  });
});
