// Things that happen to the traveller, from React's side: asking whether anything happens on a
// night, an arrival, a day's road or at a camp, a story beat first, and the card that opens -- and
// what choosing on it does.
//
// **The third hook out of `App.tsx`** (`docs/satchel-and-hearth.md`, phase 5), moved as it was with
// no change in behaviour. Every rule is still in `content/` -- `happeningNow` in `events.ts`, the
// woven events in `happenings.ts`, the beats in `storylines.ts` -- and the card is `EventCard`. The
// bus listeners that ask moved with the question they ask; the rest of the bus stays in `App`.
// `Happens`, the shape everything else calls it by, is `useRoadTalk`'s.

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { EventBus, type GameToUi } from '../game/EventBus';
import { isComplete, receiveAll, type Progress, type WorldMoment } from '../journey';
import { type Choice, type GameEvent, type Occasion } from '../content/events';
import { happeningNow, surroundingsAt, type CampTalk, type Talk, type Wanted } from '../content/happenings';
import { atCamp, encampmentOn, type Encampment } from '../content/encampments';
import { rumourAt } from '../content/rumours';
import { APPROACHES, approachAt, approachId } from '../content/visitors';
import { beatNow, type BeatWhen } from '../content/storylines';
import { add as addToSatchel, remove as takeFromSatchel, type Satchel } from '../content/satchel';
import { tileHash } from '../world/rng';
import type { World } from '../world/types';
import type { SurfaceAction } from './surface';
import type { EventCardProps } from './EventCard';
import type { Happens } from './useRoadTalk';

/** What the bus handlers read, kept current by `App` after every commit. See `latest` there. */
export interface Latest {
  progress: Progress;
  satchel: Satchel;
  world: World | null;
  fieldMapId: string;
  day: number;
  at: { x: number; y: number } | null;
  moment: WorldMoment | null;
  poiId: string | null;
  /** What the traveller is working towards, for the events that turn something up. See `wantedNow`. */
  wanted: Wanted | null;
}

