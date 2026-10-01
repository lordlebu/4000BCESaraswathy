// Where a thing comes from, said the way a person would point.
//
// **Why this exists.** The owner played Lothal and stopped two-thirds of the way up the windmill:
// the tower wanted a reed rope, the panel said "you carry 0", and nothing said that rope is made,
// that making it wants something that can work, or that the thing which works is a stone adze
// lashed with sinew from a deer. Every one of those facts was already in canon. `teachersOf` and
// `recipesMaking` had no caller at all -- this codebase's signature fault, a rule written and never
// asked -- so the workshop could say *what* was missing and never *where from*.
//
// So this answers one question per shortfall, in a sentence: where the material grows or is won,
// which carried thing would do the tool's job and how that is made, and who teaches a recipe and
// where they stand. Pure, and free of React and Phaser; `WorkshopPanel` and the settling panel read it.

import { type Affordance, type MaterialClass, items, material, materialsWithClass, nameOf, recipe, recipesMaking } from './making';
import { type Shortfall } from './crafting';
import { biomes, creatures, flora } from './species';
import { fieldMap, fieldMaps, npc, poi } from './places';

const SPECIES_NAME = new Map<string, string>([...creatures, ...flora].map((s) => [s.id, s.name]));
const ANIMAL = new Set(creatures.map((c) => c.id));
const BIOME_NAME = new Map<string, string>(biomes.map((b) => [b.id, b.name.toLowerCase()]));

/** "a, b or c", the way a list is said aloud. Three at most: a longer one is a table, not a pointer. */
function either(names: readonly string[], most = 3, joiner: 'or' | 'and' = 'or'): string {
  const shown = [...new Set(names)].slice(0, most);
  if (shown.length <= 1) return shown[0] ?? '';
  return `${shown.slice(0, -1).join(', ')} ${joiner} ${shown.at(-1)}`;
}

/** "a stone adze", "an antler pick". */
function a(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
}

function grounds(biomeIds: readonly string[]): string {
  return either(biomeIds.map((b) => BIOME_NAME.get(b) ?? b.replace(/_/g, ' ')));
}

/**
 * Where a material or item comes from, or null when canon cannot say.
 *
 * A material from a living thing names the thing, because that is what a player walks up to: "from
 * a deer, boar or ibex, in forest or hills". One from the ground names the ground. Anything made
 * names the recipe that makes it, and who teaches that if somebody must.
 */
export function whereFrom(id: string): string | null {
  const m = material(id);
  if (m && m.wonFrom.length > 0) {
    const sources = m.wonFrom.map((s) => SPECIES_NAME.get(s) ?? s).map((n) => n.toLowerCase());
    const where = m.foundIn.length > 0 ? `, in ${grounds(m.foundIn)}` : '';
    return m.wonFrom.some((s) => ANIMAL.has(s)) ? `from ${a(either(sources))}${where}` : `from ${either(sources)}${where}`;
  }
  if (m && m.foundIn.length > 0) return `found in ${grounds(m.foundIn)}`;
  // Made: say what goes into it, which is the pointer a player can act on. The recipe's own name
  // ("hafting a stone adze") only restates the thing being asked about.
  const made = recipesMaking(id)[0];
  if (made) {
    const inputs = made.ingredients.map((i) => (i.tag ? `any ${i.tag}` : nameOf(i.material ?? i.item ?? '').toLowerCase()));
    const taught = taughtWhere(made.id);
    const from = `made from ${either(inputs, 4, 'and')}`;
    return taught ? `${from}; ${taught}` : from;
  }
  return null;
}

/** Which carried things would do a tool's job: "a stone adze or a bow drill". */
export function toolsAffording(affordance: Affordance | string): string[] {
  return items.filter((i) => i.affords.includes(affordance as Affordance)).map((i) => i.id);
}

/**
 * Who teaches a recipe and where they stand: "Pell teaches this at the Caravan Ground, North
 * Dwarka". Null for a recipe nobody has to teach.
 *
 * A teacher on the map underfoot is named first, because the nearest person is the useful one.
 */
export function taughtWhere(recipeId: string, onMap: string | null = null): string | null {
  const r = recipe(recipeId);
  if (!r || r.taughtBy.length === 0) return null;
  const teachers = r.taughtBy
    .map((id) => npc(id))
    .filter((n): n is NonNullable<typeof n> => n !== null)
    .map((n) => {
      const at = n.foundAt[0] ?? null;
      const map = at ? fieldMaps.find((f) => f.pointsOfInterest.includes(at)) ?? null : null;
      return { n, at, map };
    })
    .sort((a, b) => Number(b.map?.id === onMap) - Number(a.map?.id === onMap));
  const first = teachers[0];
  if (!first) return null;
  const place = first.at ? poi(first.at)?.name : null;
  const country = first.map ? fieldMap(first.map.id)?.name : null;
  const where = [place?.replace(/^The /, 'the '), first.map?.id === onMap ? null : country].filter(Boolean).join(', ');
  return where ? `${first.n.name} teaches this at ${where}` : `${first.n.name} teaches this`;
}

/** Whether somebody on this map teaches the recipe. */
export function taughtOn(recipeId: string, fieldMapId: string | null): boolean {
  if (!fieldMapId) return false;
  const here = new Set(fieldMap(fieldMapId)?.pointsOfInterest ?? []);
  return (recipe(recipeId)?.taughtBy ?? []).some((id) => (npc(id)?.foundAt ?? []).some((at) => here.has(at)));
}

/** A shortfall's pointer: where the missing thing comes from, or null when there is nothing to add. */
export function sourceOf(short: Shortfall): string | null {
  if (short.kind === 'place') return null;
  if (short.kind === 'tool') {
    const tools = toolsAffording(short.affordance);
    if (tools.length === 0) return null;
    // The first tool a player could make without being taught, if there is one.
    const makeable = tools.find((t) => recipesMaking(t).some((r) => r.taughtBy.length === 0)) ?? tools[0]!;
    const how = whereFrom(makeable);
    return `${either(tools.map((t) => a(nameOf(t).toLowerCase())))}${how ? ` -- the ${nameOf(makeable).toLowerCase()} is ${how}` : ''}`;
  }
  if (short.id) return whereFrom(short.id);
  if (short.tag) {
    const would = materialsWithClass(short.tag as MaterialClass).map((m) => m.name.toLowerCase());
    return would.length > 0 ? `any ${short.tag}: ${either(would)}` : null;
  }
  return null;
}
