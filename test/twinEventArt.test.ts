import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import canon from '../data/canon/places.json';
import {preferredArt} from '../src/ui/art';

const subjects=[...canon.happenings.filter(h=>h.field_maps?.includes('field_map_twins')).map(h=>h.id),
  'journey-aravali-twins','journey-lothal-twins'];

describe('preferred valley event and entry paintings',()=>{
  it('covers all twenty authored happenings and both travel routes',()=>{
    expect(subjects).toHaveLength(22);
    for(const id of subjects){
      expect(preferredArt('events',id),id).toContain(`${id}-painted`);
      const png=readFileSync(join(__dirname,`../src/ui/events/${id}-painted.png`));
      expect([png.readUInt32BE(16),png.readUInt32BE(20)],id).toEqual([512,384]);
      // The previously accepted courtyard edition remains; every new painting is full-colour.
      if(id!=='happening_twin_courtyard')expect([2,6],id).toContain(png[25]);
    }
  });
});
