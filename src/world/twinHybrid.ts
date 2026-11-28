import { twinWorldSeed } from './twinGeneration';
import type { FieldMap, PointOfInterest } from '../content/places';
import type { FieldMapWorld } from './fieldMap';
import { findPath, pointKey, routeDistances } from './pathfind';
import { tileHash } from './rng';
import { crossingCost } from './routes';
import { buildTwinValleyBase, riverX, TWIN_ANCHORS, TWIN_MAP } from './twinCities';
import { CAVE_AT, inTwinHighlands } from './twinHighlands';
import type { Point, Tile } from './types';
import { generateFromProfile, type MapProfile } from './mapProfile';

export const TWIN_PROFILE: MapProfile = {
  id: TWIN_MAP, generation: 2, width: 64, height: 64, anchors: TWIN_ANCHORS, palette: 'sage'
};

const HARAPPA_ROAD = { x: 22, y: 27 };
const EAST_ROAD = { x: 46, y: 27 };
const LANDING_ROAD = { x: 46, y: 39 };

function valleyTerrain(seed: string, layout: string, profile: MapProfile) {
  const wave = (salt: string) => (tileHash(layout, 0, 0, salt) % 628) / 100;
  const bend = wave('hybrid:main-channel');
  const width = wave('hybrid:channel-width');
  const coast = wave('hybrid:shoreline');
  const quiet = (y: number) => Math.min(1, Math.max(0, (Math.abs(y - 26) - 3) / 5), Math.max(0, (43 - y) / 5));
  return {
    centre: (y: number) => riverX(seed, y) + Math.round(2 * Math.sin(y / 7 + bend) * quiet(y)),
    halfWidth: (y: number) => quiet(y) > .5 && Math.sin(y / 5 + width) > .45 ? 2 : 1,
    coastOffset: (x: number) => {
      // Keep the landing and cove approaches and delta outlet on the authored shore.
      const nearAnchor = Object.values(profile.anchors).some(p => p.y >= 47 && Math.abs(x - p.x) <= 2);
      return nearAnchor || (x >= 21 && x <= 39) ? 0 : Math.sin(x / 5 + coast) * 1.4;
    }
  };
}

function carveReaches(built: FieldMapWorld, centre: (y: number) => number, layout: string): boolean {
  const { world, placed } = built;
  const reachPaths: Point[][] = [];
  const water = new Map(world.rivers[0]!.path.map(p => [pointKey(p), p]));
  const main: Point[] = [];
  for (let y = 0; y < world.height; y++) {
    const point = { x: centre(y), y };
    if (world.tiles[y]?.[point.x]?.biome === 'sea') break;
    const previous = main.at(-1);
    if (previous && previous.x !== point.x) {
      const direction = Math.sign(point.x - previous.x);
      for (let x = previous.x + direction; x !== point.x + direction; x += direction) main.push({ x, y: y - 1 });
    }
    main.push(point);
  }
  reachPaths.push(main);
  const landmarks = new Set(placed.map(p => pointKey(p.at)));
  for (const [start, mouth, allowed, salt] of [
    [{ x: 56, y: 3 }, { x: centre(22), y: 22 }, (t: Tile) => t.y <= 22 && t.x >= centre(t.y), 'meltwater'],
    [{ x: 49, y: 33 }, { x: centre(44), y: 44 }, (t: Tile) => t.y >= 33 && t.y <= 44 && t.x >= centre(t.y), 'drain']
  ] as const) {
    const passable = (t: Tile) => allowed(t) && !t.track && !landmarks.has(pointKey(t)) &&
      t.biome !== 'sea' && t.biome !== 'settlement' &&
      !(salt === 'meltwater' && Math.abs(t.x - CAVE_AT.x) + Math.abs(t.y - CAVE_AT.y) < 3);
    const path = findPath(world.tiles, world.width, world.height, start, mouth, passable,
      t => 1 + (tileHash(layout, t.x, t.y, 'hybrid:' + salt) % 7) / 4);
    if (!path.length) return false;
    reachPaths.push([start, ...path]);
  }
  for (const [index, reach] of reachPaths.entries()) {
    let elevation = index === 1 ? .18 : index === 2 ? .15 : .12;
    const fall = (elevation - .12) / Math.max(1, reach.length - 1);
    for (const p of reach) {
      const tile = world.tiles[p.y]![p.x]!;
      if (tile.biome === 'sea' || (landmarks.has(pointKey(p)) && tile.biome !== 'river')) return false;
      elevation = Math.max(.12, Math.min(elevation, tile.elevation));
      tile.biome = 'river';
      tile.moisture = .95;
      tile.elevation = elevation;
      elevation -= fall;
      water.set(pointKey(p), p);
    }
  }
  world.twinRegion!.channels = reachPaths;
  world.rivers[0]!.path = [...water.values()];
  return true;
}

