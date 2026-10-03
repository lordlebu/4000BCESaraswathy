// Does the making layer actually touch anything?
//
// It shipped connected to nothing: 72 recipes a player could make, meaning nothing to the
// diary, the discoveries, the people or the ending. Three edges close that, and each one is a
// rule that could be written, tested and never called — which is the failure this codebase has
// shipped three times and writes about at the top of `journey.ts`.
//
// So the last block walks a real map and uses only what a player has: it gathers, it talks, it
// makes, and it hands somebody a thing they asked for. Nothing in it seeds a satchel or calls
// `learnRecipe` directly.

import { storyGrants } from '../src/content/storylines';
import { describe, expect, it } from 'vitest';
import {
  craft,
  emptyProgress,
  hasMade,
  hear,
  knowsRecipe,
  learnRecipe,
  linesFor
} from '../src/journey';
import { describeTile } from '../src/content/journal';
import { underfootLine, yieldsAt } from '../src/content/gathering';
import { diarySections } from '../src/content/travelLog';
import { discoveries } from '../src/content/knowledge';
import { creatures, creatureFor, flora, floraFor } from '../src/content/species';
import { npc, npcs } from '../src/content/places';
import { items, materials, recipes } from '../src/content/making';
import craftingBundle from '../data/making/crafting.json';
import { add, count, emptySatchel } from '../src/content/satchel';
import { canMake, make, makeableNow, openGround, withinReach } from '../src/content/crafting';
import { gather } from '../src/content/gathering';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';
import { featureNameAt } from '../src/world/features';

describe('a rung never needs a tool', () => {
  it('asks only for what it stands on, because the lore does not gate the ladder', () => {
    // Six rungs used to ask for something that cuts, contains or carries, and none could be climbed
    // in play: no caller passed the satchel. The gate went instead (`docs/a-lighter-game.md`).
    for (const d of discoveries) for (const r of d.rungs) expect(Object.keys(r).sort(), d.id).toEqual(['entry', 'requires']);
  });
});

describe('a recipe can have to be taught', () => {
  it('leaves most of them common, so making works from the first step', () => {
    const common = recipes.filter((r) => r.taughtBy.length === 0);
    expect(common.length).toBeGreaterThan(recipes.length / 2);
    expect(knowsRecipe(emptyProgress(), 'recipe_flint_knife')).toBe(true);
  });

  it('withholds the taught ones until somebody says so', () => {
    const taught = recipes.filter((r) => r.taughtBy.length > 0);
    expect(taught.length).toBeGreaterThan(10);
    for (const r of taught) {
      expect(knowsRecipe(emptyProgress(), r.id), `${r.id} known too early`).toBe(false);
    }
  });

  it('refuses to learn one nobody teaches, so the list stays meaningful', () => {
    const p = learnRecipe(emptyProgress(), 'recipe_flint_knife');
    expect(p.recipes).toEqual([]);
    expect(learnRecipe(emptyProgress(), 'recipe_nonsense').recipes).toEqual([]);
  });

  it('keeps a taught recipe out of the making panel until it is known', () => {
    // Every ingredient in hand and still not offered, because nobody has shown you.
    let s = add(emptySatchel(), 'material_deer_antler', 4);
    s = add(s, 'item_flint_knife', 1);
    const knows = (id: string) => knowsRecipe(emptyProgress(), id);

    expect(canMake(s, 'recipe_bone_awl')).toBe(true);
    expect(makeableNow(s, openGround(), knows).map((r) => r.id)).not.toContain('recipe_bone_awl');
    expect(withinReach(s, openGround(), knows).map((r) => r.id)).not.toContain('recipe_bone_awl');

    const taught = learnRecipe(emptyProgress(), 'recipe_bone_awl');
    const after = (id: string) => knowsRecipe(taught, id);
    expect(makeableNow(s, openGround(), after).map((r) => r.id)).toContain('recipe_bone_awl');
  });

  it('names a teacher who actually says it', () => {
    // Canon's own check, mirrored: the recipe points at a person and the person's line points
    // back, and the two are authored separately.
    for (const r of recipes) {
      for (const who of r.taughtBy) {
        const person = npc(who);
        expect(person, `${r.id} taught by ${who}, who does not exist`).not.toBeNull();
        // Or through their arc: Guyuk shows you the seed ball in a beat, not a line.
        expect(
          person!.lines.some((l) => l.gives.includes(r.id)) || storyGrants(who).includes(r.id),
          `${r.id} says ${who} teaches it, and no line of theirs gives it`
        ).toBe(true);
      }
    }
  });
});

