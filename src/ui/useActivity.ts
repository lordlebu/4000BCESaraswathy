// Doing something, from React's side: taking from the ground, making at a bench, stopping for the
// night, and using what is carried -- and the activity card that each of them opens.
//
// **The second hook out of `App.tsx`** (`docs/satchel-and-hearth.md`, phase 1), moved as it was
// with no change in behaviour, the way `useRoadTalk` went first. Every rule is still in `content/`
// -- `takeableAt` and `draw` in `nodes.ts`, `craft` in `journey.ts`, `momentFavours` and the
// gestures in `gestures.ts`, `use` in `using.ts` -- and the card is `ActivityModal`. What this takes
// from `App` is its parameter list, which is the seam written down, and what it hands back is the
// card's props, so `App` renders one line where it rendered sixty.

import { useCallback, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { EventBus } from '../game/EventBus';
import { craft, type Progress, type WorldMoment } from '../journey';
import type { Preparation } from '../content/activity';
import type { Bench } from '../content/crafting';
import { carry, gatheredLine } from '../content/gathering';
import { GESTURE_WANTS, gestureFor, isAboutAnAnimal, momentFavours, type Gesture } from '../content/gestures';
import { item, recipe } from '../content/making';
import { gestureForProcess } from '../content/making-gestures';
import type { Step } from '../content/making-chain';
import { draw, takeableAt, type Nodes, type Taking } from '../content/nodes';
import { routineFor } from '../content/routine';
import { canDo, itemsHeld, type Satchel } from '../content/satchel';
import { isAnimal, isWaterSpecies } from '../content/species';
import { use, usedLine, useOf } from '../content/using';
import { tileHash } from '../world/rng';
import type { BiomeId, Creature, Point } from '../world/types';
import type { ActivityModalProps } from './ActivityModal';
import { SHELTER_LABEL } from './JournalPanel';
import type { Happens } from './useRoadTalk';

/**
 * The activity being played.
 *
 * Holds what the tile promised at the moment the player committed, rather than recomputing it
 * when the run settles. `takeableAt` is a function of the day and the nodes, and both can move
 * under a modal that is open -- so re-asking would let a player see one offer and receive
 * another, which is exactly the "promising two reeds and handing over one" fault `Taking`
 * exists to prevent.
 */
export interface Activity {
  taking: Taking[];
  day: number;
  /** Set when this is a night rather than a gathering. Carries the shelter kind for the picture. */
  resting?: string;
  /**
   * Set when this is a bench job. Carries the recipe, because what is being made is not on the
   * ground and cannot be recovered from `underfoot` the way a gathered material can.
   */
  making?: string;
}

/** The tile under foot, as `App` derives it from the scene's last arrival. */
export interface Underfoot {
  at: Point;
  biome: BiomeId;
  seed: string;
}

/**
 * The bare process word for a recipe -- `firing`, not `process_firing`.
 *
 * The variant the activity card narrows its painting by, matching what `src/ui/scenes/` is named
 * after. `PROCESS_MARK` already keys on the same bare word, so the two art folders read canon's
 * vocabulary the same way.
 */
export function processWord(recipeId: string): string | null {
  const id = recipe(recipeId)?.process;
  return id ? id.replace('process_', '') : null;
}

export function useActivity({
  underfoot,
  day,
  fatigued,
  nodes,
  setNodes,
  satchel,
  setSatchel,
  progress,
  setProgress,
  bench,
  currentCreature,
  moment,
  setMemory,
  setLastMade,
  happens
}: {
  underfoot: Underfoot | null;
  /** The day of the journey, from the scene's last arrival. */
  day: number;
  /** Whether the scene has said the traveller is tired -- `fatigue.ts` owns the threshold. */
  fatigued: boolean;
  nodes: Nodes;
  setNodes: (update: (n: Nodes) => Nodes) => void;
  satchel: Satchel;
  setSatchel: Dispatch<SetStateAction<Satchel>>;
  progress: Progress;
  setProgress: Dispatch<SetStateAction<Progress>>;
  bench: Bench;
  currentCreature: Creature | null;
  moment: WorldMoment | null;
  setMemory: (line: string) => void;
  setLastMade: (steps: Step[]) => void;
  happens: MutableRefObject<Happens | null>;
}) {
  const [activity, setActivity] = useState<Activity | null>(null);
  /** What the last take carried off, so the `working` question does not turn up the same thing. */
  const lastTaken = useRef<string[]>([]);

  /**
   * Stoop and pick up whatever this tile offers.
   *
   * Done in React straight from the content layer rather than routed through the scene, on
   * the precedent `EventBus.ts` sets for observing a creature: the content layer is
   * framework-free and importable here, and going through the scene is what once made the
   * journal describe a crane while the sketch recorded an otter.
   */
  const pickUp = useCallback(() => {
    if (!underfoot) return;
    // What is *left* here, not what grows here. `gather` still does the carrying; this decides
    // what there is to carry, which is the whole of what a resource node changes.
    const taking = takeableAt(nodes, underfoot.seed, underfoot.at, underfoot.biome, day);
    if (taking.length === 0) return;

    // **Opening a modal rather than taking.** Everything below this line used to run here, and
    // that was the whole of the finding: a reed and a beedu manta came off the same click, so a
    // player looking for the hunting could not find it because there was no gesture to see.
    // `finishTaking` now holds what this did, and runs when the activity settles.
    setActivity({ taking, day });
  }, [underfoot, nodes, day]);

  /** Stop for the night, under whatever `shelterAt` has decided this is. */
  const startRest = useCallback((shelter: string) => setActivity({ taking: [], day, resting: shelter }), [day]);

  /**
   * What the old single click did, run once the activity is over.
   *
   * `taken` comes from `settle` rather than from `takeableAt`, so a clean run's extra is carried
   * *and* drawn down -- the two must agree or the satchel and the ground disagree about what left
   * the tile. The floor is `settle`'s: this can never be less than the click gave.
   */
  const finishTaking = useCallback(
    (taken: Taking[], line: string) => {
      if (!underfoot || taken.length === 0) return;
      setSatchel((s) => carry(s, taken));
      setNodes((n) => draw(n, underfoot.seed, underfoot.at, taken, day));
      lastTaken.current = taken.map((t) => t.material.id);
      // Noted rather than announced. The whole progression of this game is a written journal, so
      // a good cut is a sentence in the field notes and not a number in a badge. The activity's
      // own line wins when it has one, because it says how the hands went as well as what was cut.
      setMemory(line || gatheredLine(underfoot.seed, underfoot.at, underfoot.biome, taken) || '');
    },
    [underfoot, day, setNodes, setSatchel, setMemory]
  );

  /**
   * Which gesture the running activity is, from the material it is about.
   *
   * Derived rather than stored on the activity, so it cannot drift from the material the modal is
   * actually settling -- the two would be a pair of facts about the same thing, and pairs like
   * that disagree eventually.
   */
  const gesture = useMemo<Gesture | null>(
    () =>
      activity
        ? activity.resting
          ? 'rest'
          : activity.making
            ? gestureForProcess(recipe(activity.making)?.process ?? '')
            : gestureFor(activity.taking[0]!.material, isAnimal, isWaterSpecies)
        : null,
    [activity]
  );

  /**
   * What the player brought to the running activity.
   *
   * **Composed here because this is the only place holding all three answers** -- what is in the
   * satchel, what the animal is doing, and how tired the traveller is. `content/activity.ts`
   * grades it and the card renders it, and neither works any of it out.
   *
   * This memo replaced a seeded `roll` function whose *identity* was load-bearing: the card dealt
   * fresh timing bands in an effect keyed on it, so an inline arrow re-dealt them on every tick of
   * the card's own timer and the run never settled. Nine unit tests passed throughout and the
   * browser found it in one click. There is no timer and no deal any more, so the hazard is gone
   * rather than guarded -- but it is worth remembering why a plain object is the safer shape.
   */
  const preparation = useMemo<Preparation>(() => {
    if (!gesture) return { wants: null, equipped: false, favourable: true };
    const wants = GESTURE_WANTS[gesture];
    return {
      wants,
      equipped: wants === null ? false : canDo(satchel, wants),
      favourable: momentFavours(gesture, currentCreature ? routineFor(currentCreature, moment) : null, {
        // `fatigueNote` is prose and this needs a fact, so the scene's own word is read rather
        // than re-derived: it says nothing at all while the traveller is fresh, and says
        // something only once it is worth saying. That threshold is `fatigue.ts`'s to own.
        spent: fatigued,
        // A night under a roof, at a camp, or in a tent you pitched. The bedroll and the bare
        // sky are the two that are not -- and `shelterAt` has already decided which this is.
        sheltered: activity?.resting ? activity.resting !== 'bedroll' && activity.resting !== 'none' : true
      })
    };
  }, [gesture, satchel, currentCreature, moment, fatigued, activity?.resting]);

  /**
   * The name of the thing answering `preparation.wants`, for the card's clause.
   *
   * Named rather than counted, because "a flint knife will do the work" teaches which object did
   * it and "you have 1 cutting tool" teaches nothing. The first carried item that affords it, in
   * the satchel's own stable order, so the sentence does not change between renders.
   */
  const toolName = useMemo(() => {
    const wants = preparation.wants;
    if (!wants || !preparation.equipped) return null;
    const id = itemsHeld(satchel).find((held) => item(held)?.affords.includes(wants));
    return id ? item(id)?.name ?? null : null;
  }, [preparation.wants, preparation.equipped, satchel]);

  /**
   * Use something carried: a physic, a meal, or a shelter raised for the night.
   *
   * **The one verb that closes the three loops canon had data for and the game had no door to.**
   * Seven physics, thirteen foods and two shelters could all be crafted and none of them did
   * anything -- `cooking.ts` had no importer at all for its whole life. `content/using.ts` carries
   * the reasoning for why this is one verb rather than an apothecary screen, a kitchen and a
   * camp-builder.
   *
   * The satchel is React's and the clock is the scene's, so easing goes over the bus rather than
   * being applied here. A shelter is not spent, which is why the satchel can come back unchanged
   * and the `shelter-built` announcement still has to fire.
   */
  const useCarried = useCallback(
    (id: string) => {
      const what = useOf(id);
      if (!what) return;
      setSatchel((s) => use(s, id));
      if (what.eases > 0) EventBus.emitEvent('ease', { by: what.eases });
      setMemory(usedLine(id) ?? '');
    },
    [setSatchel, setMemory]
  );

  /**
   * Open the bench activity. The making itself happens when the run settles.
   *
   * **Checked before opening, not after.** `craft` is the rules layer's answer to whether this can
   * be made at all -- the satchel, the recipe, the bench -- and a modal that plays through three
   * beats and then refuses would be a worse version of a disabled button. So the answer is taken
   * here and the work is redone on settle against the state as it stands then.
   */
  const makeHere = useCallback(
    (recipeId: string) => {
      if (!craft(progress, satchel, recipeId, bench).made) return;
      setActivity({ taking: [], day, making: recipeId });
    },
    [progress, satchel, bench, day]
  );

  /** What the old single click did, run once the bench activity is over. */
  const finishMaking = useCallback(
    (recipeId: string) => {
      const done = craft(progress, satchel, recipeId, bench);
      if (!done.made) return;
      setProgress(done.progress);
      setSatchel(done.satchel);
      setLastMade(done.steps);
    },
    [progress, satchel, bench, setProgress, setSatchel, setLastMade]
  );

  /**
   * Everything the activity card needs, or null while nothing is running.
   *
   * Mounted only while one is running, so every open starts fresh rather than resuming a run the
   * player has forgotten the state of.
   */
  const card: ActivityModalProps | null =
    activity && underfoot && gesture
      ? {
          open: true,
          gesture,
          promised: activity.taking,
          preparation,
          toolName,
          creatureId: isAboutAnAnimal(gesture, activity) ? currentCreature?.id ?? null : null,
          creatureName: isAboutAnAnimal(gesture, activity) ? currentCreature?.name ?? null : null,
          /**
           * Which painting to prefer.
           *
           * A night takes the shelter kind, a making takes the process word, and **a take on the
           * ground takes the biome** — so cutting herbs on a cliff and cutting reeds at a waterline
           * can be two different pictures of the same gesture. All three fall back to the plain
           * gesture scene, so every one of them is a file and no code, and a variant nobody has
           * painted is not an error.
           */
          variant: activity.resting ?? (activity.making ? processWord(activity.making) : underfoot.biome ?? null),
          /**
           * Which of this thing's paintings to show.
           *
           * Seeded on the tile and the day, like every other choice the game makes — two players
           * on one seed see the same night. A second painting never replaces a first, so this is
           * what decides between them; with one painting it changes nothing.
           */
          pick: tileHash(underfoot.seed, underfoot.at.x, underfoot.at.y, `take:${activity.day}`),
          subject: activity.resting
            ? SHELTER_LABEL[activity.resting] ?? 'Stop for the night'
            : activity.making
              ? recipe(activity.making)?.name ?? 'it'
              : null,
          onClose: () => {
            setActivity(null);
            // The night is spent on the way out rather than when the run settles, so a player who
            // changes their mind has not already slept. `camp` is the rules layer's own event and
            // it still decides whether a night is legal.
            if (activity.resting) EventBus.emitEvent('camp', {});
            // Something happening around the work, asked as the card closes rather than when the
            // take settles so the two cards never stand on each other. Only a take that carried
            // something off: closing the card without taking is changing your mind, not working.
            else if (!activity.making && lastTaken.current.length > 0) {
              const taken = lastTaken.current;
              lastTaken.current = [];
              happens.current?.(
                'working',
                underfoot.at,
                null,
                `working:${activity.day}:${underfoot.at.x},${underfoot.at.y}`,
                { taken }
              );
            }
          },
          onFinish: activity.resting
            ? () => {}
            : activity.making
              ? () => finishMaking(activity.making!)
              : finishTaking
        }
      : null;

  return { activity, card, pickUp, startRest, makeHere, useCarried };
}
