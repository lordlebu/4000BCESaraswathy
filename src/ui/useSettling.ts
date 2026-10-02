// Settling, from React's side: what the place panel says about building at a ground, the
// negotiation with a ground's holder, and the settlement page once the people have moved in.
//
// **The fifth hook out of `App.tsx`** (`docs/satchel-and-hearth.md`, phase 9), moved as it was with
// no change in behaviour. Every rule is in `content/homestead.ts` -- `mayAsk`, `mayBuild`, `build`,
// `settle`, `buildingTiles` -- and the panels are `PlacePanel`, `Negotiation` and `Ending`. The
// homestead's flags still live in the journey's flags, bumped through `setHomeFlags`, because the
// guidance and the scene read them too.

import { useMemo, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { isComplete, type Progress } from '../journey';
import { anyConditions, type GameEvent } from '../content/events';
import {
  agreed as groundAgreed,
  build as buildStage,
  buildingTiles,
  groundAt,
  homesteadOn,
  mayAsk,
  mayBuild,
  readyToSettle,
  settle as settleHome,
  spendStage,
  stagesBuilt,
  stateOf as homesteadState,
  type Holdings
} from '../content/homestead';
import { stagePin } from '../content/goals';
import { npc } from '../content/places';
import type { Satchel } from '../content/satchel';
import { standingOn as howKnownOn } from '../content/standing';
import type { World } from '../world/types';
import type { NegotiationProps } from './Negotiation';
import type { SettlingView } from './PlacePanel';
import type { SurfaceAction } from './surface';

export function useSettling({
  standingOn,
  fieldMapId,
  world,
  fieldPlaced,
  journeyFlags,
  metStrangers,
  progress,
  satchel,
  setSatchel,
  holdings,
  peopleOfMap,
  pinned,
  setPinned,
  homeTick,
  setHomeFlags,
  setHappening,
  dispatch
}: {
  standingOn: string | null;
  fieldMapId: string;
  world: World | null;
  fieldPlaced: MutableRefObject<{ poiId: string; at: { x: number; y: number } }[]>;
  journeyFlags: MutableRefObject<string[]>;
  metStrangers: MutableRefObject<string[]>;
  progress: Progress;
  satchel: Satchel;
  setSatchel: Dispatch<SetStateAction<Satchel>>;
  holdings: Holdings;
  peopleOfMap: string[];
  pinned: string | null;
  setPinned: Dispatch<SetStateAction<string | null>>;
  homeTick: number;
  setHomeFlags: (next: string[]) => void;
  setHappening: (h: { event: GameEvent; shelter: string | null } | null) => void;
  dispatch: Dispatch<SurfaceAction>;
}) {
  /** The ground whose holder is being talked round, while the negotiation is open. */
  const [negotiatingAt, setNegotiatingAt] = useState<string | null>(null);

  const settling = useMemo<SettlingView | null>(() => {
    void homeTick;
    const here = standingOn ? groundAt(standingOn) : null;
    if (!here || here.homestead.fieldMapId !== fieldMapId) return null;
    const { homestead, ground } = here;
    const state = homesteadState(fieldMapId, journeyFlags.current);
    const holder = npc(ground.heldBy)?.name ?? 'The holder';
    const facts = { finished: (id: string) => isComplete(progress, id), met: metStrangers.current };
    const standing = howKnownOn(fieldMapId, facts).standing;
    const helpedHere = peopleOfMap.filter((id) => holdings.helped.includes(id)).length;
    const chosen = homestead.grounds.find((g) => g.id === state.ground) ?? null;
    const building = chosen && groundAgreed(chosen, state) ? chosen : null;

    if (state.settled) {
      return building?.id === ground.id
        ? {
            title: homestead.name,
            lines: ['The people who backed it live here now.'],
            action: {
              label: 'Read the settlement page',
              blocked: null,
              onDo: () => dispatch({ type: 'open-interrupt', which: 'ending' })
            }
          }
        : { title: homestead.name, lines: [`You settled at ${chosen?.name ?? 'another ground'}.`], action: null };
    }
    if (building && building.id !== ground.id) {
      return { title: ground.name, lines: [`You are building at ${building.name}.`], action: null };
    }
    if (building) {
      const built = stagesBuilt(homestead, state);
      const lines = [`${built} of ${homestead.stages.length} stages stand.`];
      if (readyToSettle(homestead, state)) {
        return {
          title: homestead.name,
          lines,
          action: {
            label: 'Settle here',
            blocked: null,
            onDo: () => {
              setHomeFlags(settleHome(homestead, journeyFlags.current));
              dispatch({ type: 'open-interrupt', which: 'ending' });
            }
          }
        };
      }
      const may = mayBuild(homestead, state, satchel, helpedHere);
      const next = homestead.stages[built]!;
      const pin = stagePin(fieldMapId);
      return {
        title: homestead.name,
        lines,
        // The next stage can be pinned like a recipe: the dock then counts off what it wants.
        pin: { on: pinned === pin, toggle: () => setPinned((p) => (p === pin ? null : pin)) },
        action: {
          label: next.name,
          blocked: may.ok ? null : may.why,
          onDo: () => {
            if (!may.ok) return;
            const done = buildStage(homestead, journeyFlags.current, may.stage);
            setSatchel((bag) => spendStage(bag, done.spends));
            setHomeFlags(done.flags);
            // The stage is a moment, so it gets a card: the painting of the ground, what the diary
            // says of the stage, and one way on.
            setHappening({
              event: {
                id: `homestead:${may.stage.id}`,
                title: may.stage.name,
                occasion: 'arriving',
                conditions: anyConditions(),
                prose: may.stage.prose,
                art: 'settle-ground',
                choices: [
                  {
                    id: 'look',
                    label: 'Stand back and look at it',
                    needs: [],
                    line: 'You stand back and look at it for a long while, and somebody beside you does the same.',
                    grants: []
                  }
                ],
                once: true
              },
              shelter: null
            });
          }
        }
      };
    }
    // Dry, level ground near enough to build on, or the ground says it has none. The owner's rule
    // is not bent to fit a wet seed: no mill in the marsh.
    const placed = world ? fieldPlaced.current : [];
    const at = placed.find((p) => p.poiId === ground.at)?.at;
    if (world && at && !buildingTiles(world, at, placed.map((p) => p.at))) {
      return {
        title: ground.name,
        lines: [ground.prose, "There's no dry, level ground near enough here to build on."],
        action: null
      };
    }
    const ask = mayAsk(homestead, ground, state, standing);
    return {
      title: ground.name,
      lines: [ground.prose],
      action: {
        label: `Ask ${holder} about building here`,
        blocked: ask.ok ? null : ask.why,
        onDo: () => setNegotiatingAt(ground.id)
      }
    };
  }, [homeTick, standingOn, fieldMapId, progress, satchel, holdings, peopleOfMap, setHomeFlags, world, pinned]);

  /** The negotiation's props, while one is open. `key` it on the ground so a new one starts fresh. */
  const negotiation: NegotiationProps | null = (() => {
    const here = negotiatingAt ? homesteadOn(fieldMapId) : null;
    const ground = here?.grounds.find((g) => g.id === negotiatingAt) ?? null;
    if (!here || !ground) return null;
    return {
      open: true,
      homestead: here,
      ground,
      flags: journeyFlags.current,
      holdings,
      peopleHere: peopleOfMap,
      onFlags: setHomeFlags,
      onClose: () => setNegotiatingAt(null)
    };
  })();

  /** The settled map, for the settlement page, or null before the people have moved in. */
  const settlement = (() => {
    void homeTick;
    const homestead = homesteadOn(fieldMapId);
    if (!homestead || !homesteadState(fieldMapId, journeyFlags.current).settled) return null;
    return { name: homestead.name, prose: homestead.settled, people: peopleOfMap, fieldMapId };
  })();

  return { settling, negotiation, settlement };
}