describe('a line can cost something', () => {
  const priced = npcs.flatMap((n) => n.lines.filter((l) => l.costs).map((l) => ({ n, l })));

  it('exists, and asks for a thing that can be made', () => {
    expect(priced.length).toBeGreaterThan(0);
    for (const { l } of priced) {
      expect(recipes.some((r) => r.outputs.some((o) => o.item === l.costs))).toBe(true);
    }
  });

  it('is not offered to somebody who cannot pay', () => {
    for (const { n, l } of priced) {
      expect(linesFor(emptyProgress(), n.id, emptySatchel())).not.toContain(l);
      const holding = add(emptySatchel(), l.costs!, 1);
      expect(linesFor(emptyProgress(), n.id, holding)).toContain(l);
    }
  });

  it('takes the thing when the line is heard', () => {
    const { n, l } = priced[0]!;
    const holding = add(emptySatchel(), l.costs!, 1);
    const at = linesFor(emptyProgress(), n.id, holding).indexOf(l);
    const heard = hear(emptyProgress(), n.id, at, holding);

    expect(heard.paid).toBe(l.costs);
    // Gone, not merely marked. A gift the player keeps looks like it worked and did not.
    expect(count(heard.satchel, l.costs!)).toBe(0);
  });

  it('leaves a free line untouched, by identity', () => {
    const holding = add(emptySatchel(), 'material_flint', 2);
    const heard = hear(emptyProgress(), 'npc_thrali', 0, holding);
    expect(heard.paid).toBeNull();
    expect(heard.satchel).toBe(holding);
  });
});

// ---------------------------------------------------------------------------------------
// Only the calls a player has.
// ---------------------------------------------------------------------------------------

/** Walk the whole of Lothal picking things up. No hand-seeded satchel anywhere below. */
function walkedLothal() {
  const { world } = buildFieldMap(fieldMap('field_map_lothal')!);
  let bag = emptySatchel();
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      bag = gather(bag, world.seed, { x, y }, world.tiles[y]![x]!.biome);
    }
  }
  return bag;
}

