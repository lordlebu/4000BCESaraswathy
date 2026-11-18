import {describe,expect,it} from 'vitest';
import {fieldMap} from '../src/content/places';
import {buildFieldMap} from '../src/world/fieldMap';
import {twinTerrainCell,TWIN_TURF,TERRAIN_STEP,MAX_TWIN_TERRAIN_FRAMES} from '../src/game/twinTerrain';

describe('muted twin terrain and baked edge bands',()=>{
  for(const seed of ['twin-landscape-review','twin-art-review','twin-manual-review'])it(`softens both sides of the seam and preserves saved terrain (${seed})`,()=>{
    const {world}=buildFieldMap(fieldMap('field_map_twins')!,{seed}),before=JSON.stringify(world);
    const cells=world.tiles.flat().map(t=>twinTerrainCell(world,t));
    expect(new Set(cells.map(c=>c.key)).size).toBeLessThanOrEqual(MAX_TWIN_TERRAIN_FRAMES);
    let seams=0,banks=0,slopes=0;
    for(const t of world.tiles.flat()){
      const cell=twinTerrainCell(world,t);
      for(const edge of cell.edges){
        const [dx,dy]=TERRAIN_STEP[edge.side]!,next=twinTerrainCell(world,world.tiles[t.y+dy]![t.x+dx]!);
        expect(next.edges.some(e=>e.side===(edge.side+2)%4&&e.to===edge.from)).toBe(true);
        if(edge.from==='water'||edge.to==='water'){banks++;expect(edge.rise).toBe(0);}
        if(edge.rise)slopes++;
        if(edge.from==='turf'&&edge.to==='sand')seams++;
      }
    }
    expect(seams).toBeGreaterThan(0);expect(banks).toBeGreaterThan(0);expect(slopes).toBeGreaterThan(0);
    expect(twinTerrainCell(world,world.tiles[12]![51]!).highland).toBe(true);
    expect(JSON.stringify(world)).toBe(before);
  });

  it('provides three restrained highland palettes, each darker than the former bright meadow',()=>{
    for(const palette of Object.values(TWIN_TURF)){
      const [r,g,b]=palette.base.slice(1).match(/../g)!.map(c=>parseInt(c,16));
      expect(g).toBeLessThan(170);expect(Math.max(r!,g!,b!)-Math.min(r!,g!,b!)).toBeLessThan(55);
    }
  });
});
