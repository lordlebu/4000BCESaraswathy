import { afterEach, describe, expect, it, vi } from 'vitest';
import { bakeWorld, restoreWorld, worldFor } from '../src/world/bake';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap, npcsAt } from '../src/content/places';
import { canHappen, events } from '../src/content/events';
import { reachableFrom } from '../src/world/generate';

const map = fieldMap('field_map_twins')!;
const additions = ['poi_dune_windbreak','poi_reedwright_bank','poi_nesting_cove'];
afterEach(() => vi.unstubAllGlobals());

function olderValley() {
  const built = buildFieldMap(map, { seed: 'expansion-save' });
  built.world.tiles[1]![1]!.biome = 'coast'; // A saved detail a fresh generator cannot recreate.
  for (const [left,right,y] of [[9,21,32],[38,45,47],[47,54,51]]) {
    for(let x=left!;x<=right!;x++) {const t=built.world.tiles[y!]![x]!;delete t.road;delete t.bridge;}
  }
  const baked = bakeWorld(built);
  baked.placed = baked.placed.filter(([id]) => !additions.includes(id));
  return baked;
}

describe('the additive valley expansion', () => {
  it('adds all three new stops to a saved valley without rerolling its ground or old places', () => {
    const old = olderValley(), restored = restoreWorld(old, map)!;
    expect(restored.world.tiles[1]![1]!.biome).toBe('coast');
    expect(restored.placed).toHaveLength(15);
    for(const [id,x,y] of old.placed)expect(restored.placed.find(p=>p.poi.id===id)?.at).toEqual({x,y});
    const reached=reachableFrom(restored.world.tiles,64,64,restored.world.start);
    for(const id of additions){const p=restored.placed.find(p=>p.poi.id===id)!;expect(reached.has(`${p.at.x},${p.at.y}`)).toBe(true);}
    const once=bakeWorld(restored);
    expect(bakeWorld(restoreWorld(once,map)!)).toEqual(once);
  });

  it('keeps restored ground when persisting the added places hits a full storage quota', () => {
    vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(olderValley()),setItem:()=>{throw new Error('quota');}});
    expect(worldFor(map,'expansion-save').world.tiles[1]![1]!.biome).toBe('coast');
  });

  it('keeps the new residents in their places and makes every new happening reachable', () => {
    expect(npcsAt('poi_reedwright_bank').map(n=>n.id)).toContain('npc_reedwright_irekha');
    expect(npcsAt('poi_nesting_cove').map(n=>n.id)).toContain('npc_cove_watcher_ulenna');
    const added=events.filter(e=>e.id.startsWith('happening_valley_'));
    expect(added).toHaveLength(6);
    for(const event of added)expect(canHappen(event,{occasion:'arriving',fieldMapId:map.id,day:0,shelter:null,poiId:event.conditions.pois[0],holds:event.conditions.requires,seen:[]})).toBe(true);
  });
});
