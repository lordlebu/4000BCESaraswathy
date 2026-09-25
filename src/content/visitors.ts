// People who come to you, rather than waiting to be found.
//
// **Everybody else in this game waits.** A named person stands at their place, or walks a circuit
// between places, and the traveller goes to them. The Asura-Tainted Princess is the first person who
// does the reverse: the first time the traveller reaches the Cloud Stair she is already there, and
// walks up and says hello before anybody has chosen her from a list.
//
// That is a verb, so it is the game's. Canon says who she is, where she is found and what she says
// (`npc_asura_princess`); this says only that at one place, once, she comes over. Everything after
// her walking up is the ordinary conversation, with her canon lines, her portrait and the diary --
// nothing about talking to her is special, only how it starts.
//
// Pure: no React, no Phaser. The scene walks her; `App` asks this whether anybody comes.

import { npc } from './places';

/** Somebody who walks up to the traveller at one place, the first time the traveller arrives. */
export interface Approach {
  /** The canon person. */
  npcId: string;
  /** The place where they come over. Must be one of the person's `found_at`. */
  at: string;
  /** The built sheet that draws them walking up. */
  sheet: string;
}

export const APPROACHES: readonly Approach[] = [
  // At the edge of the Narmada plateau, where canon's nomads walk. The owner first placed her at
  // the Dwarka portal and moved her: the road's nomads do not walk Dwarka. The Cloud Stair is the
  // plateau's own anomaly -- a stair that keeps going after the scarp stops.
  { npcId: 'npc_asura_princess', at: 'poi_cloud_stair', sheet: 'asura-princess' }
];

/** How an approach is remembered in the journey's `seen` list, so it happens once. */
export const approachId = (a: Approach): string => `approach:${a.npcId}`;

/**
 * Who comes over on arriving here, or null.
 *
 * Only somebody canon actually places here, and only the first time: after that they are at the
 * place like anybody else, and the traveller chooses them from the list.
 */
export function approachAt(poiId: string, seen: readonly string[]): Approach | null {
  return (
    APPROACHES.find(
      (a) => a.at === poiId && !seen.includes(approachId(a)) && (npc(a.npcId)?.foundAt.includes(poiId) ?? false)
    ) ?? null
  );
}
