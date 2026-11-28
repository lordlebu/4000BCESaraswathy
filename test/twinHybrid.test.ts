// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { fieldMap } from '../src/content/places';
import { buildFieldMap } from '../src/world/fieldMap';
import { rebake, worldFor } from '../src/world/bake';
import { pointKey, routeDistances } from '../src/world/pathfind';
import { TWIN_MAP } from '../src/world/twinCities';
import { applyProfileBoundary, boundaryFor, generateFromProfile, type FieldBoundary } from '../src/world/mapProfile';
import { TWIN_PROFILE } from '../src/world/twinHybrid';
import { MAX_TWIN_TERRAIN_FRAMES, terrainAtlasLayout, terrainColourFor, twinTerrainProfile } from '../src/game/twinTerrain';
import { railMask, tramOnRail, usesRailDetailFrame } from '../src/game/twinRail';

const map = fieldMap(TWIN_MAP)!;
const build = (seed: string) => buildFieldMap(map, { seed });

it('resolves both sides of an authored edge independently of generation order', () => {
  const coast = { ...TWIN_PROFILE, id: 'test-coast', width: 3, height: 3, anchors: {} };
  const plateau = { ...coast, id: 'test-plateau', palette: 'olive' };
  const edge: FieldBoundary = {
    a: { mapId: coast.id, edge: 'east' },
    b: { mapId: plateau.id, edge: 'west' },
    reversed: true,
    samples: [
      { elevation: .3, biome: 'coast', road: false },
      { elevation: .1, biome: 'river', road: true },
      { elevation: .8, biome: 'hills', road: false }
    ]
  };
  const far = boundaryFor(plateau, edge);
  expect(boundaryFor(coast, edge)?.samples).toEqual(edge.samples);
  expect(far?.samples).toEqual([...edge.samples].reverse());
  expect(boundaryFor(plateau, edge)).toEqual(far);
  expect(boundaryFor(TWIN_PROFILE, edge)).toBeNull();
  const fixture = (profile: typeof coast) => generateFromProfile(profile, () => {
    const {world} = buildFieldMap(map, {seed: 'edge-fixture'});
    const tiles = world.tiles.slice(0, 3).map(row => row.slice(0, 3));
    Object.assign(tiles[0]![2]!, {biome: 'river', road: true, bridge: true});
    return {world: {...world, width: 3, height: 3, tiles, rivers: [], twinRegion: undefined},
      fieldMap: map, placed: [], unplaced: []};
  }, [built => {applyProfileBoundary(built.world, profile, edge); return true;}])!.world;
  const samples = (world: ReturnType<typeof fixture>, x: number) => world.tiles.map(row => {
    const t = row[x]!;
    return [t.elevation, t.biome, !!t.road, !!t.bridge];
  });
  const east = fixture(plateau);
  const west = fixture(coast);
  expect(samples(west, 2)).toEqual([...samples(east, 0)].reverse());
  expect(samples(west, 2)[0]).toEqual([.3, 'coast', false, false]);
  expect(samples(east, 0)[1]).toEqual([.1, 'river', true, true]);
  expect(fixture(plateau)).toEqual(east);
  const sage = twinTerrainProfile('sage');
  const olive = {...twinTerrainProfile('olive'), art: () => ({key: 'fixture-ground', frame: 0}), highland: () => false};
  expect(terrainAtlasLayout(east, olive).cells[1]![0]!.art.key).toBe('fixture-ground');
  expect(terrainColourFor('turf', olive.palette)).not.toBe(terrainColourFor('turf', sage.palette));
});

it('restores the same generated valley for a current bake', () => {
  const seed = 'current-valley';
  const built = worldFor(map, seed);
  expect(built.world.twinRegion?.generation).toBe(2);
  expect(worldFor(map, seed).world.twinRegion).toEqual(built.world.twinRegion);
});

it('preserves protected places and crossing geometry while varying the valley across 20 seeds', () => {
  const waterways = new Set<string>();
  const dwellings = new Set<string>();
  for (let n = 0; n < 20; n++) {
    const seed = 'hybrid-review-' + n;
    const built = build(seed);
    const { world, placed } = built;
    const region = world.twinRegion!;
    expect(region.generation).toBe(2);
    expect(placed).toHaveLength(16);
    for (const { poi, at } of placed) expect(at, poi.id).toEqual(TWIN_PROFILE.anchors[poi.id]);
    expect(region.rail[0]).toEqual({ x: 23, y: 25 });
    expect(region.rail.at(-1)).toEqual({ x: 44, y: 35 });
    for (const y of [25, 27]) {
      expect(world.tiles[y]!.filter(t => t.bridge).length).toBeGreaterThan(0);
    }
    const distances = routeDistances(world.tiles, world.width, world.height, world.start,
      t => t.track || (t.biome !== 'sea' && (t.biome !== 'river' || t.bridge === true)));
    for (const { poi, at } of placed) expect(distances.has(pointKey(at)), poi.id).toBe(true);
    expect(world.tiles.flat().some(t => t.road && t.biome === 'sea')).toBe(false);
    expect(region.channels).toHaveLength(3);
    const main = new Set(region.channels![0]!.map(pointKey));
    for (const branch of region.channels!.slice(1)) expect(main.has(pointKey(branch.at(-1)!))).toBe(true);
    for (const reach of region.channels!) for (const [i, p] of reach.entries()) {
      expect(world.tiles[p.y]![p.x]!.biome).toBe('river');
      if (i > 0) {
        const previous = reach[i - 1]!;
        expect(Math.abs(p.x - previous.x) + Math.abs(p.y - previous.y)).toBe(1);
        expect(world.tiles[p.y]![p.x]!.elevation).toBeLessThanOrEqual(world.tiles[previous.y]![previous.x]!.elevation);
      }
    }
    expect(region.residentialLots!.length).toBeGreaterThan(2);
    for (const p of region.residentialLots!) {
      const tile = world.tiles[p.y]![p.x]!;
      expect(tile.track || tile.road).toBeFalsy();
      expect(tile.biome).toBe('settlement');
    }
    waterways.add(JSON.stringify(region.channels));
    dwellings.add(JSON.stringify(region.residentialLots));
    expect(rebake(built)?.world.twinRegion).toEqual(region);
    expect(terrainAtlasLayout(world, twinTerrainProfile('sage')).unique.size).toBeLessThanOrEqual(MAX_TWIN_TERRAIN_FRAMES);
  }
  expect(waterways.size).toBeGreaterThan(5);
  expect(dwellings.size).toBeGreaterThan(5);
  expect(build('hybrid-review-0')).toEqual(build('hybrid-review-0'));
});

it('joins the replacement rail frames and holds the same centreline in both directions', () => {
  const region = build('hybrid-review-0').world.twinRegion!;
  const route = [region.stations[0]!, ...region.rail, region.stations[1]!];
  const reversed = [...route].reverse();
  expect(route.filter((_, i) => usesRailDetailFrame(railMask(route, i)))).toHaveLength(4);
  const steps = (route.length - 1) * 32;
  let last = route[0]!;
  for (let n = 0; n <= steps; n++) {
    const progress = n / steps;
    const next = tramOnRail(route, progress).at;
    const back = tramOnRail(reversed, 1 - progress).at;
    expect(next.x).toBeCloseTo(back.x, 8);
    expect(next.y).toBeCloseTo(back.y, 8);
    expect(Math.hypot(next.x - last.x, next.y - last.y)).toBeLessThan(.07);
    last = next;
  }
  expect(last).toEqual(route.at(-1));
});
