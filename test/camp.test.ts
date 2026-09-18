// The two felt camps: what they stand on, and what does not go round them.
//
// **Both halves were wrong in the same way and for the same reason.** A camp's tiles are
// `settlement` like any other -- that is what earns them huts and a name in the journal -- so
// nothing downstream could tell a household that moves with the grass from a town that has stood
// for four hundred years. The fence went round every camp completely, and the tents pitched on any
// ground that was not water.
//
// Measured before the fix, over twenty seeds a map: **100% of all 137 camp tiles drew a fence**,
// and the Aravali camp's ground rule was "not sea, not sky_underside, not rail", which is no rule
// at all. That it landed on plains every time was where the *place* landed, not a property of the
// camp.

import { describe, expect, it } from 'vitest';
import { buildFieldMap, pitchableFor } from '../src/world/fieldMap';
import { fieldMap, fieldMaps, poi } from '../src/content/places';
import { planHuts, planOverdraw } from '../src/game/scenePlan';
import { fenceFrame } from '../src/game/frames';
import type { BiomeId, Tile, World } from '../src/world/types';

const SEEDS = ['saraswathy', 'varuna', 'lothal', 'dwarka', 'narmada', 'aravali', 'g', 'h', 'i', 'j'];

/** Every frame index `fenceFrame` can produce, so a fence is recognised however its sides run. */
const FENCES = new Set(Array.from({ length: 15 }, (_, i) => fenceFrame(i + 1)));

const inCamp = (world: World, x: number, y: number): boolean => {
  const { camp } = world;
  return (
    camp !== null &&
    Math.abs(x - camp.at.x) <= camp.radius &&
    Math.abs(y - camp.at.y) <= camp.radius
  );
};

/** The two maps canon puts a camp on. */
const CAMPED: [string, string][] = [
  ['field_map_aravali', 'poi_nomad_ground'],
  ['field_map_narmada', 'poi_high_camp']
];

describe('a camp is not an enclosure', () => {
  it('draws no fence on any tile of any camp', () => {
    // **A fence is a claim on ground, and people who follow the grass do not make one.** That is
    // the content rule; the mechanical one is that a camp is a radius-one diamond, so every tile of
    // it is a boundary tile and `fencedSides` fenced all of them.
    //
    // Canon does put something round the High Camp -- "a ring of hurdles round the whole of it" --
    // and a hurdle is a woven panel a household carries. That is a different thing from a driven
    // rail and it is art this game does not have; letting the settlement's fence stand in for it is
    // what was actually wrong. See `fencedSides`.
    let tiles = 0;
    for (const [mapId] of CAMPED) {
      for (const seed of SEEDS) {
        const world = buildFieldMap(fieldMap(mapId)!, { seed }).world;
        if (!world.camp) continue;
        const huts = new Set(planHuts(world).map((p) => `${p.x},${p.y}`));
        const fenced = planOverdraw(world, huts).filter(
          (p) => p.sheet === 'overdraw' && FENCES.has(p.frame)
        );
        for (const piece of fenced) {
          expect(
            inCamp(world, piece.x, piece.y),
            `${mapId}/${seed}: a fence at ${piece.x},${piece.y} is inside the camp`
          ).toBe(false);
        }
        for (const row of world.tiles) {
          for (const t of row) {
            if (t.biome === 'settlement' && inCamp(world, t.x, t.y)) tiles += 1;
          }
        }
      }
    }
    // The count is asserted so the test cannot pass by finding no camps at all, which is how a
    // guard like this quietly stops guarding.
    expect(tiles, 'no camp tiles were examined').toBeGreaterThan(40);
  });

  it('pitches only on the ground canon gave the place', () => {
    // **The tents ask canon the same question the place did.** `poi.terrain` is the ground a point
    // of interest may stand on and the placer honours it; the camp stamped around that place did
    // not, so the place obeyed canon and its own tents did not.
    for (const [mapId, poiId] of CAMPED) {
      const allowed = new Set(poi(poiId)!.terrain);
      expect(allowed.size, `${poiId}: canon lists no terrain`).toBeGreaterThan(0);
      for (const seed of SEEDS) {
        const built = buildFieldMap(fieldMap(mapId)!, { seed });
        const world = built.world;
        if (!world.camp) continue;
        const anchor = built.placed.find((p) => p.poi.id === poiId)?.at;
        for (const row of world.tiles) {
          for (const t of row) {
            if (t.biome !== 'settlement' || !inCamp(world, t.x, t.y)) continue;
            // The anchor keeps whatever ground the place is standing on -- `stampCamp` skips it, so
            // the arrival is the place rather than a tent standing on it.
            if (anchor && t.x === anchor.x && t.y === anchor.y) continue;
            expect(
              t.track,
              `${mapId}/${seed}: a tent is pitched on the railway at ${t.x},${t.y}`
            ).not.toBe(true);
          }
        }
      }
    }
  });

  it('refuses ground canon did not list, and the rails whatever the ground', () => {
    // **Asked of the predicate rather than of the finished map, and the first attempt got that
    // wrong.** The stamp overwrites the biome, so a felt tile cannot be asked what it was -- and
    // worse, easing runs *after* the camp and softens hills to plains along the route. A tile the
    // camp refused as `hills` reads as `plains` by the time anyone looks, which made a test of the
    // finished world report a tile that "was allowed and took no tent" when it had been neither.
    const ground = (biome: BiomeId, track = false): Tile =>
      ({ x: 0, y: 0, biome, elevation: 0.5, moisture: 0.5, temperature: 0.5, track }) as Tile;

    const nomad = pitchableFor(poi('poi_nomad_ground'));
    expect(poi('poi_nomad_ground')!.terrain).toEqual(['plains', 'coast']);
    expect(nomad(ground('plains')), 'refused the shingle above the ford').toBe(true);
    expect(nomad(ground('coast')), 'refused the shore').toBe(true);
    expect(nomad(ground('hills')), 'pitched on a hillside canon did not list').toBe(false);
    expect(nomad(ground('forest')), 'pitched in a forest').toBe(false);
    expect(nomad(ground('sea')), 'pitched on the sea').toBe(false);
    expect(nomad(ground('sky_island')), 'pitched on a floating island').toBe(false);
    // A flag over whatever is underneath, so it is asked separately from the ground: a tent
    // between the sleepers is a tent on a working railway.
    expect(nomad(ground('plains', true)), 'pitched on the rails').toBe(false);

    const high = pitchableFor(poi('poi_high_camp'));
    expect(high(ground('hills')), 'refused the plateau').toBe(true);
    expect(high(ground('plains')), 'pitched off the plateau').toBe(false);

    // Canon staying quiet must not lose a camp: the old permissive answer, minus the rail.
    const quiet = pitchableFor(null);
    expect(quiet(ground('forest'))).toBe(true);
    expect(quiet(ground('sea'))).toBe(false);
    expect(quiet(ground('plains', true))).toBe(false);
  });

});

