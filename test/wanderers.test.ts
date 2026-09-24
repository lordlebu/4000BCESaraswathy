// An animal that is somewhere rather than everywhere.
//
// The rules are checked here; **that a wanderer reaches the screen is `e2e/wanderers.spec.ts`**,
// because a Node test cannot see a Phaser sprite and every assertion in this file would pass with
// the scene drawing nothing at all. That is this codebase's signature fault and it has landed five
// times, so the two halves are written together or not at all.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';
import { isWalkable } from '../src/world/generate';
import { engineId } from '../src/content/canon';
import { yieldsAt } from '../src/content/gathering';
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
import { GRID, markerSize } from '../src/game/frames';
import { PLAYER_FRAME, figureScale, travellerScale } from '../src/game/player';
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

describe('every authored wanderer actually resolves', () => {
  // The list in `wanderers.ts` is names; this is the check that each name finds a species in the
  // bundle and wins a circuit on real ground. A typo, a `lore` placement or a biome the map does
  // not grow all fail the same silent way -- `wanderersOn` drops them and the animal simply never
  // appears, which is this codebase's signature fault wearing a data hat.
  it('puts the whale and the sivatherium on the Narmada', () => {
    const on = wanderersOn('field_map_narmada', narmada()).map((w) => w.id);
    expect(on).toContain('narmada-walking-whale');
    expect(on).toContain('sivatherium');
  });

  it('puts Vasuki in the Dwarka desert', () => {
    const on = wanderersOn('field_map_dwarka', built('field_map_dwarka')).map((w) => w.id);
    expect(on).toContain('vasuki-indicus');
  });

  it('gives every one of them a circuit it can walk', () => {
    for (const map of ['field_map_narmada', 'field_map_dwarka']) {
      const world = built(map);
      for (const w of wanderersOn(map, world)) {
        expect(w.circuit.length, `${w.id} has no circuit on ${map}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('what the animals give is actually findable', () => {
  // **The check `check_playability.py` cannot make, and the fault it missed.** Canon's gate asks
  // whether a material is obtainable *somewhere* -- biome overlap with a species that yields it --
  // and all three of these passed it while being unobtainable in practice. The game picks the
  // creature on a tile by rendezvous hash weighted by rarity, then rolls again on the material's
  // own rarity, and the two multiply: a `mythic` serpent on a map with twenty desert tiles came
  // out at zero tiles across twelve seeds.
  //
  // Measured before it was asserted. After fixing the placement, over twelve seeds of the two
  // maps: snakeskin on 10 seeds, milk on 11, venom on 7 -- venom lowest because every venomous
  // snake in canon is desert-only and Dwarka has 20 desert tiles out of 4096. The floor is set at
  // 4 of 12, well under every measured value and well over the zero this caught.
  const SEEDS = 12;
  const FLOOR = 4;

  it('offers each animal material on most seeds, not in theory', () => {
    const want = ['material_shed_snakeskin', 'material_viper_venom', 'material_sivatherium_milk'];
    const seen: Record<string, Set<string>> = {};
    for (const w of want) seen[w] = new Set();

    for (let s = 0; s < SEEDS; s += 1) {
      const seed = `reach-${s}`;
      for (const map of ['field_map_narmada', 'field_map_dwarka']) {
        const world = built(map, seed);
        for (let y = 0; y < world.height; y += 1) {
          for (let x = 0; x < world.width; x += 1) {
            for (const m of yieldsAt(seed, { x, y }, world.tiles[y]![x]!.biome)) {
              if (want.includes(m.id)) seen[m.id]!.add(seed);
            }
          }
        }
      }
    }

    for (const w of want) {
      expect(
        seen[w]!.size,
        `${w} is gatherable on only ${seen[w]!.size} of ${SEEDS} seeds -- authored, exported, and ` +
          `effectively unreachable. Check the species' rarity and how much of its biome the map grows.`
      ).toBeGreaterThanOrEqual(FLOOR);
    }
  });
});

describe('an animal is drawn at the scale of the people on the road', () => {
  // **`tileTextures.ts` does not import `player.ts`, so this is where the two are held together.**
  // Same arrangement `travellers.ts` keeps with `dayNight.ts` and for the same reason: the
  // dependency would run the wrong way, so the agreement is asserted rather than shared.
  //
  // The rule: a wanderer is drawn to the same height as a traveller -- half the player, per
  // `TRAVELLER_SHRINK` -- and as wide as its own shape needs. The first version sized against the
  // tile instead and put the whale at nearly twice the player's width.
  it('is no taller than a traveller, and never as tall as the player', () => {
    const tile = GRID;
    const npcTall = PLAYER_FRAME.height * travellerScale(tile);
    const playerTall = PLAYER_FRAME.height * figureScale(tile);

    for (const id of ['narmada-walking-whale', 'sivatherium', 'vasuki-indicus']) {
      const h = markerSize(id).h;
      expect(h, `${id} is taller than a traveller`).toBeLessThanOrEqual(npcTall + 1);
      expect(h, `${id} is as tall as the player`).toBeLessThan(playerTall);
      expect(h, `${id} is too small to read`).toBeGreaterThan(npcTall * 0.4);
    }
  });

  it('keeps each animal its own shape', () => {
    // A giraffid is taller than it is long; a serpent is far longer than it is tall. If these ever
    // come out equal again, every animal is being drawn as the same body -- which is what happened.
    const whale = markerSize('narmada-walking-whale');
    const siva = markerSize('sivatherium');
    const vasuki = markerSize('vasuki-indicus');

    expect(siva.h, 'the giraffid is not standing up').toBeGreaterThan(siva.w);
    expect(whale.w / whale.h, 'the whale is not long and low').toBeGreaterThan(1.5);
    expect(vasuki.w / vasuki.h, 'the serpent is not long enough').toBeGreaterThan(2.5);
  });
});

describe('a map with nothing authored to wander', () => {
  it('is empty rather than inventing an animal', () => {
    expect(wanderersOn('field_map_lothal', built('field_map_lothal'))).toEqual([]);
  });
});

describe('a painted view is one animal', () => {
  // The builder used to cut each view by its bounding box, which brought a neighbour in wherever
  // one reached into the box: the sivatherium walking towards you had a strip of its own side view's
  // tail and hind leg down its left edge, and walking left, another antler in its top corner. A view
  // now keeps only its own blob -- `tools/build-wanderers.js` -- and this holds the shipped files to
  // it: one solid shape, and nothing solid apart from it bigger than a speck.
  const { decodePng } = createRequire(import.meta.url)('../tools/sprite-png.js') as {
    decodePng: (file: string) => { width: number; height: number; data: Uint8Array };
  };
  const DIR = join(__dirname, '..', 'assets', 'wanderers');
  const SOLID = 40; // the builder's own threshold: the glow is under it, the bodies well over
  const SPECK = 0.01;

  /** The sizes of every eight-connected run of solid pixels, biggest first. */
  function shapes(file: string): number[] {
    const { width: w, height: h, data } = decodePng(join(DIR, file));
    const seen = new Uint8Array(w * h);
    const sizes: number[] = [];
    for (let start = 0; start < w * h; start += 1) {
      if (seen[start] || data[start * 4 + 3]! <= SOLID) continue;
      let size = 0;
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        size += 1;
        const x = i % w;
        const y = (i / w) | 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const j = ny * w + nx;
            if (seen[j] || data[j * 4 + 3]! <= SOLID) continue;
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
      sizes.push(size);
    }
    return sizes.sort((a, b) => b - a);
  }

  const files = readdirSync(DIR).filter((f) => f.endsWith('.png'));

  it('has painted views to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s carries nothing of its neighbours', (file) => {
    const [animal, ...rest] = shapes(file);
    const strays = rest.filter((n) => n > animal! * SPECK);
    expect(strays, `${file}: pieces of another view cut in with it`).toEqual([]);
  });
});