function connectRoads(built: FieldMapWorld): boolean {
  const { world, placed } = built;
  const bridges = new Set<string>();
  // The established road causeway can cross the main river anywhere along its existing row.
  for (let x = HARAPPA_ROAD.x; x <= EAST_ROAD.x; x++) bridges.add(pointKey({ x, y: HARAPPA_ROAD.y }));
  // The drain's dry district needs a short crossing into the floodplain and the landing route.
  for (const y of [39, 42, 49]) for (let x = 27; x <= 51; x++) {
    if (y === 49 && Math.abs(x - 32) > 2) continue;
    if (y !== 49 && Math.abs(x - 46) > 4) continue;
    bridges.add(pointKey({ x, y }));
  }
  for (const { at } of placed) if (world.tiles[at.y]![at.x]!.biome === 'river') bridges.add(pointKey(at));
  const { tiles, width, height } = world;
  const passable = (t: Tile) => t.biome !== 'sea' && (!t.track || t.biome !== 'river') &&
    (t.biome !== 'river' || bridges.has(pointKey(t)));
  const pathBetween = (from: Point, to: Point) => findPath(tiles, width, height, from, to, passable,
    t => t.road ? .8 : crossingCost(t) + (t.biome === 'river' ? 5 : 0) + (t.track ? 12 : 0));
  const mark = (path: readonly Point[]) => {
    for (const { x, y } of path) {
      const tile = tiles[y]![x]!;
      if (tile.track || tile.biome === 'sea' || Math.max(Math.abs(x - CAVE_AT.x), Math.abs(y - CAVE_AT.y)) <= 3) continue;
      tile.road = true;
      if (tile.biome === 'river') tile.bridge = true;
    }
  };
  const causeway = Array.from({ length: EAST_ROAD.x - HARAPPA_ROAD.x + 1 }, (_, i) =>
    ({ x: HARAPPA_ROAD.x + i, y: HARAPPA_ROAD.y }));
  mark(causeway);
  for (const [from, to] of [[EAST_ROAD, LANDING_ROAD],
    ...placed.map(({ at }): [Point, Point] => [at, at.x < 30 ? HARAPPA_ROAD : at.y < 33 ? EAST_ROAD : LANDING_ROAD])
  ] as [Point, Point][]) {
    if (pointKey(from) === pointKey(to)) continue;
    const path = pathBetween(from, to);
    if (path.length) mark([from, ...path]);
  }
  const visited = routeDistances(tiles, width, height, world.start,
    t => t.track || (t.biome !== 'sea' && (t.biome !== 'river' || t.bridge === true)));
  return placed.every(({ at }) => visited.has(pointKey(at)));
}

function residentialLots({ world, placed }: FieldMapWorld, layout: string): Point[] {
  const reserved = new Set(placed.flatMap(({ at }) =>
    [at, { x: at.x - 1, y: at.y }, { x: at.x + 1, y: at.y }, { x: at.x, y: at.y + 1 }].map(pointKey)));
  const court = placed.find(p => p.poi.id === 'poi_harappa_court')?.at;
  if (court) for (let x = court.x - 1; x <= court.x + 1; x++) reserved.add(pointKey({ x, y: court.y - 1 }));
  const lots: Point[] = [];
  for (const district of world.twinRegion!.districts) {
    const direction = 1 + tileHash(layout, district.x, district.y, 'hybrid:street') % 3;
    const offset = direction - 2;
    for (const row of world.tiles) for (const t of row) {
      if (Math.abs(t.x - district.x) + Math.abs(t.y - district.y) > district.radius || t.biome !== 'settlement'
        || t.track || reserved.has(pointKey(t))) continue;
      // A lane off the existing route leaves frontage and a clear path through the block.
      if (t.x === district.x + offset && Math.abs(t.y - district.y) <= 2) t.road = true;
      if (!t.road && tileHash(layout, t.x, t.y, 'hybrid:lot') % 5 !== 0) lots.push({ x: t.x, y: t.y });
    }
  }
  return lots;
}

function makeValley(map: FieldMap, seed: string, pois: readonly PointOfInterest[], layout: string) {
  const crossingSeed = twinWorldSeed(seed);
  const form = valleyTerrain(crossingSeed, layout, TWIN_PROFILE);
  return generateFromProfile(TWIN_PROFILE, () => {
    const built = buildTwinValleyBase(map, seed, pois, form);
    const phase = (tileHash(layout, 0, 0, 'hybrid:foothill') % 628) / 100;
    for (const row of built.world.tiles) for (const tile of row) {
      if (!inTwinHighlands(tile) || tile.biome !== 'hills' || tile.x < 46 || Math.abs(tile.y - CAVE_AT.y) < 3) continue;
      if (Math.sin(tile.x / 3 + tile.y / 5 + phase) > .55) {
        tile.biome = 'mountains';
        tile.elevation = .87;
      }
    }
    return built;
  }, [
    built => carveReaches(built, form.centre, layout),
    connectRoads,
    built => {
      built.world.twinRegion!.generation = 2;
      built.world.twinRegion!.residentialLots = residentialLots(built, layout);
      return true;
    }
  ]);
}

export function buildHybridTwinCities(map: FieldMap, seed: string, pois: readonly PointOfInterest[]): FieldMapWorld {
  for (let attempt = 0; attempt < 16; attempt++) {
    const layout = attempt === 0 ? seed : `${seed}:layout:${attempt}`;
    const built = makeValley(map, seed, pois, layout);
    if (built) return built;
  }
  throw new Error(`No navigable Twin Cities layout for ${seed}`);
}
