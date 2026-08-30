// Materials, items, processes, recipes and vehicles, adapted out of the canon bundle.
//
// The fourth adapter, after `canon.ts` for species, `places.ts` for ground and
// `knowledge.ts` for the diary. Same split as all of them: canon says what CAN be made and
// what it takes; what a particular player is carrying lives in their save and never here.
// Everything in this file is a definition. `src/content/satchel.ts` and
// `src/content/crafting.ts` hold the state and the rules.
//
// Free of React and Phaser, like the rest of `content/`.
//
// **Canon ids are kept, not converted.** `canon.ts` turns `fauna_x` into `x` because species
// are addressed by bare slug throughout the engine; `knowledge.ts` keeps `discovery_` and
// `word_` ids exactly as canon writes them, because the ladders cross-reference each other
// and a second naming would be a second thing to get wrong. The making layer cross-references
// far harder than knowledge does — a recipe names items, materials and a process — so it
// follows knowledge. The single exception is `won_from`, which points at species and is
// therefore converted with `engineId`.

import craftingBundle from '../../data/canon/crafting.json';
import { engineId } from './canon';
import type { BiomeId, Rarity } from '../world/types';

/**
 * What a material is, from `database/material_classes.json`.
 *
 * The tag namespace recipes draw on. A recipe asking for `#fibre` is satisfied by any
 * material carrying that class, which is what lets canon add a reed without editing a recipe.
 */
export type MaterialClass =
  | 'fibre' | 'timber' | 'bone' | 'hide' | 'shell' | 'resin' | 'clay' | 'stone'
  | 'glass' | 'metal' | 'salt' | 'pigment' | 'grain' | 'produce' | 'flesh'
  | 'oil' | 'fuel' | 'physic';

/**
 * What an object lets a person do, from `database/affordances.json`.
 *
 * **There is deliberately no word for damage here.** Canon has none either, and the game
 * this feeds states at the top of its own guidance that combat is absent by design. A spear
 * `cut`s and `deter`s. If that is ever to change it changes in canon first.
 */
export type Affordance =
  | 'cut' | 'bind' | 'carry' | 'contain' | 'burn' | 'deter' | 'cross'
  | 'work' | 'mark' | 'trade' | 'eat' | 'heal' | 'shelter';

export type ItemKind =
  | 'tool' | 'weapon' | 'container' | 'textile' | 'food' | 'physic'
  | 'light' | 'record' | 'ornament' | 'shelter';

export interface Material {
  id: string;
  name: string;
  classes: MaterialClass[];
  /** Renderable biomes only — canon's vocabulary is wider than the walk can draw. */
  foundIn: BiomeId[];
  rarity: Rarity;
  /** Engine species ids this is taken from. Empty is legal and common. */
  wonFrom: string[];
  /** Canon's `notes`. On a material this is the player-facing prose; there is no other. */
  description: string;
}

export interface Item {
  id: string;
  name: string;
  kind: ItemKind;
  /** Resolved through `base_item` — see `affordsOf`. */
  affords: Affordance[];
  materials: string[];
  description: string;
  /**
   * Whether this exists only to be inherited from.
   *
   * `item_cordage` has no recipe and should not: it is the shape every rope shares. A
   * prototype is never offered to the player as something to make.
   */
  isPrototype: boolean;
}

export interface Process {
  id: string;
  name: string;
  /** Point-of-interest kinds. **Empty means anywhere**, including standing in a field. */
  performedAt: string[];
  /** Affordances the maker must have to hand. An affordance, never a named tool. */
  needs: Affordance[];
  description: string;
}

/** One input. Exactly one of `tag`, `material` or `item` is set. */
export interface Ingredient {
  tag: MaterialClass | null;
  material: string | null;
  item: string | null;
  count: number;
  /** A tool: needed to do the work and still there afterwards. */
  kept: boolean;
}

export interface Output {
  item: string | null;
  material: string | null;
  count: number;
}

export interface Recipe {
  id: string;
  name: string;
  process: string;
  ingredients: Ingredient[];
  outputs: Output[];
  /** Culture ids that hold the knowledge. Empty means everybody. */
  knownBy: string[];
  description: string;
}

export interface Vehicle {
  id: string;
  name: string;
  kind: string;
  crosses: BiomeId[];
  capacity: number | null;
  materials: string[];
  description: string;
}

interface RawMaterial {
  id: string; name: string; classes: string[]; found_in?: string[];
  rarity?: string; won_from?: string[]; notes?: string;
}
interface RawItem {
  id: string; name: string; kind: string; affords: string[]; base_item?: string;
  materials?: string[]; notes?: string;
}
interface RawProcess {
  id: string; name: string; performed_at?: string[]; needs?: string[]; notes?: string;
}
interface RawRecipe {
  id: string; name: string; process: string;
  ingredients: { tag?: string; material?: string; item?: string; count?: number; kept?: boolean }[];
  outputs: { item?: string; material?: string; count?: number }[];
  known_by?: string[]; notes?: string;
}
interface RawVehicle {
  id: string; name: string; kind: string; crosses: string[]; capacity?: number;
  materials?: string[]; notes?: string;
}

