// Where a map's settlement stands, as four steps, and the one thing to do next.
//
// **Why.** Settling is each map's goal, and the first play-through never found it: no rumour, no
// diary page, nothing until the traveller happened to stand on Hasme's field or Drel's granary.
// Games that hang a long goal on a map give it a page the player can always open (Stardew's
// community-centre bundles, Spiritfarer's boat) and one line that always answers "what now" (A Short
// Hike). This is both, read off what the save already holds -- nothing here is stored.
//
// Pure, and free of React and Phaser. `content/homestead.ts` holds every rule; this only arranges
// them in the order a player meets them.

import { type Homestead, type HomesteadState, agreed, nextStage, stagesBuilt, ASK_FROM } from './homestead';
import { STANDINGS, STANDING_WORDS, KNOWN_BY_UNDERSTANDING, type StandingOn } from './standing';
import { fieldMap, npc, poi } from './places';
import { whereFrom } from './sources';
import { nameOf } from './making';

export type StepState = 'done' | 'now' | 'later';

export interface SettlingStep {
  id: 'known' | 'ground' | 'build' | 'settle';
  label: string;
  state: StepState;
  /** One or two sentences: what it takes, and how far along it is. */
  detail: string[];
}

export interface SettlingRoad {
  title: string;
  steps: SettlingStep[];
  /** The one thing to do next, as a sentence for the notes. Null once settled. */
  next: string | null;
}

export interface SettlingFacts {
  standing: StandingOn;
  state: HomesteadState;
  /** People of this map the traveller has helped: hands to raise a stage. */
  helpedHere: number;
  carried: Readonly<Record<string, number>>;
}

const the = (name: string): string => name.replace(/^The /, 'the ');

/**
 * The road to settling this map, or a single line for a map nobody settles.
 *
 * The Aravali is a crossing by the owner's ruling, and says so rather than showing an empty page.
 */
export function settlingRoad(fieldMapId: string, homestead: Homestead | null, facts: SettlingFacts): SettlingRoad | null {
  const map = fieldMap(fieldMapId);
  if (!map) return null;
  if (!homestead) {
    return {
      title: map.name,
      steps: [],
      next: null
    };
  }
  const { standing, state, helpedHere, carried } = facts;
  const known = STANDINGS.indexOf(standing.standing) >= STANDINGS.indexOf(ASK_FROM);
  const chosen = homestead.grounds.find((g) => g.id === state.ground) ?? null;
  const agreedGround = chosen && agreed(chosen, state) ? chosen : null;
  const built = stagesBuilt(homestead, state);
  const stage = nextStage(homestead, state);
  const holders = homestead.grounds.map((g) => `${npc(g.heldBy)?.name ?? 'somebody'} at ${the(poi(g.at)?.name ?? g.name)}`);

  const steps: SettlingStep[] = [];

  steps.push({
    id: 'known',
    label: 'Be known here',
    state: known ? 'done' : 'now',
    detail: known
      ? [`${STANDING_WORDS[standing.standing]}.`]
      : [
          `Help someone here, or finish ${KNOWN_BY_UNDERSTANDING} discoveries on this map.`,
          `You have helped ${standing.helped.length} of the ${standing.helpable.length} who could use it, and finished ${standing.understood}.`
        ]
  });

  steps.push({
    id: 'ground',
    label: 'Ask for ground',
    state: agreedGround ? 'done' : known ? 'now' : 'later',
    detail: agreedGround
      ? [`${npc(agreedGround.heldBy)?.name ?? 'The holder'} agreed: you may build at ${the(agreedGround.name)}.`]
      : chosen
        ? [`You are talking ${npc(chosen.heldBy)?.name ?? 'the holder'} round: ${chosen.worries.filter((w) => state.eased.includes(w.id)).length} of ${chosen.worries.length} worries met.`]
        : [`The ground here is held by ${holders.join(', and ')}. Go and ask either.`]
  });

  const stageLines: string[] = [];
  if (stage) {
    const short = stage.needs.filter((n) => (carried[n.id] ?? 0) < n.count);
    stageLines.push(`${built} of ${homestead.stages.length} raised. Next, ${stage.name.toLowerCase()}.`);
    for (const n of short) {
      const where = whereFrom(n.id);
      stageLines.push(`${n.count} ${nameOf(n.id)}, you carry ${carried[n.id] ?? 0}${where ? `: ${where}` : ''}.`);
    }
    if (helpedHere < stage.backers) stageLines.push(`Hands to raise it: ${helpedHere} of ${stage.backers} people here you have helped.`);
  } else {
    stageLines.push('All of it is raised.');
  }
  steps.push({
    id: 'build',
    label: `Raise it, in ${homestead.stages.length} stages`,
    state: !agreedGround ? 'later' : stage ? 'now' : 'done',
    detail: stageLines
  });

  steps.push({
    id: 'settle',
    label: 'Settle',
    state: state.settled ? 'done' : !stage && agreedGround ? 'now' : 'later',
    detail: [state.settled ? 'People live here now.' : 'When it stands, the people who backed it move in.']
  });

  const now = steps.find((s) => s.state === 'now');
  const next = !now
    ? null
    : now.id === 'known'
      ? 'Help someone here, and the map will know you.'
      : now.id === 'ground'
        ? chosen
          ? `Go back to ${npc(chosen.heldBy)?.name ?? 'the holder'} at ${the(chosen.name)}.`
          : `Ask ${holders[0] ?? 'a holder'} for ground to build on.`
        : now.id === 'build'
          ? `Raise the ${stage?.name.toLowerCase() ?? 'next stage'} at ${the(agreedGround?.name ?? 'your ground')}.`
          : `Go to ${the(agreedGround?.name ?? 'your ground')} and settle.`;

  return { title: homestead.name, steps, next };
}
