// Authored geography, seeded detail. This branch never runs for an older field map.
import { tileHash } from './rng';
import type { BiomeId, Point, Tile, World } from './types';
import type { FieldMap, PointOfInterest } from '../content/places';
import type { FieldMapWorld } from './fieldMap';

export const TWIN_MAP = 'field_map_twins';
export interface CityDistrict { id: 'harappa' | 'mohenjodaro'; name: string; x: number; y: number; radius: number }
export interface TwinRegion { districts: CityDistrict[]; rail: Point[]; stations: Point[] }
export const TWIN_ANCHORS: Record<string, Point> = {
  poi_harappa_court: { x: 18, y: 17 }, poi_earthen_workshop: { x: 15, y: 19 },
  poi_nesting_ruins: { x: 20, y: 19 }, poi_harappa_station: { x: 22, y: 25 },
  poi_brick_quarter: { x: 45, y: 35 }, poi_drain_court: { x: 48, y: 37 },
  poi_planted_ruins: { x: 42, y: 37 }, poi_twin_landing: { x: 40, y: 51 },
  poi_twin_causeway: { x: 34, y: 27 }, poi_desert_ground: { x: 12, y: 39 },
  poi_reed_junction: { x: 32, y: 49 }, poi_twin_cove: { x: 48, y: 50 }
};

export function districtAt(region: TwinRegion, p: Point): CityDistrict | undefined {
  // Dwarka uses the same radius-four diamond: 41 settlement tiles, nine across.
  return region.districts.find(d => Math.abs(d.x - p.x) + Math.abs(d.y - p.y) <= d.radius);
}

/** Low ruined walls meet rock and river banks. Roads and rails leave full-cell gates. */
export function cityEdges(world: World, p: Point): { wall: number; natural: number } {
  const tile = world.tiles[p.y]?.[p.x];
  if (!world.twinRegion || tile?.biome !== 'settlement' || tile.road || tile.track) return { wall: 0, natural: 0 };
  let wall = 0, natural = 0;
  for (const [i, [dx, dy]] of [[0, -1], [1, 0], [0, 1], [-1, 0]].entries()) {
    const next = world.tiles[p.y + dy]?.[p.x + dx];
    if (next?.biome === 'settlement') continue;
    if (next && ['hills', 'river', 'wetland'].includes(next.biome)) natural |= 1 << i;
    else wall |= 1 << i;
  }
  return { wall, natural };
}

export function riverX(seed: string, y: number): number {
  const shift = tileHash(seed, 0, 0, 'saraswati-bend') % 3 - 1;
  return 30 + Math.round(Math.sin(y / 10) * 2) + shift;
}

