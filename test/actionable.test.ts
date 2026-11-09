import { expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { emptyProgress } from '../src/journey';
import { noNodes } from '../src/content/nodes';
import { COACH } from '../src/content/coach';
import { coachSuggestion, explorationSuggestions, recipeSuggestion, newsSuggestion, type GuidanceFacts } from '../src/content/actionable';
import { routeDistances, pointKey } from '../src/world/pathfind';
import { isWalkable } from '../src/world/generate';
import { stepCostOn } from '../src/content/species';
const built = buildFieldMap(fieldMaps.find(m => m.id === 'field_map_lothal')!, {});
const facts = (over: Partial<GuidanceFacts> = {}): GuidanceFacts => ({
  world: built.world, mapId: 'field_map_lothal', from: built.world.start,
  day: 0, seen: new Set(), routes: new Map(), places: built.placed.map(p => ({ poiId: p.poi.id, at: p.at })),
  satchel: {}, bench: { kind: null, fieldMapId: 'field_map_lothal' }, nodes: noNodes(), flags: [],
  progress: emptyProgress(), knows: () => true, reported: [], nearby: [], people: [], road: null, ...over
});
it('counts remaining first-morning reeds without disclosing an unseen resource', () => {
  const s = coachSuggestion(COACH.find(s => s.id === 'reeds')!, facts({ satchel: { material_reed_fibre: 2 } }));
  expect(s.line).toMatch(/^Gather 2 more reed fibres/);
  expect(s.target).toBeUndefined();
  expect(s.line).not.toMatch(/\d+ steps/);
});
it('offers the actual workshop when a recipe is ready, and keeps the explicit pin after making', () => {
  const f = facts({ satchel: { material_reed_fibre: 4 } });
  expect(recipeSuggestion('recipe_reed_rope', f)).toMatchObject({ action: { kind: 'workshop', recipeId: 'recipe_reed_rope' }, where: 'Ready to make here.' });
  expect(recipeSuggestion('recipe_reed_rope', { ...f, progress: { ...f.progress, made: ['recipe_reed_rope'] }, satchel: {} })?.id).toBe('pin:recipe_reed_rope');
});
it('uses one supplied route map to find resources and removes destinations when ingredients are carried', () => {
  const w = built.world;
  const seen = new Set(w.tiles.flat().map(pointKey));
  const routes = routeDistances(w.tiles, w.width, w.height, w.start, isWalkable, stepCostOn);
  const f = facts({ seen, routes });
  expect(recipeSuggestion('recipe_flint_knife', f)?.target?.knowledge).toBe('known');
  expect(recipeSuggestion('recipe_flint_knife', { ...f, satchel: { material_flint: 2 } })?.target).toBeUndefined();
});
it('gives unexplored places only bearings and lets a nearby person use the existing talk control', () => {
  const all = explorationSuggestions(facts());
  expect(all.length).toBeGreaterThan(0);
  expect(all.every(s => s.target?.knowledge === 'unexplored' && s.target.steps === null)).toBe(true);
  expect(newsSuggestion('npc_uma', facts({ nearby: [{ npcId: 'npc_uma' } as GuidanceFacts['nearby'][number]] })).line).toContain('talk control');
});
it('names a usable work site when ingredients are ready but the current bench cannot make it', async () => {
  const { materials, items } = await import('../src/content/making');
  const satchel = Object.fromEntries([...materials, ...items].map(m => [m.id, 99]));
  const w = built.world;
  const f = facts({ satchel, seen: new Set(w.tiles.flat().map(pointKey)), routes: routeDistances(w.tiles, w.width, w.height, w.start, isWalkable, stepCostOn) });
  const suggestion = recipeSuggestion('recipe_cooking_pot', f)!;
  expect(suggestion.line).toMatch(/^Make .* at /);
  expect(suggestion.target?.id).toMatch(/^place:/);
});