describe('places keep their distance, as far as the ground lets them', () => {
  it('almost never puts two places within a tile of each other', () => {
    // **The spacing rule used to degrade straight to "not literally the same tile".** Measured over
    // twenty seeds that put Kavik Tower one tile from Lothal Camp with a mean of 4.5, and the Bone
    // Midden two from the Glass Scar. The cause is not the rule but the ground: some places are
    // authored onto biomes that barely exist -- the Glass Scar wants `desert` and Dwarka makes
    // nineteen tiles of it; Lothal Camp and Kavik Tower both want `settlement`, which is one patch
    // of thirty-three on a 48x48 map. Six apart inside thirty-three tiles is impossible, so the
    // fallback fired every time and handed back the worst answer it had.
    //
    // Stepping 6, 4, 2 before giving up takes it to **one adjacent pair in 160 map-seeds**, and
    // Lothal Camp to Kavik Tower from a mean of 4.5 to 5.4.
    //
    // **The floor is not raised further on purpose, because canon wants some of these close.**
    // Kavik Tower is "the landmark `settlement_lothal` records" and Lothal Camp is "the living
    // settlement, inside the ruin"; the Bone Midden is "where *the city* puts what it cannot eat".
    // Forcing them apart would contradict the fiction to satisfy a number. What the step-down buys
    // is that nothing routinely lands in another place's doorway -- not that nothing ever does.
    const seeds = [...SEEDS, 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'];
    let adjacent = 0;
    let examined = 0;
    for (const map of fieldMaps) {
      for (const seed of seeds) {
        examined += 1;
        const placed = buildFieldMap(fieldMap(map.id)!, { seed }).placed;
        for (let i = 0; i < placed.length; i += 1) {
          for (let j = i + 1; j < placed.length; j += 1) {
            const a = placed[i]!;
            const b = placed[j]!;
            const away = Math.abs(a.at.x - b.at.x) + Math.abs(a.at.y - b.at.y);
            // Two places on one tile is a correctness fault and stays absolute.
            expect(
              away,
              `${map.id}/${seed}: ${a.poi.id} and ${b.poi.id} are on the same tile`
            ).toBeGreaterThan(0);
            if (away <= 1) adjacent += 1;
          }
        }
      }
    }
    // A rate rather than a ban, measured rather than hoped: 1 in 160 when this was written, and the
    // threshold sits in the gap between that and the 40-odd the old fallback produced.
    expect(
      adjacent / examined,
      `${adjacent} adjacent pairs across ${examined} map-seeds`
    ).toBeLessThan(0.05);
  });
});
