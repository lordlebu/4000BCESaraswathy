import type { Point, World } from './types';

// Keep the historical canon id: discoveries, conversations and journals already refer to it.
export const CAVE_ID = 'poi_northwest_cave_camp';
export const CAVE_AT: Readonly<Point> = { x: 51, y: 12 };

export function inTwinHighlands(p: Point): boolean {
  return p.y >= 0 && p.x <= 63 && p.x >= 40 + Math.floor(p.y / 7)
    && p.y <= 22 - Math.floor(Math.max(0, p.x - 57) / 3);
}

/** A bounded authored addition, shared by generation and the one-time saved-ground migration. */
export function stampTwinHighlands(world: World): void {
  if (!world.twinRegion || world.twinRegion.highlands === 2) return;
  for (const row of world.tiles) for (const t of row) {
    if (!inTwinHighlands(t) || t.road || t.track || t.biome === 'settlement') continue;
    const snow = t.y <= 2 || (t.x >= 61 && t.y <= 17);
    const mountain = t.y <= 6 || (t.x >= 58 && t.y <= 19);
    const hill = t.x <= 44 || t.y >= 19 || (t.y <= 8 && t.x <= 48);
    t.biome = snow ? 'snow' : mountain ? 'mountains' : hill ? 'hills' : 'plains';
    t.elevation = snow ? .98 : mountain ? .87 : hill ? .77 : .72;
    t.moisture = .65;
    t.temperature = snow ? .12 : mountain ? .25 : .45;
  }
  // A narrow meltwater tributary skirts the camp's walking meadow, then joins the Saraswati.
  const main = world.rivers[0];
  const mouth = main?.path.find(p => p.y === 22);
  const bends: Point[] = [{x:56,y:2},{x:56,y:6},{x:58,y:6},{x:58,y:18},
    {x:54,y:18},{x:54,y:21},{x:45,y:21},{x:45,y:22},mouth ?? {x:32,y:22}];
  const stream: Point[] = [];
  let {x,y} = bends[0]!;
  const put = () => {
    const t = world.tiles[y]?.[x];
    if (!t || t.road || t.track || t.biome === 'settlement') return;
    t.biome = 'river'; t.elevation = .18; t.moisture = .95;
    if (!stream.some(p => p.x === x && p.y === y)) stream.push({x,y});
  };
  put();
  for (const bend of bends.slice(1)) {
    while (x !== bend.x) { x += Math.sign(bend.x-x); put(); }
    while (y !== bend.y) { y += Math.sign(bend.y-y); put(); }
  }
  // One river identity, with its tributary included; no invented lore river name.
  if (main) for (const p of stream) if (!main.path.some(q => q.x===p.x && q.y===p.y)) main.path.push(p);
  world.twinRegion.highlands = 2;
}
