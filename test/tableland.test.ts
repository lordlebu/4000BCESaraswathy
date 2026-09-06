// The country a scarp encloses, the snow on it, and the camp beside the snow.
//
// What these guard, in order of how expensive the fault would be:
//
//   * the rule finds Narmada's tableland and **does not** invent one on a delta or a basin --
//     a size floor is what keeps it from naming a map by id;
//   * snow lands as drifts inside that country, never as a climate band and never on the peaks;
//   * the camp is beside the snow rather than on it, which is the whole reason it is up there.

import { describe, expect, it } from 'vitest';
import { tablelands } from '../src/world/tableland';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, fieldMaps } from '../src/content/places';
import { THRESHOLDS } from '../src/world/classify';
import { DEFAULT_SEED } from '../src/ui/seed';

/**
 * **Built with the seed a player actually has**, not `buildFieldMap`'s default.
 *
 * That default is the map's own id, which makes a stable world for a test that only cares about
 * shape -- and a *different* world from the one on screen. Measuring the tableland under it gave
 * numbers that disagreed with the running game at the same coordinates, and the hunt went through
 * the bake, the URL parameters and the scene wiring before the answer turned out to be two seeds.
 *
 * Anything asserting what a player sees has to use this.
 */
const worlds = fieldMaps.map((map) => ({
  id: map.id,
  built: buildFieldMap(map, { seed: DEFAULT_SEED })
}));
const narmada = buildFieldMap(fieldMap('field_map_narmada')!, { seed: DEFAULT_SEED });

describe('the country inside the scarp', () => {
  /**
   * **The rule has to pick out the plateau without being told which map it is.**
   *
   * Measured: flood-filled, Narmada's enclosed ground is one patch of 541 tiles. Lothal's largest
   * is 23 and Dwarka's 30 -- incidental dips in a delta and a coastal basin. Two orders of
   * magnitude apart, which is what lets a floor of 100 separate "a tableland" from "a hollow"
   * without a map id appearing anywhere in the code.
   */
  it('finds the plateau, and only the plateau', () => {
    const found = new Map(worlds.map((w) => [w.id, tablelands(w.built.world)]));

    const plateau = found.get('field_map_narmada')!;
    expect(plateau.length, 'the Narmada has no enclosed country').toBe(1);
    expect(plateau[0]!.length, 'the tableland is too small to be one').toBeGreaterThan(400);

    for (const id of ['field_map_lothal', 'field_map_dwarka']) {
      expect(found.get(id), `${id} is a delta or a basin and has no tableland`).toEqual([]);
    }
  });

  it('is high ground with high ground all round it', () => {
    const country = tablelands(narmada.world)[0]!;
    for (const at of country) {
      const here = narmada.world.tiles[at.y]![at.x]!;
      expect(here.elevation, `${at.x},${at.y} is not upland`).toBeGreaterThan(THRESHOLDS.HILLS);
      // Every neighbour as high or higher: this is the interior, not the rim the cliff is drawn on.
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ] as const) {
        const next = narmada.world.tiles[at.y + dy]?.[at.x + dx];
        expect(next, `${at.x},${at.y} is on the map edge, not enclosed`).toBeTruthy();
        expect(next!.elevation, `${at.x},${at.y} looks off the scarp`).toBeGreaterThan(
          THRESHOLDS.HILLS
        );
      }
    }
  });
});

describe('snow on the tableland', () => {
  /**
   * **Drifts, not a snowline.** The obvious rule is "above elevation X is snow", and measured it
   * puts snow on Narmada's *peaks* -- and on eleven tiles of Lothal, which is a river delta.
   *
   * This asserts the shape that distinguishes them: every snow tile inside the enclosed country,
   * none above the mountain threshold, and few enough patches to read as drifts left over rather
   * than as a climate.
   */
  it('lies inside the enclosed country, and below the peaks', () => {
    const country = new Set(tablelands(narmada.world)[0]!.map((p) => `${p.x},${p.y}`));
    const snow: string[] = [];
    for (const row of narmada.world.tiles) {
      for (const tile of row) {
        if (tile.biome !== 'snow') continue;
        snow.push(`${tile.x},${tile.y}`);
        expect(
          tile.elevation,
          `snow at ${tile.x},${tile.y} is on a peak, not a drift`
        ).toBeLessThanOrEqual(THRESHOLDS.MOUNTAINS);
      }
    }

    expect(snow.length, 'no snow was stamped at all').toBeGreaterThan(0);
    const off = snow.filter((at) => !country.has(at));
    expect(off, 'snow spilled off the tableland').toEqual([]);
  });

  it('leaves the delta and the basin bare', () => {
    // Snow is in Narmada's palette and nobody else's, so this also catches the day somebody makes
    // it a climate the classifier can produce anywhere.
    for (const { id, built } of worlds) {
      if (id === 'field_map_narmada') continue;
      const snow = built.world.tiles.flat().filter((t) => t.biome === 'snow');
      expect(snow.map((t) => `${t.x},${t.y}`), `${id} has snow on it`).toEqual([]);
    }
  });
});

