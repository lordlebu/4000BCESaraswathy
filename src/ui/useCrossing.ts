// Crossing between maps, from React's side: setting out, the road told in cards while the next map
// builds behind them, and stepping down off the cart at the other end.
//
// **The sixth hook out of `App.tsx`** (`docs/satchel-and-hearth.md`, phase 9), moved as it was with
// no change in behaviour. The road is `content/places.ts`'s (`roadBetween`, `arrivalPoint`), the
// cards are `Journey.tsx`, and the scene builds the next map on `travel-to`. The crossing refs stay
// in App because the event hook reads them too: an arrival that lands mid-crossing waits in
// `heldArrival` until the cart is left.

import { useCallback, useState, type Dispatch, type MutableRefObject } from 'react';
import { EventBus } from '../game/EventBus';
import { arrivalPoint, roadBetween, type Road } from '../content/places';
import { CROSSING_MS } from '../content/tiers';
import type { SurfaceAction } from './surface';
import type { Happens } from './useRoadTalk';
import type { Latest } from './useHappenings';

export function useCrossing({
  seed,
  fieldMapId,
  setFieldMapId,
  journeyFlags,
  crossing,
  heldArrival,
  arrivedRef,
  discovered,
  latest,
  happens,
  dispatch
}: {
  seed: string;
  fieldMapId: string;
  setFieldMapId: (id: string) => void;
  journeyFlags: MutableRefObject<string[]>;
  crossing: MutableRefObject<boolean>;
  heldArrival: MutableRefObject<string | null>;
  arrivedRef: MutableRefObject<((e: { poiId: string }) => void) | null>;
  discovered: MutableRefObject<string[]>;
  latest: MutableRefObject<Latest>;
  happens: MutableRefObject<Happens | null>;
  dispatch: Dispatch<SurfaceAction>;
}) {
  /** The crossing being told, while the next map builds behind it. See `Journey.tsx`. */
  const [journey, setJourney] = useState<{ from: string; to: string; road: Road; first: boolean } | null>(null);

  const travel = useCallback(
    (next: string) => {
      // **The road, told.** The crossing opens its cards first and the next map builds behind them;
      // see `Journey.tsx`. A map with no road to `next` (none in canon today) still crosses, quietly.
      const road = roadBetween(fieldMapId, next);
      if (road) {
        const seenFlag = `road:${road.art}`;
        const first = !journeyFlags.current.includes(seenFlag);
        if (first) journeyFlags.current = [...journeyFlags.current, seenFlag];
        crossing.current = true;
        heldArrival.current = null;
        setJourney({ from: fieldMapId, to: next, road, first });
      }
      setFieldMapId(next);
      // Arriving in another country is leaving wherever you were standing, and the map that
      // sent you there has done its job.
      dispatch({ type: 'standing-on', poiId: null });
      dispatch({ type: 'close-interrupt', which: 'overworld' });
      discovered.current = [];
      // **The address bar says which country you are in**, the same way it already says which
      // seed and which character. `?map=` has been *read* since field maps shipped and never
      // written, so the URL described the last thing you typed rather than the thing on screen --
      // and a reload silently put you back on Lothal.
      //
      // That is not only a tidiness problem. It made a map impossible to report a bug about: a
      // screenshot of the Aravali came with a URL that would open Lothal, and the two were
      // compared as though they were the same map. It also makes every map one link away, which
      // is what a test wants and what somebody looking for the crossing wants.
      const url = new URL(window.location.href);
      url.searchParams.set('map', next);
      // **Set down at the new map's cart point**, which is where the cart goes. Written as `?at=`,
      // which the scene already reads, so a reload keeps you there -- and an `?at=` naming a place on
      // the map just left can no longer follow you across.
      const arrive = arrivalPoint(next);
      if (arrive) url.searchParams.set('at', arrive);
      else url.searchParams.delete('at');
      window.history.replaceState(null, '', url);
      // Half a day of the journey's clock: out in the morning, in by evening. See `CROSSING_MS`.
      EventBus.emitEvent('travel-to', { fieldMapId: next, seed, ride: road ? CROSSING_MS : 0 });
    },
    [seed, fieldMapId]
  );

  /**
   * The ride is over. **The first time on a road, something happens on it**: the road's own written
   * happening when canon has one -- the ferry song, the line where the sea was -- else one of the
   * road's woven events. Asked for, never rationed, and only once per road.
   */
  const stepDown = useCallback(() => {
    const done = journey;
    setJourney(null);
    crossing.current = false;
    const held = heldArrival.current;
    heldArrival.current = null;
    const here = latest.current.at;
    // **One thing, in this order.** The road's own written happening, the first time on it; else
    // whatever the arrival was holding -- somebody coming over, a rumour kept, an arrival card --
    // which the cards had kept waiting; else, the first time, one of the road's woven events.
    if (done?.first && here && happens.current?.('journey', here, null, `journey:${done.road.art}`, { cameFrom: done.from, force: { asked: true } })) return;
    if (held) {
      arrivedRef.current?.({ poiId: held });
      return;
    }
    if (done?.first && here) happens.current?.('road', here, null, `journey-road:${done.road.art}`, { force: { asked: true } });
  }, [journey]);

  return { journey, travel, stepDown };
}
