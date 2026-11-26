import { campVisitors, runnerErrand } from './campLife';
import { stopsOf, travellersOn, wayBetween } from './travellers';
import { TWIN_MAP } from '../world/twinGeneration';
import { campable, type Encampment, type WayIn } from './encampments';
import { tileHash } from '../world/rng';
import type { Point, World } from '../world/types';

const pointKey = ({ x, y }: Point) => `${x},${y}`;
const gap = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Reserve the road company's actual circuits and the visitor legs for this camp's stay. */
export function twinCampRouteTiles(
  world: World,
  camp: Encampment,
  way: WayIn | null,
  places: readonly { poiId: string; at: Point }[]
): Set<string> {
  const placed = places.map(({ poiId, at }) => ({ poi: { id: poiId }, at }));
  const roster = travellersOn(TWIN_MAP, world.seed).map((t) => ({
    id: t.id, npcId: t.npcId, stops: stopsOf(t, placed)
  }));
  const reserved = new Set(way?.tiles.map(pointKey));
  for (const { stops } of roster) {
    if (stops.length < 2) continue;
    for (const [i, from] of stops.entries()) {
      const to = stops[(i + 1) % stops.length]!;
      for (const at of wayBetween(world, from, to)) reserved.add(pointKey(at));
    }
  }
  for (let day = camp.from; day < camp.to; day++) {
    const errand = runnerErrand(world, camp, way, roster, day);
    const visits = campVisitors(world, camp, way, roster, day, errand);
    for (const visit of visits) {
      for (const at of [...visit.there, ...visit.onward]) reserved.add(pointKey(at));
    }
  }
  return reserved;
}

/** Stay beyond the two rings reserved for camp chores, and outside the shared way in. */
export function twinCampDressingSpots(
  world: World,
  camp: Encampment,
  places: readonly Point[],
  occupied: ReadonlySet<string>
): Point[] {
  const spots: Point[] = [];
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== 3) continue;
      const at = { x: camp.at.x + dx, y: camp.at.y + dy };
      const key = pointKey(at);
      if (occupied.has(key) || !campable(world, at)) continue;
      if (places.some((place) => gap(at, place) <= 2)) continue;
      spots.push(at);
    }
  }
  const rank = ({ x, y }: Point) => tileHash(world.seed, x, y, `camp-dressing:${camp.id}`);
  const chosen: Point[] = [];
  for (const at of spots.sort((a, b) => rank(a) - rank(b))) {
    if (chosen.some((p) => gap(p, at) <= 1)) continue;
    chosen.push(at);
    if (chosen.length === 3) break;
  }
  return chosen;
}
