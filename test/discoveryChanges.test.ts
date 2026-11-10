import { expect, it } from 'vitest';
import { advance, emptyProgress, receiveAll } from '../src/journey';
import { discoveries } from '../src/content/knowledge';
import { discoveryChanges, queueDiscoveryChanges } from '../src/content/discoveryChanges';
const d = discoveries.find(d => d.rungs.length >= 3)!;
const at = (rung: number) => ({ ...emptyProgress(), rungs: { [d.id]: rung } });
it('distinguishes noticing, deeper understanding and the final authored reading', () => {
  expect(discoveryChanges(emptyProgress(), at(0))[0]).toMatchObject({ kind: 'noticed', entry: d.rungs[0]!.entry });
  expect(discoveryChanges(at(0), at(1))[0]).toMatchObject({ kind: 'deepened', entry: d.rungs[1]!.entry });
  const last = d.rungs.length - 1;
  expect(discoveryChanges(at(last - 1), at(last))[0]).toMatchObject({ kind: 'understood', entry: d.rungs[last]!.entry });
});
it('observes actual grant and Look rules, excluding no-ops, blocked and completed actions', () => {
  const granted = receiveAll(emptyProgress(), [d.id]);
  expect(discoveryChanges(emptyProgress(), granted)).toHaveLength(1);
  expect(discoveryChanges(granted, { ...granted })).toEqual([]);
  const blocked = discoveries.find(d => d.rungs[0]?.requires.length)!;
  const before = emptyProgress();
  const lookable = discoveries.find(d => d.rungs[0]?.requires.length === 0)!;
  expect(discoveryChanges(before, advance(before, lookable.id))[0]?.id).toBe(lookable.id);
  expect(discoveryChanges(before, advance(before, blocked.id))).toEqual([]);
  const completed = at(d.rungs.length - 1);
  expect(discoveryChanges(completed, advance(completed, d.id))).toEqual([]);
  expect(discoveryChanges(granted, before)).toEqual([]);
});
it('coalesces newer readings and orders simultaneous discoveries by authored order', () => {
  const before = emptyProgress();
  const after = { ...before, rungs: Object.fromEntries(discoveries.slice(0, 3).reverse().map(d => [d.id, 0])) };
  const changes = discoveryChanges(before, after);
  expect(changes.map(c => c.id)).toEqual(discoveries.slice(0, 3).map(d => d.id));
  const first = discoveryChanges(before, at(0));
  const later = discoveryChanges(at(0), at(1));
  expect(queueDiscoveryChanges(first, later)).toEqual(later);
});
