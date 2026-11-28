import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {poisOn} from '../src/content/places';
import {placeArt} from '../src/ui/places';
import manifest from '../tools/twin-place-views.json';

describe('individual painted twin-valley place views',()=>{
  it('gives every authored stop its own preferred view instead of a category filler',()=>{
    const places=poisOn('field_map_twins');
    expect(places).toHaveLength(16);
    const urls=places.map(p=>placeArt(p.id));
    expect(new Set(urls).size).toBe(16);
    for(const p of places)expect(placeArt(p.id),p.id).toContain(`${p.id}-painted`);
    expect(manifest.paintings.map(p=>p.id).sort()).toEqual(places.map(p=>p.id)
      .filter(id=>id!=='poi_harappa_court').sort());
  });

  it('ships compact full-colour 16:7 panoramas matching the reviewed delivery manifest',()=>{
    expect(manifest.paintings).toHaveLength(15);
    for(const item of manifest.paintings){
      const png=readFileSync(join(__dirname,'..',item.file));
      expect([png.readUInt32BE(16),png.readUInt32BE(20)],item.id).toEqual([512,224]);
      expect([2,6],item.id).toContain(png[25]); // RGB/RGBA, no indexed palette reduction.
      expect(createHash('sha256').update(png).digest('hex'),item.id).toBe(item.sha256);
    }
  });
});
