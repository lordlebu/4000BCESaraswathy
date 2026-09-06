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

describe('the camp at the terraces', () => {
  /**
   * **The camp belongs to somebody.** An earlier version pitched it beside a drift, which put a
   * settlement of nobody's on high ground near some snow -- eleven tiles from
   * `poi_herders_terraces`, which canon describes as "stone steps up a hillside, grazed by
   * goats" and gives to Marn. The plateau already had herders; the generator had put their houses
   * somewhere else.
   *
   * So this asserts the seam rather than a distance: canon says *there are herders here*, the
   * generator says *and their tents stand on these tiles*.
   */
  it('stands at the place canon named, without standing on it', () => {
    const country = new Set(tablelands(narmada.world)[0]!.map((p) => `${p.x},${p.y}`));
    const camp = narmada.world.tiles
      .flat()
      .filter((t) => t.biome === 'settlement' && country.has(`${t.x},${t.y}`));

    expect(camp.length, 'no camp was pitched on the tableland').toBeGreaterThan(0);
    // Small: a handful of tents rather than the university down on the plain.
    expect(camp.length, 'the camp is a town').toBeLessThan(30);

    const terraces = narmada.placed.find((p) => p.poi.id === 'poi_herders_terraces');
    expect(terraces, 'the terraces were not placed at all').toBeTruthy();

    // Wrapped around the place, not scattered near it.
    const away = Math.min(
      ...camp.map((c) => Math.abs(c.x - terraces!.at.x) + Math.abs(c.y - terraces!.at.y))
    );
    expect(away, 'the camp is not at the terraces').toBeLessThanOrEqual(2);

    // **The terrace tile keeps its own ground.** A hut standing on the place canon named would
    // make the arrival a building rather than the steps the prose describes.
    expect(
      narmada.world.tiles[terraces!.at.y]![terraces!.at.x]!.biome,
      'a tent was pitched on the terraces themselves'
    ).not.toBe('settlement');
  });

  /**
   * **Never on the snow**, which survives the move: a drift is the camp's water, and pitching on
   * it would be pitching on the water supply.
   *
   * What did *not* survive is "beside the snow". Measured at the terraces, the nearest drift is
   * fourteen tiles -- 5.3km, a morning's walk with goats rather than a step outside. That was my
   * reasoning for where the camp went before canon's own place overruled it, and asserting it
   * here would be keeping a justification the layout no longer has.
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
