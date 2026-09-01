// Finding one species among two hundred.
//
// The album holds everything the traveller has met, and that is a bigger number than it sounds:
// **145 to 193 distinct species are reachable by walking a single map**, and a player who visits
// all three can hold well over three hundred. Until now it was two flat lists -- creatures, then
// growing things -- which is fine at twenty and a wall at two hundred.
//
// Two things fix it and neither needs new data.
//
// **Grouping by biome**, because canon already states where a species lives and because it is the
// question a field naturalist actually asks: not *what have I got*, but *what lives in the
// wetland*. It is also the grouping the field notes already use -- the surroundings line names
// biomes, so the album and the notes end up speaking the same way about the same ground.
//
// **Search**, because past about a hundred entries scanning stops working. It reads the name, the
// binomial and the aliases, which matters more than it looks: canon calls the strychnine tree
// `Kuchla` and a player who knows it as nux-vomica found nothing at all. That is the exact failure
// that put `aliases` into canon, and a search that ignored them would reintroduce it.
//
// Pure and free of React, like everything in `content/`. The panel renders what these return.

import { biomeFor, metSpecies } from './species';
import type { Meeting } from './collection';
import type { BiomeId } from '../world/types';

/** One heading and the meetings under it. */
export interface AlbumGroup {
  /** The biome id, or `''` for the catch-all. */
  id: string;
  /** What the heading says. */
  name: string;
  members: Meeting[];
}

/**
 * Does this meeting match what was typed?
 *
 * Matches on the name, the binomial and every alias, case-insensitively, on substring rather than
 * prefix -- somebody searching "vomica" should find "Strychnos nux-vomica", and requiring them to
 * start at the beginning of a binomial is asking them to know the answer first.
 */
export function matches(meeting: Meeting, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const species = metSpecies(meeting.id);
  if (!species) return false;

  const haystack = [species.name, species.binomial ?? '', ...(species.aliases ?? [])];
  return haystack.some((word) => word.toLowerCase().includes(q));
}

/**
 * The meetings, grouped by the ground they live on.
 *
 * **A species appears under every biome it lives on, not just one.** A mangrove crab is a fact
 * about the wetland *and* about the coast, and picking one would make the other list wrong -- a
 * player scanning "what lives on the coast" is asking about the coast, not about a filing system.
 * The duplication is the honest answer and the counts in the headings say so.
 *
 * Groups come back in `order`, which the caller supplies so the album can match the order the
 * legend and the map already use rather than inventing a third one. A biome nobody has met
 * anything in is left out entirely: an empty heading is a heading that costs a line and says
 * nothing.
 */
export function byBiome(meetings: readonly Meeting[], order: readonly BiomeId[]): AlbumGroup[] {
  const buckets = new Map<string, Meeting[]>();
  const homeless: Meeting[] = [];

  for (const meeting of meetings) {
    const species = metSpecies(meeting.id);
    const biomes = species?.biomes ?? [];
    if (biomes.length === 0) {
      // Canon has species with no renderable biome -- `lore` ones, and any whose ground the
      // engine cannot draw yet. They are still met if the game placed them, so they get a
      // heading rather than vanishing out of an album that claims to hold everything.
      homeless.push(meeting);
      continue;
    }
    for (const biome of biomes) {
      const bucket = buckets.get(biome);
      if (bucket) bucket.push(meeting);
      else buckets.set(biome, [meeting]);
    }
  }

  const groups: AlbumGroup[] = [];
  for (const biome of order) {
    const members = buckets.get(biome);
    if (!members || members.length === 0) continue;
    groups.push({ id: biome, name: biomeFor(biome)?.name ?? biome, members });
  }

  // Anything the caller's order did not mention, so a new biome cannot silently disappear from
  // the album by being missing from one list.
  for (const [biome, members] of buckets) {
    if (order.includes(biome as BiomeId)) continue;
    groups.push({ id: biome, name: biomeFor(biome as BiomeId)?.name ?? biome, members });
  }

  if (homeless.length > 0) {
    groups.push({ id: '', name: 'Elsewhere', members: homeless });
  }
  return groups;
}