const raw = craftingBundle as {
  materials: RawMaterial[];
  items: RawItem[];
  processes: RawProcess[];
  recipes: RawRecipe[];
  vehicles: RawVehicle[];
};

// Biomes the walk can actually draw. Imported rather than re-derived: `canon.ts` already
// filters species this way and the two must agree, or a material would be gatherable on
// ground no species lives on.
import { renderableBiomeIds } from './canon';
const RENDERABLE = new Set<string>(renderableBiomeIds);

const byIdRaw = new Map(raw.items.map((i) => [i.id, i]));

/**
 * What an item lets you do, following `base_item` up the chain.
 *
 * An item that states `affords` **replaces** its base's rather than adding to it. That is how
 * Factorio's override works and is the less surprising of the two readings — a harpoon that
 * says it cuts and deters should not silently also inherit whatever a hafted tool did.
 *
 * **This duplicates `World.affords` in canon's `utils/check_playability.py`**, in a second
 * language and a second repository, exactly as `holds` and `observed` here duplicate that
 * file's. It is the same accepted cost for the same reason: canon has to be able to prove a
 * recipe is performable without exporting first. Change one, change both.
 */
function affordsOf(id: string): Affordance[] {
  const seen = new Set<string>();
  let cursor: string | undefined = id;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const doc: RawItem | undefined = byIdRaw.get(cursor);
    if (doc?.affords?.length) return doc.affords as Affordance[];
    cursor = doc?.base_item;
  }
  return [];
}

/** Ids that are somebody's `base_item`, and so exist to be inherited from. */
const PROTOTYPES = new Set(
  raw.items.map((i) => i.base_item).filter((b): b is string => Boolean(b))
);

export const materials: Material[] = raw.materials.map((m) => ({
  id: m.id,
  name: m.name,
  classes: m.classes as MaterialClass[],
  foundIn: (m.found_in ?? []).filter((b) => RENDERABLE.has(b)) as BiomeId[],
  rarity: (m.rarity ?? 'common') as Rarity,
  wonFrom: (m.won_from ?? []).map(engineId),
  description: m.notes ?? ''
}));

export const items: Item[] = raw.items.map((i) => ({
  id: i.id,
  name: i.name,
  kind: i.kind as ItemKind,
  affords: affordsOf(i.id),
  materials: i.materials ?? [],
  description: i.notes ?? '',
  isPrototype: PROTOTYPES.has(i.id)
}));

export const processes: Process[] = raw.processes.map((p) => ({
  id: p.id,
  name: p.name,
  performedAt: p.performed_at ?? [],
  needs: (p.needs ?? []) as Affordance[],
  description: p.notes ?? ''
}));

export const recipes: Recipe[] = raw.recipes.map((r) => ({
  id: r.id,
  name: r.name,
  process: r.process,
  ingredients: r.ingredients.map((n) => ({
    tag: (n.tag ? n.tag.replace(/^#/, '') : null) as MaterialClass | null,
    material: n.material ?? null,
    item: n.item ?? null,
    count: n.count ?? 1,
    kept: n.kept ?? false
  })),
  outputs: r.outputs.map((o) => ({
    item: o.item ?? null,
    material: o.material ?? null,
    count: o.count ?? 1
  })),
  knownBy: r.known_by ?? [],
  description: r.notes ?? ''
}));

export const vehicles: Vehicle[] = raw.vehicles.map((v) => ({
  id: v.id,
  name: v.name,
  kind: v.kind,
  crosses: (v.crosses ?? []).filter((b) => RENDERABLE.has(b)) as BiomeId[],
  capacity: v.capacity ?? null,
  materials: v.materials ?? [],
  description: v.notes ?? ''
}));

const materialById = new Map(materials.map((m) => [m.id, m]));
const itemById = new Map(items.map((i) => [i.id, i]));
const processById = new Map(processes.map((p) => [p.id, p]));
const recipeById = new Map(recipes.map((r) => [r.id, r]));

export function material(id: string): Material | null {
  return materialById.get(id) ?? null;
}
export function item(id: string): Item | null {
  return itemById.get(id) ?? null;
}
export function process(id: string): Process | null {
  return processById.get(id) ?? null;
}
export function recipe(id: string): Recipe | null {
  return recipeById.get(id) ?? null;
}

/** The display name of a material or an item, whichever this id is. */
export function nameOf(id: string): string {
  return material(id)?.name ?? item(id)?.name ?? id;
}

/** Whether a material carries a class — the whole of what a `#tag` ingredient asks. */
export function hasClass(materialId: string, cls: MaterialClass): boolean {
  return material(materialId)?.classes.includes(cls) ?? false;
}

/** Every material carrying a class, for a panel that wants to say what would do. */
export function materialsWithClass(cls: MaterialClass): Material[] {
  return materials.filter((m) => m.classes.includes(cls));
}

/** What can be gathered on a biome, in canon's order. */
export function materialsIn(biome: BiomeId): Material[] {
  return materials.filter((m) => m.foundIn.includes(biome));
}

/** The recipes that produce an item or material, for a panel showing how to get one. */
export function recipesMaking(id: string): Recipe[] {
  return recipes.filter((r) => r.outputs.some((o) => o.item === id || o.material === id));
}
