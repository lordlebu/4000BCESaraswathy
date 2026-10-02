// The next step, always: one line saying what to do now, once the first morning is over.
//
// **The owner asked for the game to hand-hold** (`docs/satchel-and-hearth.md`, phase 8). The first
// morning's coach (`coach.ts`) teaches five verbs and stops at the flint knife; after that the only
// guide was the pinned recipe's line, and with nothing pinned the dock said nothing at all about what
// to do. Stardew's journal, Spiritfarer's task list and A Short Hike's single nudge all answer that in
// one line, and so does this -- in an order: the building this map is working towards, then somebody
// with something new to say, then a place not yet seen. The Hints switch turns it off with the coach.
//
// Pure, and free of React and Phaser. App gathers the facts; the dock draws the line.

import { bearingTo } from './journal';
import type { Point } from '../world/types';

/** What the guide can suggest pressing, beside its words. */
export type GuideAction = { kind: 'pin'; pin: string; label: string };

export interface Guide {
  line: string;
  action: GuideAction | null;
}

export interface GuideFacts {
  /** The map's own next step towards settling, from `settlingRoad`, or null once settled or none. */
  road: string | null;
  /** The pin for this map's next building stage, when there is a stage to raise and ground to raise it on. */
  stage: { pin: string; name: string } | null;
  /** Somebody on this map with something new to say. Where they are moves with the hour, so it is not said. */
  news: { name: string } | null;
  /** The traveller's tile, for a bearing. */
  at: Point | null;
  /** The places on this map nobody has set eyes on yet, with where each stands. */
  unseen: { name: string; at: Point }[];
}

/**
 * The one thing to do next, or null when there is nothing worth saying.
 *
 * Only asked while nothing is pinned and the first morning is over: a pin is already a next step,
 * and the pinned line says it.
 */
export function nextStep(f: GuideFacts): Guide | null {
  if (f.stage) {
    return {
      line: `Next: ${f.stage.name.toLowerCase()}. Pin it to see what it still needs.`,
      action: { kind: 'pin', pin: f.stage.pin, label: `Pin ${f.stage.name}` }
    };
  }
  if (f.road) return { line: f.road, action: null };
  if (f.news) return { line: `${f.news.name} has something new to tell you.`, action: null };
  if (f.at && f.unseen.length > 0) {
    const near = [...f.unseen].sort(
      (a, b) => Math.abs(a.at.x - f.at!.x) + Math.abs(a.at.y - f.at!.y) - (Math.abs(b.at.x - f.at!.x) + Math.abs(b.at.y - f.at!.y))
    )[0]!;
    return { line: `You have not seen ${near.name} yet. It lies ${bearingTo(f.at, near.at)}.`, action: null };
  }
  return null;
}
