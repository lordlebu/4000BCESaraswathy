// Asking a keeper about the road: everybody who keeps a road can say how the map is left.

import { describe, expect, it } from 'vitest';
import { fieldMaps, poi } from '../src/content/places';
import { aboutTheRoad } from '../src/content/roadTalk';

describe('asking about the road', () => {
  it('every map with a road has somebody who can be asked, and they name the yard', () => {
    for (const map of fieldMaps) {
      if (map.roads.length === 0) continue;
      const keepers = [...new Set(map.roads.map((r) => r.keeper.npc))];
      for (const npcId of keepers) {
        const said = aboutTheRoad(map.id, npcId);
        expect(said, `${map.id}: ${npcId} keeps a road and cannot say so`).not.toBeNull();
        for (const id of map.departsFrom) {
          const name = poi(id)!.name.replace(/^The /, 'the ');
          expect(said!.line, `${map.id}: ${npcId} does not say where the cart leaves`).toContain(name);
          expect(said!.hint).toContain(name);
        }
        expect(said!.hint).toMatch(/Travel/);
      }
    }
  });

  it('names only their own roads: on Lothal, Thrali the dhow to the Aravali, Kunch the carts inland', () => {
    const thrali = aboutTheRoad('field_map_lothal', 'npc_thrali')!.line;
    expect(thrali).toMatch(/dhow/i);
    expect(thrali).toMatch(/Aravali/);
    expect(thrali).not.toMatch(/Dwarka/);
    const kunch = aboutTheRoad('field_map_lothal', 'npc_kunch')!.line;
    expect(kunch).toMatch(/cart/i);
    expect(kunch).toMatch(/Dwarka/);
    expect(kunch).toMatch(/Narmada/);
  });

  it('offers either yard where a map has two, never both at once', () => {
    expect(aboutTheRoad('field_map_aravali', 'npc_hesh')!.hint).toMatch(/the First Pier or the Far Landing/);
  });

  it('says nothing for somebody who keeps no road', () => {
    expect(aboutTheRoad('field_map_lothal', 'npc_nobody')).toBeNull();
    expect(aboutTheRoad('field_map_lothal', 'npc_hesh')).toBeNull();
  });
});
