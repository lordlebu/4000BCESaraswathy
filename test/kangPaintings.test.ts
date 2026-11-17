import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect,it} from 'vitest';
import {portraitFor} from '../src/ui/portraits';
import {preferredArt} from '../src/ui/art';
import {beatEvent,storylines} from '../src/content/storylines';

function dimensions(file:string):number[]{
  const png=readFileSync(file);
  expect(png.subarray(1,4).toString()).toBe('PNG');
  return [png.readUInt32BE(16),png.readUInt32BE(20)];
}

it('shows Kang’s delivered watercolor in his conversation, without the silhouette fallback',()=>{
  expect(portraitFor('npc_priest_kang')).toMatch(/priest-kang-painted/);
  const file=join(__dirname,'../src/ui/portraits/priest-kang-painted.png');
  expect(dimensions(file)).toEqual([256,256]);
  expect([2,6]).toContain(readFileSync(file)[25]); // Full-colour RGB/RGBA, never an indexed palette.
});

it('resolves the carving and unveiling cards to their distinct delivered paintings',()=>{
  const arc=storylines.find(s=>s.id==='storyline_twin_kang_bust')!;
  for(const id of ['carving','unveiling']){
    const beat=arc.beats.find(b=>b.id===id)!, event=beatEvent(arc,beat);
    const picture=preferredArt('events',[event.artVariant,event.art,event.artFallback]);
    expect(picture).toContain(`story-storyline_twin_kang_bust-${id}-painted`);
    const file=join(__dirname,`../src/ui/events/story-storyline_twin_kang_bust-${id}-painted.png`);
    expect(dimensions(file)).toEqual([512,384]);
    expect([2,6]).toContain(readFileSync(file)[25]);
  }
});