export function buildTwinCities(map: FieldMap, seed: string, pois: readonly PointOfInterest[]): FieldMapWorld {
  seed = seed.startsWith('twins:') ? seed : `twins:${seed}`;
  const width = 64, height = 64;
  const region: TwinRegion = { districts: [
    { id: 'harappa', name: 'Harappa', x: 18, y: 18, radius: 4 },
    { id: 'mohenjodaro', name: 'Mohenjodaro', x: 45, y: 36, radius: 4 }
  ], rail: [], stations: [{ x: 22, y: 25 }, { x: 45, y: 35 }] };
  const tiles: Tile[][] = [];
  const river: Point[] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    const rx = riverX(seed, y);
    for (let x = 0; x < width; x++) {
      const h = tileHash(seed, x, y, 'twin-ground');
      const coast = 56 - Math.max(0, x - 32) / 4 + Math.sin(x / 4) * 1.5;
      const water = Math.abs(x - rx) <= 1 || (y > 44 && [rx - (y - 44) / 2, rx + (y - 44) / 2].some(v => Math.abs(x - v) < 1.5));
      let biome: BiomeId = y > coast ? 'sea' : y > coast - 2 ? 'coast' : 'desert';
      let elevation = 0.25;
      if (biome === 'desert') {
        const ridge = Math.sin(x / 4) + Math.cos(y / 6);
        if (x < 24 && ridge > 0.9) { biome = 'hills'; elevation = 0.73; }
        if (Math.abs(x - rx) < 5) biome = 'plains';
        if (y > 44 && Math.abs(x - rx) < 11) biome = 'wetland';
      }
      if (water && biome !== 'sea') { biome = 'river'; river.push({x,y}); elevation = 0.12; }
      const district = districtAt(region, {x,y});
      if (district && !water && y < coast - 3) { biome = 'settlement'; elevation = 0.28; }
      // A rocky shoulder closes Harappa's northwest edge, outside its inhabited footprint.
      if (!district && x <= 18 && y <= 18 && Math.abs(x - 18) + Math.abs(y - 18) === 5) {
        biome = 'hills'; elevation = 0.73;
      }
      // A minor Saraswati channel follows the eastern terrace and rejoins the delta below.
      const terrace = (row: number) => row <= 40 ? 50 - Math.abs(row - 36) : 46;
      const side = terrace(y);
      if ((y >= 33 && y <= 44 && x >= side && x <= Math.max(side, terrace(y - 1), terrace(y + 1))) || (y === 44 && x >= rx && x <= 46)) {
        biome = 'river'; elevation = 0.12;
        if (!river.some(p => p.x === x && p.y === y)) river.push({x, y});
      }
      row.push({ x, y, biome, elevation, moisture: water ? 0.9 : biome === 'desert' ? 0.05 : 0.4, temperature: 0.65, riverBias: h / 0xffffffff });
    }
    tiles.push(row);
  }
  const world: World = { width, height, seed, tiles, camp: null, twinRegion: region,
    start: { x: 22, y: 25 }, settlement: {x:18,y:18,name:'Harappa'},
    landmark: {x:49,y:50,name:'The Quiet Coves',terrain:'coast'}, rivers:[{name:'The Saraswati',path:river}] };
  // Surveyed rail: a bend at the east end, not a straight animation between stations.
  for (let x=23;x<=44;x++) region.rail.push({x,y:25});
  for (let y=26;y<=35;y++) region.rail.push({x:44,y});
  for (const p of region.rail) { const t=tiles[p.y]![p.x]!;t.track=true;if(t.biome==='river')t.bridge=true; }
  const road = (a:Point,b:Point) => {
    let {x,y}=a;
    const put=()=>{const t=tiles[y]![x]!;if(!t.track){if(t.biome==='sea')t.biome='coast';t.road=true;if(t.biome==='river')t.bridge=true;}};
    put();while(x!==b.x){x+=Math.sign(b.x-x);put();}while(y!==b.y){y+=Math.sign(b.y-y);put();}
  };
  // A separate road deck, two rows south of the railway, then two columns east.
  road({x:22,y:27},{x:46,y:27});road({x:46,y:27},{x:46,y:39});
  for (const p of Object.values(TWIN_ANCHORS)) road(p,{x:p.x<30?22:46,y:p.x<30?27:39});
  road({x:22,y:25},{x:22,y:27});road({x:44,y:35},{x:46,y:35});
  const placed=pois.map(poi=>({poi,at:{...TWIN_ANCHORS[poi.id]!}}));
  for (const p of placed) {
    // Authored anchor terrain is authoritative; do not block the main river for a place.
    const t=tiles[p.at.y]![p.at.x]!;
    if (!p.poi.terrain.includes(t.biome) && t.biome!=='river') t.biome=p.poi.terrain[0]??'plains';
  }
  tiles[50]![49]!.biome='landmark';
  // The shore cannot leave tiny walkable islands off the connected mainland.
  const seen=new Set<string>(),queue:Point[]=[world.start];
  while(queue.length){const p=queue.pop()!,key=`${p.x},${p.y}`;if(seen.has(key))continue;seen.add(key);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const t=tiles[p.y+dy!]?.[p.x+dx!];if(t&&t.biome!=='sea'&&!seen.has(`${t.x},${t.y}`))queue.push(t);}}
  for(const row of tiles)for(const t of row)if(t.biome==='coast'&&!seen.has(`${t.x},${t.y}`))t.biome='sea';
  return {fieldMap:map,world,placed,unplaced:[]};
}