export function useHappenings({
  latest,
  seenEvents,
  eventDays,
  journeyFlags,
  metStrangers,
  fieldPlaced,
  cardOpenRef,
  pageOpenRef,
  setCardOpen,
  crossing,
  heldArrival,
  arrivedRef,
  dispatch,
  progress,
  setProgress,
  setSatchel,
  setMemory
}: {
  latest: MutableRefObject<Latest>;
  seenEvents: MutableRefObject<string[]>;
  eventDays: MutableRefObject<Record<string, number>>;
  journeyFlags: MutableRefObject<string[]>;
  metStrangers: MutableRefObject<string[]>;
  /** Where this map's places landed, from the scene's `world-ready`. */
  fieldPlaced: MutableRefObject<{ poiId: string; at: { x: number; y: number } }[]>;
  /** Set the instant a card opens, so an effect in the same commit sees it. */
  cardOpenRef: MutableRefObject<boolean>;
  /**
   * True while the landmark's page is up. Nothing opens over it: a camp beside the landmark put its
   * welcome on top of the page, and the player was left facing a dacoit band instead of the
   * journey's end (`e2e/playthrough.spec.ts`, on the days the walk passed a camp).
   */
  pageOpenRef: MutableRefObject<boolean>;
  setCardOpen: (open: boolean) => void;
  /** True while the crossing is being told; an arrival then waits in `heldArrival`. */
  crossing: MutableRefObject<boolean>;
  heldArrival: MutableRefObject<string | null>;
  /** Filled here with the arrival handler, so stepping down off the cart can replay one. */
  arrivedRef: MutableRefObject<((e: { poiId: string }) => void) | null>;
  dispatch: Dispatch<SurfaceAction>;
  progress: Progress;
  setProgress: Dispatch<SetStateAction<Progress>>;
  setSatchel: Dispatch<SetStateAction<Satchel>>;
  setMemory: (line: string) => void;
}) {
  const [happening, setHappening] = useState<{ event: GameEvent; shelter: string | null } | null>(null);
  useEffect(() => {
    cardOpenRef.current = happening !== null;
    setCardOpen(happening !== null);
  }, [happening, cardOpenRef, setCardOpen]);

  /** `maybeHappens`, once the bus effect has made it. Null for the first render only. */
  const happens = useRef<Happens | null>(null);
  // The story check, handed out of the effect like `happens`; see `storyNow`.
  const storyRef = useRef<((when: BeatWhen, poiId: string | null) => boolean) | null>(null);
  /** The last day a road event was asked about, so the question is one a day and not one a step. */
  const lastRoadDay = useRef(-1);

  useEffect(() => {
    /**
     * Ask whether anything happens, and open it if so.
     *
     * **One function for all three occasions**, because the only thing that differs between a
     * night, an arrival and a mile of road is the word and the shelter — everything else is the
     * same question asked of the same registry with the same seeded roll. Three copies of this
     * would be three places for the `holds` list to drift out of step.
     */
    const maybeHappens = (
      occasion: Occasion,
      at: { x: number; y: number },
      shelter: string | null,
      salt: string,
      extra: {
        poiId?: string | null;
        taken?: readonly string[];
        strangerId?: string | null;
        talk?: Talk | null;
        camp?: Encampment | null;
        campStanding?: string | null;
        campPerson?: CampTalk | null;
        cameFrom?: string | null;
        force?: { kind?: string; asked?: boolean };
      } = {}
    ): boolean => {
      const world = latest.current.world;
      if (!world || pageOpenRef.current) return false;
      const p = latest.current.progress;
      // Seeded on the tile and the salt, like every other roll in this codebase: the same seed
      // must produce the same journal text, and `Math.random` here would make a seed
      // unshareable and this untestable.
      const roll = (s: string) => tileHash(world.seed, at.x, at.y, `${salt}:${s}`);
      const next = happeningNow(
        {
          occasion,
          shelter,
          fieldMapId: latest.current.fieldMapId,
          day: latest.current.day,
          // Everything the player holds, in the one flat list `Choice.needs` and
          // `Conditions.requires` are checked against -- words, discoveries they have at least
          // noticed, and recipes somebody has shown them. Assembled here because App is the only
          // thing that holds a Progress.
          holds: [...p.words, ...Object.keys(p.rungs), ...p.recipes],
          seen: seenEvents.current,
          met: metStrangers.current,
          last: eventDays.current,
          flags: journeyFlags.current,
          poiId: extra.poiId ?? null,
          cameFrom: extra.cameFrom ?? null,
          campKind: extra.camp?.kind ?? null
        },
        roll,
        // What is here to make an event out of, when nothing authored can happen -- see
        // `happenings.ts`. Read from the same world and tile the roll is seeded on.
        surroundingsAt(world, at, latest.current.fieldMapId, latest.current.moment, roll, {
          ...extra,
          wanted: latest.current.wanted
        }),
        undefined,
        extra.force ?? null
      );
      if (!next) return false;
      // A storylet can come round again, so `seen` must not grow a copy of it each time.
      if (!seenEvents.current.includes(next.id)) seenEvents.current = [...seenEvents.current, next.id];
      eventDays.current = { ...eventDays.current, [next.id]: latest.current.day };
      // Said at once, not on the next render: an effect earlier in this component can run in the
      // same commit and must already see the card it would otherwise open a second one over.
      cardOpenRef.current = true;
      setHappening({ event: next, shelter });
      return true;
    };

    /**
     * **The inspector: open an event now, without walking for three days to be rationed one.**
     *
     * `__happen('road')` asks the road question with the ration skipped; `__happen('night',
     * 'knock', 'roof')` asks for one template on one kind of night. It goes through exactly the path
     * a real step does -- the same surroundings, the same `seen` and `met`, the same card -- so what
     * it proves is the wiring, which no Node test can see. Exposed the way the scene exposes
     * `__walker` and `__travellers`, and for the same reason: `e2e/happenings.spec.ts` reads it.
     * Returns whether a card opened.
     *
     * `poiId` says which point an `arriving` is at, for a written happening narrowed to one -- *Where
     * you stop* belongs to the Caravan Ground. Absent, it is wherever the traveller is standing.
     */
    (
      window as unknown as {
        __happen?: (o: Occasion, kind?: string, shelter?: string, poiId?: string) => boolean;
      }
    ).__happen = (occasion, kind, shelter, poiId) => {
      const here = latest.current.at;
      if (!here) return false;
      return maybeHappens(occasion, here, shelter ?? null, `inspect:${occasion}`, {
        poiId: poiId ?? latest.current.poiId,
        force: kind ? { kind } : {}
      });
    };

    /**
     * A night passed. Ask whether anything happened in it.
     *
     * **`night-passed` had no listener at all** before events: emitted every time somebody slept,
     * carrying where they were and what shelter they had, and read by nothing.
     */
    const onNight = ({ at, shelter }: GameToUi['night-passed']) => {
      if (storyNow('night', null)) return;
      // **Beside a camp, the night is at their fire.** The first night slept beside each camp is
      // asked for rather than rationed: its own kind's untold story if canon has one, else the fire
      // or what comes to the edge of its light. Every night after is an ordinary one.
      const world = latest.current.world;
      const camp = world ? encampmentOn(world, latest.current.fieldMapId, fieldPlaced.current, latest.current.day) : null;
      if (camp && atCamp(camp, at)) {
        const first = !journeyFlags.current.includes(`fireside:${camp.id}`);
        if (first) journeyFlags.current = [...journeyFlags.current, `fireside:${camp.id}`];
        if (maybeHappens('night', at, shelter, `fireside:${camp.id}`, { camp, ...(first ? { force: { asked: true } } : {}) })) return;
      }
      maybeHappens('night', at, shelter, `night:${latest.current.day}`);
    };

    /**
     * Reached an authored place for the first time this journey.
     *
     * `poi-reached` rather than `standing-on`, deliberately: that one is a *state* and re-fires
     * every time you walk back onto the tile, so an arrival event would replay on every visit.
     * This one means what its name says.
     */
    const onArrived = ({ poiId }: GameToUi['poi-reached']) => {
      // On the cart, the arrival waits: the cards are still telling the road. See `stepDown`.
      if (crossing.current) {
        heldArrival.current = poiId;
        return;
      }
      if (storyNow('arriving', poiId)) return;
      // Somebody who comes over, the first time you arrive where they are. They take the arrival:
      // a card and a person walking up at once would be two things asking for the same moment.
      const approach = approachAt(poiId, seenEvents.current);
      if (approach) {
        seenEvents.current = [...seenEvents.current, approachId(approach)];
        EventBus.emitEvent('approach', { npcId: approach.npcId, sheet: approach.sheet });
        return;
      }
      const here = latest.current.at;
      if (!here) return;
      // A place a stranger sent you to keeps the promise first, unrationed: see `rumourKept`.
      if (
        rumourAt(poiId, journeyFlags.current) &&
        maybeHappens('arriving', here, null, `rumour:${poiId}`, {
          poiId,
          campStanding: latest.current.world
            ? (encampmentOn(latest.current.world, latest.current.fieldMapId, fieldPlaced.current, latest.current.day)?.id ?? null)
            : null,
          force: { kind: 'rumour-kept', asked: true }
        })
      ) {
        return;
      }
      maybeHappens('arriving', here, null, `arriving:${poiId}`, { poiId });
    };

    /**
     * Something on the road, at most once a day.
     *
     * **The rarity is the caller's, not the event's, and that is the design.** `tile-entered` fires
     * on every step -- eighty or so a day -- and asking on each one would make a road event either
     * constant or, if each event guarded its own odds, a die rolled eighty times a day in eighty
     * different authored places. A day is a rhythm the game already has and a player already feels,
     * so the question is asked once per day of walking and the event's own `conditions` decide the
     * rest. No new field, and nothing for an author to remember.
     */
    const onRoad = ({ at, day }: GameToUi['tile-entered']) => {
      if (day === lastRoadDay.current) return;
      lastRoadDay.current = day;
      if (storyNow('road', null)) return;
      maybeHappens('road', at, null, `road:${day}`);
    };

    /**
     * Walking up to a camp opens its scene, once a camp. Asked for rather than rationed: a camp is
     * somewhere the player went, and the road's pacing is for what happens to them on the way.
     */
    const onCampSeen = ({ at, day }: GameToUi['tile-entered']) => {
      const world = latest.current.world;
      if (!world) return;
      const camp = encampmentOn(world, latest.current.fieldMapId, fieldPlaced.current, day);
      if (!camp || !atCamp(camp, at) || seenEvents.current.includes(`woven:camp:${camp.id}`)) return;
      // Not over another card: the next step beside the fire asks again.
      if (cardOpenRef.current) return;
      maybeHappens('arriving', at, null, `camp:${camp.id}`, { camp, force: { kind: 'camp', asked: true } });
    };

    // Handed out of the effect so the activity card can ask too: a take is not a bus event, it is a
    // modal React owns, and closing it is where the `working` question belongs.
    /**
     * **A story beat first.** Guyuk's and the princess's arcs (`content/storylines.ts`) are asked
     * before anything rationed or woven, at the same three moments: arriving somewhere, a night, a
     * day's road. A beat waits until it can be taken whole, so this either opens its card or is quiet.
     */
    const storyNow = (when: BeatWhen, poiId: string | null): boolean => {
      if (pageOpenRef.current) return false;
      const p = latest.current.progress;
      const carried = latest.current.satchel;
      const event = beatNow(when, {
        fieldMapId: latest.current.fieldMapId,
        day: latest.current.day,
        poiId,
        flags: journeyFlags.current,
        // A discovery must be understood; a word, a recipe or a question held.
        holds: (id) =>
          id.startsWith('discovery_') ? isComplete(p, id) : p.words.includes(id) || p.recipes.includes(id),
        carried: (id) => carried[id] ?? 0
      });
      if (!event) return false;
      cardOpenRef.current = true;
      setHappening({ event, shelter: null });
      return true;
    };
    storyRef.current = storyNow;

    happens.current = maybeHappens;
    arrivedRef.current = (e) => onArrived(e as GameToUi['poi-reached']);

    /** They have walked up and are standing beside you: open what they have to say. */
    const onApproached = ({ npcId }: GameToUi['approached']) => dispatch({ type: 'talk-to', npcId });

    /**
     * The inspector for approaches, beside `__happen`: bring somebody over now, wherever you are.
     * The same bus message a first arrival sends, so what it proves is the walk and the wiring.
     */
    (window as unknown as { __approach?: (npcId: string) => boolean }).__approach = (npcId) => {
      const approach = APPROACHES.find((a) => a.npcId === npcId);
      if (!approach || !latest.current.at) return false;
      EventBus.emitEvent('approach', { npcId: approach.npcId, sheet: approach.sheet });
      return true;
    };

    EventBus.onEvent('approached', onApproached);
    EventBus.onEvent('night-passed', onNight);
    EventBus.onEvent('poi-reached', onArrived);
    EventBus.onEvent('tile-entered', onRoad);
    EventBus.onEvent('tile-entered', onCampSeen);
    return () => {
      EventBus.offEvent('approached', onApproached);
      EventBus.offEvent('night-passed', onNight);
      EventBus.offEvent('poi-reached', onArrived);
      EventBus.offEvent('tile-entered', onRoad);
      EventBus.offEvent('tile-entered', onCampSeen);
    };
    // Registered once, like the rest of the bus: every handler reads the refs, never the closure.
  }, []);

  /** The event card's props, or null while nothing is open. */
  const card: EventCardProps | null = happening
    ? {
        event: happening.event,
        shelter: happening.shelter,
        met: metStrangers.current,
        holds: [...progress.words, ...Object.keys(progress.rungs), ...progress.recipes],
        onChoose: (choice: Choice) => {
          // Through the same door a conversation uses. An event grants the same kinds of thing a
          // person does, so it must not grow a second way to change a Progress.
          if (choice.grants.length > 0) setProgress((p) => receiveAll(p, choice.grants));
          // Something found or given goes in the satchel, and something eased goes to the scene
          // through the door a remedy already uses -- see `Choice.gives` and `Choice.eases`.
          // And what a story beat asked to be handed over leaves the satchel: rice to Guyuk, the
          // seeds to the Atelier. The beat only came because it was all carried.
          if (choice.takes && choice.takes.length > 0) {
            const taken = choice.takes;
            setSatchel((s) => taken.reduce((held, t) => takeFromSatchel(held, t.id, t.n), s));
          }
          if (choice.gives && choice.gives.length > 0) {
            const given = choice.gives;
            setSatchel((s) => given.reduce((held, g) => addToSatchel(held, g.id, g.n), s));
          }
          if (choice.eases && choice.eases > 0) EventBus.emitEvent('ease', { by: choice.eases });
          // What this choice leaves behind, for a later event to find.
          for (const flag of choice.sets ?? []) {
            if (!journeyFlags.current.includes(flag)) journeyFlags.current = [...journeyFlags.current, flag];
          }
          // Whoever this was about, you have met now.
          const stranger = happening.event.stranger;
          if (stranger && !metStrangers.current.includes(stranger.id)) {
            metStrangers.current = [...metStrangers.current, stranger.id];
          }
          // Noted rather than announced, like every other outcome in this game: the progression
          // is a written journal and a thing that happened to you is a line in it.
          setMemory(choice.line);
        },
        onClose: () => setHappening(null)
      }
    : null;

  return { happening, setHappening, happens, storyRef, card };
}
