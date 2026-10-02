// The next step, once the first morning is over (`docs/satchel-and-hearth.md`, phase 8).

import { describe, expect, it } from 'vitest';
import { nextStep } from '../src/content/guide';

const none = { road: null, stage: null, news: null, at: { x: 0, y: 0 }, unseen: [] };

describe('the next step', () => {
  it('offers the next building stage first, with a pin', () => {
    const g = nextStep({ ...none, stage: { pin: 'stage:field_map_lothal', name: 'Raise the tower' }, road: 'Something else.' })!;
    expect(g.line).toMatch(/raise the tower/);
    expect(g.action).toEqual({ kind: 'pin', pin: 'stage:field_map_lothal', label: 'Pin Raise the tower' });
  });

  it('then the map’s road to settling, then somebody with news, then a place not yet seen', () => {
    expect(nextStep({ ...none, road: 'Ask Hasme about building here.', news: { name: 'Uma' } })!.line).toBe('Ask Hasme about building here.');
    expect(nextStep({ ...none, news: { name: 'Uma' }, unseen: [{ name: 'the Kilns', at: { x: 5, y: 0 } }] })!.line).toBe('Uma has something new to tell you.');
    expect(nextStep({ ...none, unseen: [{ name: 'the Kilns', at: { x: 9, y: 0 } }, { name: 'the Well', at: { x: 0, y: 3 } }] })!.line).toBe(
      'You have not seen the Well yet. It lies south.'
    );
  });

  it('says nothing when there is nothing worth saying', () => {
    expect(nextStep(none)).toBeNull();
  });
});