describe('a player can earn a craft and pay for one', () => {
  const walked = walkedLothal;

  it('learns a craft by talking to somebody, and then can do it', () => {
    let p = emptyProgress();
    const bag = walked();

    // Uma is at the Lothal camp and shows you how a mat is laid. Heard the way the panel
    // hears it: indexed against what `linesFor` returned, never against canon order.
    expect(knowsRecipe(p, 'recipe_reed_mat')).toBe(false);
    const said = linesFor(p, 'npc_uma', bag);
    const teaches = said.findIndex((l) => l.gives.includes('recipe_reed_mat'));
    expect(teaches, 'Uma no longer teaches the mat').toBeGreaterThanOrEqual(0);

    p = hear(p, 'npc_uma', teaches, bag).progress;
    expect(knowsRecipe(p, 'recipe_reed_mat')).toBe(true);

    // And it is now a thing the panel would offer, given a loom.
    const knows = (id: string) => knowsRecipe(p, id);
    const withLoom = add(bag, 'item_loom_frame', 1);
    expect(makeableNow(withLoom, openGround(), knows).map((r) => r.id)).toContain('recipe_reed_mat');
  });

  it('makes the thing Uma wants and hands it over', () => {
    let p = emptyProgress();
    let bag = walked();

    // Learn the mat, make a loom (common knowledge), make a mat, give it back.
    const said = linesFor(p, 'npc_uma', bag);
    p = hear(p, 'npc_uma', said.findIndex((l) => l.gives.includes('recipe_reed_mat')), bag).progress;

    // The real bootstrap, and it is worth spelling out because it is not obvious: spinning
    // needs something that *works*, and the only things that work are a bow drill, a quern and
    // a loom — all of which want cordage, which wants spinning. The bow drill is the way in,
    // because carving needs only something that cuts.
    expect(canMake(bag, 'recipe_flint_knife')).toBe(true);
    bag = make(bag, 'recipe_flint_knife');
    bag = make(bag, 'recipe_bow_drill');
    expect(count(bag, 'item_bow_drill'), 'nothing in Lothal can work material').toBe(1);
    bag = make(bag, 'recipe_reed_rope');
    bag = make(bag, 'recipe_loom_frame');
    expect(count(bag, 'item_loom_frame')).toBe(1);

    bag = make(bag, 'recipe_reed_mat');
    expect(count(bag, 'item_reed_mat'), 'the mat could not be made from a walk of Lothal').toBe(1);

    // Now the priced line is offered, and paying it teaches the bedroll.
    const now = linesFor(p, 'npc_uma', bag);
    const gift = now.findIndex((l) => l.costs === 'item_reed_mat');
    expect(gift, 'Uma no longer wants a mat').toBeGreaterThanOrEqual(0);

    const heard = hear(p, 'npc_uma', gift, bag);
    expect(heard.paid).toBe('item_reed_mat');
    expect(count(heard.satchel, 'item_reed_mat')).toBe(0);
    expect(knowsRecipe(heard.progress, 'recipe_bedroll')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------
// The diary, and the keepsake.
// ---------------------------------------------------------------------------------------

describe('the ground says what it has', () => {
  const built = buildFieldMap(fieldMap('field_map_lothal')!);
  const seed = built.world.seed;

  it('writes a lead into the field notes, not a record', () => {
    // Present tense and offered, so a player notices the reeds while walking rather than by
    // opening a panel. `gatheredLine` is the past-tense counterpart and says something else.
    let found: string | null = null;
    for (let y = 0; y < built.world.height && !found; y += 1) {
      for (let x = 0; x < built.world.width && !found; x += 1) {
        found = underfootLine(seed, { x, y }, built.world.tiles[y]![x]!.biome);
      }
    }
    expect(found, 'nothing on the whole map is offered').not.toBeNull();
    expect(found).toMatch(/^There is .+ here, for the taking\.$/);
  });

  it('reaches the journal entry the panel renders', () => {
    // The entry is what `JournalPanel` draws. A line that exists and never reaches this is the
    // shape of every mechanic this repo has shipped with no caller.
    let withSomething = 0;
    for (let y = 0; y < built.world.height; y += 1) {
      for (let x = 0; x < built.world.width; x += 1) {
        const entry = describeTile(built.world.tiles[y]![x]!, built.world);
        if (entry.underfoot) withSomething += 1;
      }
    }
    expect(withSomething).toBeGreaterThan(100);
  });

  it('says nothing where there is nothing, rather than an empty phrase', () => {
    const entry = describeTile(built.world.tiles[0]![0]!, built.world);
    expect(typeof entry.underfoot).toBe('string');
  });
});

describe('what was made outlives what is carried', () => {
  it('records the making, and refuses a craft nobody taught', () => {
    const bag = add(emptySatchel(), 'material_flint', 2);
    const done = craft(emptyProgress(), bag, 'recipe_flint_knife');
    expect(done.made).toBe('recipe_flint_knife');
    expect(hasMade(done.progress, 'recipe_flint_knife')).toBe(true);
    expect(count(done.satchel, 'item_flint_knife')).toBe(1);

    // Taught recipes are refused even with every ingredient in hand.
    let s = add(emptySatchel(), 'material_deer_antler', 2);
    s = add(s, 'item_flint_knife', 1);
    const before = emptyProgress();
    const refused = craft(before, s, 'recipe_bone_awl');
    expect(refused.made).toBeNull();
    // Both halves returned unchanged by identity, so nothing was spent and nothing recorded.
    expect(refused.progress).toBe(before);
    expect(refused.satchel).toBe(s);
  });

  it('remembers a thing that was given away', () => {
    // The whole reason `made` is not derived from the satchel. Uma's mat leaves the bag.
    let p = emptyProgress();
    let bag = walkedLothal();

    const said = linesFor(p, 'npc_uma', bag);
    p = hear(p, 'npc_uma', said.findIndex((l) => l.gives.includes('recipe_reed_mat')), bag).progress;

    for (const r of ['recipe_flint_knife', 'recipe_bow_drill', 'recipe_reed_rope', 'recipe_loom_frame', 'recipe_reed_mat']) {
      const step = craft(p, bag, r);
      p = step.progress;
      bag = step.satchel;
    }
    expect(count(bag, 'item_reed_mat')).toBe(1);

    const gift = linesFor(p, 'npc_uma', bag).findIndex((l) => l.costs === 'item_reed_mat');
    const heard = hear(p, 'npc_uma', gift, bag);
    expect(count(heard.satchel, 'item_reed_mat')).toBe(0);

    // Gone from the bag, still in the record — and so in the keepsake.
    expect(hasMade(heard.progress, 'recipe_reed_mat')).toBe(true);
    const made = diarySections(heard.progress).find((s) => s.heading.startsWith('Made'));
    expect(made, 'the keepsake has no Made section').toBeTruthy();
    expect(made!.lines.join(' ')).toMatch(/Reed mat/i);
  });

  it('keeps the keepsake quiet when nothing was made', () => {
    expect(diarySections(emptyProgress()).find((s) => s.heading.startsWith('Made'))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------
// The assumption canon's gate rests on.
// ---------------------------------------------------------------------------------------

describe('gathering does not use a tile up', () => {
  /*
   * **The bargain changed when resource nodes arrived, and this is what it says now.**
   *
   * It used to be simply "a tile is never used up". That is still true of `gather` -- the
   * function below carries what it is given and has no notion of stock -- but it is no longer
   * true of the game: `nodes.ts` draws a place down and regrows it on a schedule.
   *
   * So the bargain with canon is now in two halves, and both are tested:
   *
   *   here    `gather` itself never depletes, so what a tile *grows* is stable;
   *   below   a node that renews comes back, so a patient walker still reaches any count.
   *
   * The second is what keeps `check_playability.py` allowed to ignore counts. Waiting is not
   * running out. What canon can no longer wave through is `renews: never`, which is exactly
   * why that script gained `nothing_runs_out` before this file gained nodes.
   */
  const built = buildFieldMap(fieldMap('field_map_lothal')!);
  const seed = built.world.seed;

  /**
   * This is not a test about gathering. It is the game's half of a bargain with canon.
   *
   * `check_playability.py` decides a recipe is reachable by asking whether its ingredient
   * *classes* can be obtained at all, and ignores every `count` in every recipe. That is
   * sound only because a tile can be revisited: there is no quantity a patient walker cannot
   * reach, so "obtainable" and "obtainable four times" are the same question.
   *
   * The day gathering starts depleting, that stops being true and canon's gate starts passing
   * recipes nobody can afford — silently, because canon has no notion of how much of anything
   * the world holds. This fails first, and says so.
   */
  it('gives the same tile up again, which is what makes canon allowed to ignore counts', () => {
    const at = { x: 12, y: 12 };
    const biome = built.world.tiles[12]![12]!.biome;

    let bag = emptySatchel();
    const first = yieldsAt(seed, at, biome);
    expect(first.length, 'pick a tile with something on it').toBeGreaterThan(0);

    for (let visit = 1; visit <= 5; visit += 1) {
      bag = gather(bag, seed, at, biome);
      for (const m of first) {
        expect(count(bag, m.id), `${m.id} after ${visit} visits`).toBe(visit);
      }
    }
  });

  it('lets a patient walker reach any count a recipe asks for', () => {
    // The strongest form: the largest count any recipe wants, gathered off one map.
    const biggest = Math.max(...recipes.flatMap((r) => r.ingredients.map((n) => n.count)));
    let bag = emptySatchel();
    for (let lap = 0; lap < biggest; lap += 1) {
      for (let y = 0; y < built.world.height; y += 1) {
        for (let x = 0; x < built.world.width; x += 1) {
          bag = gather(bag, seed, { x, y }, built.world.tiles[y]![x]!.biome);
        }
      }
    }
    const reed = count(bag, 'material_reed_fibre');
    expect(reed, 'walking the map repeatedly must accumulate').toBeGreaterThanOrEqual(biggest);
  });
});

// ---------------------------------------------------------------------------------------
// The affordance chain.
// ---------------------------------------------------------------------------------------

describe('what an item lets you do', () => {
  /**
   * `affordsOf` follows `base_item` up the chain. This used to be checked against canon's own
   * resolution, exported with the bundle, because the rule was written twice -- here and in canon's
   * Python. Making moved to the game on 2 October 2026 and the Python went with it, so there is one
   * implementation and this holds its two cases instead.
   */
  it('inherits from its base when it says nothing of its own', () => {
    // `item_reed_rope` states nothing and takes `bind` from `item_cordage`.
    expect(items.find((i) => i.id === 'item_reed_rope')?.affords).toEqual(['bind']);
    expect(items.some((i) => i.materials.length === 0 && i.affords.length > 0)).toBe(true);
  });

  it('never loops, so every chain ends', () => {
    const raw = (craftingBundle as { items: { id: string; base_item?: string }[] }).items;
    const base = new Map(raw.map((i) => [i.id, i.base_item ?? null]));
    for (const i of raw) {
      const seen = new Set<string>();
      for (let at: string | null = i.id; at; at = base.get(at) ?? null) {
        expect(seen.has(at), `${i.id}: base_item chain loops at ${at}`).toBe(false);
        seen.add(at);
      }
    }
  });
});

describe('what the game says a material is', () => {
  /**
   * Every material carries a regrowth tier, and the tiers are spread: if everything came back as
   * one value the field would carry no information. Which tier is right is `test/regrowth.test.ts`.
   */
  it('gives every material a regrowth tier, and more than one of them', () => {
    for (const m of materials) expect(['quick', 'steady', 'slow'], `${m.id} regrows ${m.regrows}`).toContain(m.regrows);
    expect(new Set(materials.map((m) => m.regrows)).size).toBe(3);
    // The workhorse comes back fastest: reed fibre is asked for by more recipes than anything.
    expect(materials.find((m) => m.id === 'material_reed_fibre')?.regrows).toBe('quick');
  });

  /**
   * **The canon guarantee the whole gathering overhaul rests on.**
   *
   * `lint_story.py` refuses a material whose `found_in` names a biome none of its `won_from`
   * species can reach. Twenty-five materials broke that rule before it existed -- the ammonite
   * shell was gathered on the coast while both its ammonites live in lava field and mountains,
   * no biome in common at all.
   *
   * It matters here rather than only over there because the game is moving from gathering a
   * biome-wide list to gathering what is standing on the tile: a material whose source is not
   * in the biome stops being merely odd and becomes unobtainable. This is the game's half --
   * it fails if a bundle is exported from a canon whose lint was skipped.
   *
   * The three exemptions are canon's, and are named there: leviathan bone and oyster shell wash
   * ashore, and salt crusts a pan no saltbush grew in.
   */
  it('never offers a material where nothing it comes from lives', () => {
    const travels = new Set([
      'material_leviathan_bone',
      'material_oyster_shell',
      'material_salt_crust'
    ]);
    const whereSpeciesLive = new Map<string, Set<string>>();
    for (const s of [...creatures, ...flora]) whereSpeciesLive.set(s.id, new Set(s.biomes));

    const offences: string[] = [];
    for (const m of materials) {
      if (travels.has(m.id)) continue;
      const sources = m.wonFrom.filter((id) => whereSpeciesLive.has(id));
      if (sources.length === 0) continue;
      const reachable = new Set(sources.flatMap((id) => [...whereSpeciesLive.get(id)!]));
      for (const biome of m.foundIn) {
        if (!reachable.has(biome)) {
          offences.push(`${m.id} is gathered in ${biome}; its sources reach ${[...reachable]}`);
        }
      }
    }
    expect(offences, offences.join('; ')).toEqual([]);
  });
});

describe('the ground gives what is standing on it', () => {
  const built = buildFieldMap(fieldMap('field_map_lothal')!);
  const seed = built.world.seed;

  /**
   * **The whole of the gathering overhaul, in one assertion.**
   *
   * A tile used to answer two questions that never consulted each other: `species.ts` picked the
   * plant and the creature standing here, and `gathering.ts` picked materials from everything the
   * *biome* could hold. So a tile could offer boar tusk with no boar in sight -- canon's
   * `won_from` said where it came from, the exporter shipped it, `making.ts` parsed it into
   * `wonFrom`, and **nothing read it**.
   *
   * Now every yield is either won from the species on this tile, or is one of the fifteen
   * materials canon wins from nothing alive -- flint, clay, the ores, the glasses -- which come
   * from the ground and need no plant to be standing on them.
   *
   * Sabotaging `yieldsAt` back to `materialsIn(biome)` fails this on the first tile that offers
   * something its own flora and fauna do not.
   */
  it('offers nothing a tile has no source for', () => {
    const wrong: string[] = [];
    let checked = 0;

    for (const row of built.world.tiles) {
      for (const tile of row) {
        const here = { x: tile.x, y: tile.y, biome: tile.biome };
        const standing = new Set(
          [floraFor(here, seed), creatureFor(here, seed)]
            .filter((s): s is NonNullable<typeof s> => Boolean(s))
            .map((s) => s.id)
        );

        for (const m of yieldsAt(seed, here, tile.biome)) {
          checked += 1;
          if (m.wonFrom.length === 0) continue;          // the ground itself
          if (m.wonFrom.some((id) => standing.has(id))) continue;
          // A fallen log, driftwood or bamboo drawn on the tile is a source you can see: the log
          // you see is the log you take (`world/features.ts`).
          const drawn = featureNameAt(seed, tile.x, tile.y, tile.biome);
          if ((drawn === 'log' || drawn === 'driftwood') && m.id === 'material_windfall_wood') continue;
          if (drawn === 'bamboo' && m.id === 'material_bamboo_cane') continue;
          wrong.push(`${tile.x},${tile.y} offers ${m.id}, won from ${m.wonFrom.join('/')}, but ${
            [...standing].join('/') || 'nothing'
          } is standing there`);
        }
      }
    }

    expect(checked, 'no tile on this map offered anything -- the test proves nothing').toBeGreaterThan(0);
    expect(wrong.slice(0, 5), `${wrong.length} tiles offer what is not there`).toEqual([]);
  });

  /**
   * The other half, and the fault the first version of this rewrite actually shipped.
   *
   * Keying every yield to the species standing on the tile made **stone ungatherable
   * everywhere**: fifteen materials have no `won_from` at all, because canon knows salt-crust is
   * salt without owing anyone an account of which pan it was scraped from. That is the entire
   * mineral half of the crafting tree, and two of Uma's commission tests failed on the spot.
   *
   * Measurement found it, not reading. This keeps it found.
   */
  it('still gives up what the ground itself is made of', () => {
    const fromTheGround = new Set<string>();
    for (const row of built.world.tiles) {
      for (const tile of row) {
        for (const m of yieldsAt(seed, { x: tile.x, y: tile.y }, tile.biome)) {
          if (m.wonFrom.length === 0) fromTheGround.add(m.id);
        }
      }
    }
    // Flint is the one Uma's commission needs, so it is named rather than counted.
    expect([...fromTheGround], 'no mineral is gatherable on this map').toContain('material_flint');
    expect(fromTheGround.size).toBeGreaterThan(1);
  });
});
