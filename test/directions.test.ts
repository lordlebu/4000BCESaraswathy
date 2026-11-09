import { expect, it } from 'vitest';
import { destination, markerFor, nearestDestination, personDirection, type LocationFacts } from '../src/content/directions';
import { travellersOn } from '../src/content/travellers';
const f: LocationFacts = { from: { x: 0, y: 0 }, seen: new Set(['0,0', '2,0', '3,0']), routes: new Map([
  ['0,0', { cost: 0, steps: 0, previous: null }], ['2,0', { cost: 8, steps: 4, previous: null }]
]), places: [] };
it('reveals only bearings for unseen places and real walking steps for known routes', () => {
  const unseen = destination('unseen', 'Hill', { x: 1, y: 0 }, f);
  expect(unseen.line).toBe('It lies east.');
  expect(unseen.steps).toBeNull();
  expect(destination('known', 'Camp', { x: 2, y: 0 }, f).line).toBe('4 steps away, east.');
  expect(destination('blocked', 'Island', { x: 3, y: 0 }, f).line).toBe('No known route yet.');
  expect(destination('here', 'Home', f.from, f).line).toBe('You are here.');
});
it('explicit selection wins, clears on arrival or removal, and never falls back to another marker', () => {
  const target = destination('camp', 'Camp', { x: 2, y: 0 }, f);
  const automatic = { ...target, id: 'source' };
  expect(markerFor(null, [], automatic)).toBe(automatic);
  expect(markerFor('news', [{ id: 'news', target }], automatic)).toBe(target);
  expect(markerFor('news', [], automatic)).toBeNull();
  expect(markerFor('hidden', [], automatic)).toBeNull();
  expect(markerFor('news', [{ id: 'news', target: { ...target, route: 'here' } }], automatic)).toBeNull();
  expect(markerFor(null, [], { ...target, knowledge: 'unexplored' })).toBeNull();
});
it('ranks accessible destinations by travel cost, then steps, with stable ties', () => {
  const a = destination('a', 'A', { x: 2, y: 0 }, f);
  expect(nearestDestination([{ ...a, id: 'b', steps: 5 }, a])).toBe(a);
  expect(nearestDestination([{ ...a, cost: null, steps: null }, a])).toBe(a);
});
it('does not invent the whereabouts of an unreported walking person', () => {
  const traveller = travellersOn('field_map_lothal').find(t => t.npcId)!;
  const result = personDirection(traveller.npcId!, 'field_map_lothal', 0, [], [], f);
  expect(result.destination).toBeNull();
  expect(result.line).toContain('not known yet');
  expect(personDirection(traveller.npcId!, 'field_map_lothal', 0, [], [{ npcId: traveller.npcId }], f).line).toContain('talk control');
});