describe('the High Camp', () => {
  /**
   * **The camp is canon's place now, and that is the third and last answer.**
   *
   * It began as a settlement patch pitched beside a drift, belonging to nobody. Then it was
   * anchored to `poi_herders_terraces`, which at least gave it Marn -- but the terraces are a
   * `wilderness`, stone steps grazed by goats, not somewhere anyone sleeps. Canon now names the
   * place itself: `poi_high_camp`, two felt tents, the **second settlement** on a map whose first
   * is nine halls that have measured things for four hundred years.
   *
   * So this asserts the seam. Canon says where the camp is; the generator says which tiles its
   * tents stand on.
   */
  it('pitches its tents at the place canon named, without standing on it', () => {
    const camp = narmada.placed.find((p) => p.poi.id === 'poi_high_camp');
    expect(camp, 'poi_high_camp was not placed at all').toBeTruthy();

    const country = new Set(tablelands(narmada.world)[0]!.map((p) => `${p.x},${p.y}`));
    expect(country.has(`${camp!.at.x},${camp!.at.y}`), 'the camp is off the tableland').toBe(true);

    const tents = narmada.world.tiles
      .flat()
      .filter(
        (t) =>
          t.biome === 'settlement' &&
          Math.abs(t.x - camp!.at.x) + Math.abs(t.y - camp!.at.y) <= 1
      );
    expect(tents.length, 'no tents were pitched').toBeGreaterThan(0);
    // **Two tents, not a village.** The number is canon's and it is the point: it is what makes
    // the University's nine halls read as an institution rather than a bigger version of this.
    expect(tents.length, 'the camp has grown into a village').toBeLessThanOrEqual(4);

    // The place canon named keeps its own ground, so the arrival is the camp rather than a tent
    // standing on it.
    expect(
      narmada.world.tiles[camp!.at.y]![camp!.at.x]!.biome,
      'a tent was pitched on the place itself'
    ).not.toBe('settlement');
  });

  /**
   * **Felt, not brick.** The tents are `settlement` tiles like any other -- that is what earns
   * them buildings, a fence and a name in the journal -- so the only thing separating a nomad
   * camp from a village is which frames it may draw. `World.camp` is what carries that, and
   * without it the renderer would put mud-brick huts on a plateau nobody builds on.
   */
  it('is marked as a camp, so it draws tents rather than houses', () => {
    const camp = narmada.placed.find((p) => p.poi.id === 'poi_high_camp')!;
    expect(narmada.world.camp, 'the camp was not recorded on the world').toBeTruthy();
    expect(narmada.world.camp!.at).toEqual(camp.at);
  });

  /**
   * Never on the snow: a drift is the camp's water, and pitching on it would be pitching on the
   * water supply. Canon's own placement puts this beside one, which is the reasoning the earlier
   * guessed position had and lost.
   */
  it('is never pitched on a drift', () => {
    const snow = new Set(
      narmada.world.tiles
        .flat()
        .filter((t) => t.biome === 'snow')
        .map((t) => `${t.x},${t.y}`)
    );
    const camp = narmada.world.tiles.flat().filter((t) => t.biome === 'settlement');
    expect(snow.size, 'no snow to avoid').toBeGreaterThan(0);
    expect(camp.filter((c) => snow.has(`${c.x},${c.y}`)), 'a tent is on the snow').toEqual([]);
  });

  it('is the same camp every time this world is built', () => {
    // The world is baked once and kept, so a camp that moved between builds would move under a
    // journey already walking on it.
    const again = buildFieldMap(fieldMap('field_map_narmada')!, { seed: DEFAULT_SEED });
    const one = narmada.world.tiles.flat().filter((t) => t.biome === 'settlement').map((t) => `${t.x},${t.y}`);
    const two = again.world.tiles.flat().filter((t) => t.biome === 'settlement').map((t) => `${t.x},${t.y}`);
    expect(two).toEqual(one);
  });
});
