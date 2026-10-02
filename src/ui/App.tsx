// Layout and shared state. The map is a sibling, not a child — React never renders a tile.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { EventBus, type GameToUi } from '../game/EventBus';
import { PhaserGame } from '../game/PhaserGame';
import { Controls } from './Controls';
import { FrontDoor } from './FrontDoor';
import { CanonPanel } from './CanonPanel';
import { Here } from './Here';
import { SHELTER_LABEL } from './JournalPanel';
import { ShelterMark } from './ShelterMark';
import type { TileAction } from './TileActions';
import type { Step } from '../content/making-chain';
import { CollectionPanel } from './CollectionPanel';
import { Progress } from './Progress';
import { diaryCount } from './Diary';
import { Ending } from './Ending';
import { FieldKit } from './FieldKit';
import { Overworld } from './Overworld';
import { initialSurface, surfaceReducer } from './surface';
import { readShowing, writeShowing } from './preferences';
import { arrivalPoint, fieldMap, npc, poi, roadBetween, type Road } from '../content/places';
import { walkers } from '../game/characters';
import { travellerAttributes, travellersOn } from '../content/travellers';
import { SatchelPanel } from './SatchelPanel';
import { SatchelStrip } from './SatchelStrip';
import { RecordTabs, type RecordTab } from './Records';
import { PeoplePanel } from './PeoplePanel';
import { met } from '../content/people';
import { seedFromUrl } from './seed';
import { SettlingSection } from './SettlingSection';
import { settlingRoad } from '../content/settlingRoad';
import { WorkshopPanel } from './WorkshopPanel';
import { add as addToSatchel, distinct, emptySatchel, remove as takeFromSatchel } from '../content/satchel';
import { offeredHere } from '../content/crafting';
import { standingLine } from '../content/gathering';
import { rideFrom } from '../content/vehicles';
import { canBoardAt, trackRoute } from '../world/crossing';
import { tileHash } from '../world/rng';
import { conditionOf, noNodes, takeableAt, type Nodes } from '../content/nodes';
import { canonStatus, type CanonStatus, type Place } from './canonClient';
import { isPresent, routineFor } from '../content/routine';
import { creatureFor, floraFor } from '../content/species';
import { type Collection, emptyCollection, metOnTile, size } from '../content/collection';
import { buildTravelLog, travelLogFilename, travelLogToText } from '../content/travelLog';
import { downloadImage, downloadText } from './exportJournal';
import { clearJourney, hasBegun, loadJourney, saveJourney } from '../save';
import { Opening } from './Opening';
import { bearingTo } from '../content/journal';
import { Journey } from './Journey';
import { beatNow, type BeatWhen } from '../content/storylines';
import { CROSSING_MS } from '../content/tiers';
import { coachLine, MORNING_GOAL } from '../content/coach';
import { stagePin } from '../content/goals';
import {
  advance,
  answer,
  hasSomethingNew,
  hear,
  isComplete,
  knowsQuestion,
  knowsRecipe,
  reasonToSpeak,
  receiveAll,
  rungOf,
  type WorldMoment
} from '../journey';
import { DEFAULT_FIELD_MAP } from '../game/scenes/WorldScene';
import { characterFor } from '../game/player';
import type { World } from '../world/types';
import { isAnimal, isWaterSpecies } from '../content/species';
import {
  GESTURE_VERB,
  blockedReason,
  gestureFor,
} from '../content/gestures';
import { shelterBuilt } from '../content/using';
import { ActivityModal } from './ActivityModal';
import { useActivity } from './useActivity';
import { EventCard } from './EventCard';
import { anyConditions, type Choice, type GameEvent, type Occasion } from '../content/events';
import type { SettlingView } from './PlacePanel';
import { happeningNow, surroundingsAt } from '../content/happenings';
import { APPROACHES, approachAt, approachId } from '../content/visitors';
import { peopleAtPlaces, whoIsHere } from '../content/presence';
import { useRoadTalk, type Happens } from './useRoadTalk';
import { type Bumped, whoSpeaksFirst } from '../content/bumping';
import { atCamp, encampmentOn, type Encampment } from '../content/encampments';
import { rumourAt, rumourFor, rumoursOn } from '../content/rumours';
import { standingOn as howKnownOn, warmTo } from '../content/standing';
import { discoveries, offeredAt } from '../content/knowledge';
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
  stagesBuilt,
  stateOf as homesteadState,
  type Holdings
} from '../content/homestead';
import { Negotiation } from './Negotiation';
import type { CampTalk, Talk } from '../content/happenings';
import type { Station } from '../content/stations';

/**
 * How long after walking into a place somebody there may call out. Long enough for the arrival's own
 * beat -- the zoom, an approach, a card -- to have taken the moment if it was going to.
 */
const SPEAK_FIRST_AFTER_MS = 1500;


import { Modal } from './Modal';

/**
 * Which country to open on, for a link that wants to start somewhere other than Lothal.
 *
 * The same kind of hook as `?hour=` and `?at=`, and here for the same reason: looking at the
 * Narmada should not require travelling there first. An unknown id falls back to the default
 * rather than throwing — this is a convenience, and must never break the game for someone who
 * mistypes one.
 */
function fieldMapFromUrl(saved?: string): string {
  const asked = new URLSearchParams(window.location.search).get('map')?.trim();
  if (asked && fieldMap(asked)) return asked;
  // **Then the map the save was on**, so a reload without `?map=` no longer puts a traveller who
  // crossed to the Narmada back on Lothal. The address still wins: a link is a deliberate ask.
  return saved && fieldMap(saved) ? saved : DEFAULT_FIELD_MAP;
}

/**
 * Which surface a records tab opens.
 *
 * One mapping rather than the ternary each strip carried. Three tabs make a chain of conditionals
 * that has to be edited in three places, which is the shape a fourth tab would get wrong -- and
 * the strips had already drifted into two copies of the same expression.
 */
function recordSurface(tab: RecordTab): 'progress' | 'collection' | 'people' {
  return tab === 'collection' ? 'collection' : tab === 'people' ? 'people' : 'progress';
}

/**
 * Who to walk as, for a link that wants somebody other than Varuna.
 *
 * The same hook as `?seed=`, `?map=`, `?at=` and `?hour=`, and here for the same reason: seeing
 * Guyuk should not require playing to her. An unknown id falls back rather than throwing --
 * `characterFor` handles that -- because this is a convenience and must never break the game for
 * somebody who mistypes one.
 */
function characterFromUrl(): string | null {
  const asked = new URLSearchParams(window.location.search).get('as')?.trim();
  // Null when nothing was asked for, so the save can win. Returning a default here instead made
  // the `??` below dead code and quietly pinned every journey to Varuna.
  return asked ? characterFor(asked).key : null;
}

type Arrival = GameToUi['tile-entered'];

export function App() {
  // Read the save once. Calling loadJourney per state initialiser would parse the same JSON
  // three times and, worse, let the three copies drift.
  const initialJourney = useRef(loadJourney(seedFromUrl()));
  /** Where this map's places landed, from the scene's `world-ready`. See `settling`. */
  const fieldPlaced = useRef<{ poiId: string; at: { x: number; y: number } }[]>([]);
  // Every stranger an event has introduced the player to. Up here rather than with the other event
  // refs below, because the action rail reads it while rendering, to call somebody by name.
  const metStrangers = useRef<string[]>(initialJourney.current.met ?? []);
  // Which events have happened, when each last did, and the flags choices have left. Up here with
  // `metStrangers` because the road's talk reads them while rendering -- see `useRoadTalk`.
  const seenEvents = useRef<string[]>(initialJourney.current.seenEvents ?? []);
  /** When each event last happened, and the flags choices have left. See `Journey`. */
  const eventDays = useRef<Record<string, number>>(initialJourney.current.eventDays ?? {});
  const journeyFlags = useRef<string[]>(initialJourney.current.flags ?? []);
  /**
   * Whether a card is open, for the two things that must not open one over it: walking up to a camp,
   * and arriving beside somebody the player called to. Both used to call `setHappening` regardless,
   * and walking up to a camp's watch opened the watch's card and the camp's own in the same step --
   * one silently replacing the other. A ref for the bus handlers, a state for the effect to wait on.
   */
  const cardOpenRef = useRef(false);
  const [cardOpen, setCardOpen] = useState(false);

  const [seed, setSeed] = useState(seedFromUrl);
  // Who is walking. Part of the journey rather than a setting: a save belongs to a traveller, so
  // the URL only decides it when the save has nothing to say.
  const [characterId, setCharacterId] = useState(
    () => characterFromUrl() ?? characterFor(initialJourney.current.characterId).key
  );
  // Who the *scene* reports drawing, as distinct from who was asked for. They agree in practice;
  // keeping them separate is what lets a test tell a working picker from a highlighted button.
  const [drawn, setDrawn] = useState('');
  const [world, setWorld] = useState<World | null>(null);

  // What everybody else on the road is doing, as the scene last reported it. Held rather than
  // asked for, because only the scene can answer it -- `travellers-changed` says why -- and it
  // changes twice a day, so a listener costs less than a poll.
  const [travellerStates, setTravellerStates] = useState<GameToUi['travellers-changed']['travellers']>([]);
  // Who is walking near the traveller, closest first -- the scene's answer, for the action rail.
  const [nearbyTravellers, setNearbyTravellers] = useState<GameToUi['travellers-nearby']['travellers']>([]);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [collection, setCollection] = useState<Collection>(initialJourney.current.collection);
  const [memory, setMemory] = useState('');
  const [arrivalPage, setArrivalPage] = useState<GameToUi['landmark-reached'] | null>(null);
  // Separate from `arrivalPage`, which the player can dismiss. Reaching the landmark is a fact
  // about the journey and belongs in the travel log even after the page is closed.
  const [reached, setReached] = useState(initialJourney.current.reached);

  // What the player knows. Every rule about changing it lives in `journey.ts`; this only holds
  // it and hands it to the save.
  const [progress, setProgress] = useState(initialJourney.current.progress);

  // What the traveller is carrying. Every rule about changing it lives in `content/satchel.ts`
  // and `content/crafting.ts`; this only holds it and hands it to the save, exactly as
  // `progress` does.
  const [satchel, setSatchel] = useState(initialJourney.current.satchel ?? emptySatchel());
  // The recipe pinned in the workshop, kept on screen in the dock -- see `PinnedRecipe`.
  const [pinned, setPinned] = useState<string | null>(initialJourney.current.pinned ?? null);
  /** The recipe the workshop opens at, when the pinned line was tapped. */
  const [workshopAt, setWorkshopAt] = useState<string | null>(null);
  // The crossing being told, while the next map builds behind it. See `Journey.tsx`.
  // While it is, an arrival the new map reports is held rather than shown over the cards, and
  // `stepDown` decides what comes first once the traveller is off the cart.
  const crossing = useRef(false);
  const heldArrival = useRef<string | null>(null);
  const arrivedRef = useRef<((e: { poiId: string }) => void) | null>(null);
  const [journey, setJourney] = useState<{ from: string; to: string; road: Road; first: boolean } | null>(null);
  // The opening, while it plays over the map booting behind it. See `Opening.tsx`.
  const [opening, setOpening] = useState(false);
  // The first morning's hints, on unless the player turned them off. See `content/coach.ts`.
  const [hints, setHints] = useState(() => readShowing().hints ?? true);
  // Where the traveller first stood this session, so the coach knows they have walked.
  const firstAt = useRef<string | null>(null);
  // What the traveller has drawn down. The one piece of world state a save has to hold, because
  // it is the only thing about a tile that cannot be recomputed from the seed.
  // Kept per field map -- see `nodesByMap` in `save.ts` for the bug a single record was.
  const [nodesByMap, setNodesByMap] = useState(initialJourney.current.nodesByMap ?? {});

  /**
   * Whether the front door is still closed.
   *
   * Opens once and never comes back -- there is no way to walk back out to it, because a door
   * you can reopen mid-walk is a menu, and this is the moment before the walk rather than a thing
   * you consult during it.
   *
   * **Two ways past it, and the second is the interesting one.**
   *
   * `?door=open` skips it, on the same principle as `?seed=`, `?at=` and `?hour=`: seeing
   * something should not require playing to it.
   *
   * And it is skipped under browser automation, which `navigator.webdriver` reports and no
   * ordinary browser sets. That is a real seam rather than a hack: **fifty-odd browser tests are
   * about the map and none of them is about this screen**, and making each click through a door
   * first would be ceremony that tests nothing. The specs that *are* about the door ask for it
   * back with `?door=shut`.
   *
   * The first attempt keyed the bypass to `?at=`, on the reasoning that a test with a starting
   * position wants to get on with it. **Ten spec files do not pass `?at=` and every one of them
   * broke** -- which is what a bypass inferred from an unrelated flag earns. A door should be
   * conditional on something that is actually about the door.
   */
  const [atTheDoor, setAtTheDoor] = useState(() => {
    const asked = new URLSearchParams(window.location.search).get('door');
    if (asked === 'open') return false;
    if (asked === 'shut') return true;
    return !navigator.webdriver;
  });

  // The scene owns the clock; this is only where the last reading is kept so the save can hand
  // it back on the next boot. A ref rather than state because nothing renders from it.
  const travelledRef = useRef(initialJourney.current.travelled ?? 0);

  /**
   * The current progress and satchel, readable synchronously.
   *
   * **Only for handlers that fire more than once in a tick.** A conversation now does: leaving a
   * place mid-exchange reports every line still to be said, one call each, and a handler reading
   * `progress` from its closure would hand all of them the same starting state — so only the last
   * would survive and the question somebody was giving you would vanish. React state is not
   * readable between two calls in the same tick; a ref is.
   *
   * Everything else should read the state directly. This is a workaround for a batching rule, not
   * a second copy of the truth, and it is kept in step immediately below.
   */
  const latest = useRef({
    progress: initialJourney.current.progress,
    satchel: initialJourney.current.satchel ?? emptySatchel(),
    /**
     * What the night needs to know, for the same reason the rest of this ref exists.
     *
     * The bus subscription is registered once with an empty dependency list -- re-registering it on
     * every change would drop events in the gap -- so a handler reading `world` or `day` from the
     * closure would read whatever they were at boot. `null` and `0` are the honest starting values
     * and the effect below replaces them on the first commit.
     */
    world: null as World | null,
    fieldMapId: '',
    day: 0,
    /** Where the traveller is standing, for an event that fires from something other than a step. */
    at: null as { x: number; y: number } | null,
    /** The hour and the sky, for a woven event -- rain on the road needs to know it is raining. */
    moment: null as WorldMoment | null,
    /** The authored place being stood in, for the inspector to ask an arrival of. */
    poiId: null as string | null
  });

  // Kept in step after every commit, so anything that changes progress or the satchel by another
  // route -- looking at something, crafting, gathering -- is visible to the next conversation.
  useEffect(() => {
    latest.current.progress = progress;
    latest.current.satchel = satchel;
  }, [progress, satchel]);


  // The three scales. `fieldMapId` is the country under foot; `poiId` is the authored place
  // being stood in, if any; a sub-location opens inside the place panel rather than here,
  // because going deeper into a ruin is not leaving it.
  // Read once, so the scene and React boot on the same map even if the address changes later.
  const bootFieldMap = useRef(fieldMapFromUrl(initialJourney.current.fieldMapId));
  const [fieldMapId, setFieldMapId] = useState(bootFieldMap.current);
  // What this map has had drawn from it. Everything below reads `nodes` as before and never sees
  // another map's; `setNodes` writes back under the map that is under foot.
  const nodes = useMemo(() => nodesByMap[fieldMapId] ?? noNodes(), [nodesByMap, fieldMapId]);
  const setNodes = useCallback(
    (change: (n: Nodes) => Nodes) =>
      setNodesByMap((all) => ({ ...all, [fieldMapId]: change(all[fieldMapId] ?? noNodes()) })),
    [fieldMapId]
  );
  // The same arrangement for what the night handler reads. Separate effect because these change on
  // a different rhythm -- the world once per map, the day once per night -- and bundling them would
  // make the comment above untrue of half its own dependency list.
  useEffect(() => {
    latest.current.world = world;
    latest.current.fieldMapId = fieldMapId;
    latest.current.day = arrival?.day ?? 0;
    latest.current.at = arrival?.at ?? null;
  }, [world, fieldMapId, arrival?.day, arrival?.at]);
  const visited = useRef(new Set<string>());
  /** `maybeHappens`, once the bus effect has made it. Null for the first render only. */
  // The story check, handed out of the effect like `happens`; see `storyNow`.
  const storyRef = useRef<((when: BeatWhen, poiId: string | null) => boolean) | null>(null);
  const happens = useRef<Happens | null>(null);

  /**
   * One value decides what is on screen; the rules are in `surface.ts` and tested under Node.
   *
   * This replaced five independent booleans. They did not merely allow two panels to overlap —
   * they made overlap the *default*, since nothing consulted anything else before opening, and
   * the camera then measured whatever rectangles resulted. Two surfaces cannot collide here
   * because there is one slot to be in.
   *
   * `standingOn` stays a separate fact from whether `here` is open, exactly as it was: knowing
   * where the traveller is and knowing whether they are reading about it are different
   * questions, and conflating them would mean walking off a tile and back to reopen a panel
   * you had dismissed.
   */
  // **Seeded from what the player chose last time, not from the default every boot.**
  // The satchel strip has had an off switch for months and it forgot itself on every visit: the
  // flag lives in the reducer, and the reducer is pure. An option to stop looking at something that
  // comes back whenever the game is opened is not really an option, which is what was reported.
  // `preferences.ts` says why this is not in the save.
  const [ui, dispatch] = useReducer(surfaceReducer, initialSurface, (base) => {
    // Only the ribbon is the reducer's; `hints` is App's own state (see `coach`).
    const { satchelRibbon } = readShowing();
    return satchelRibbon === undefined ? base : { ...base, satchelRibbon };
  });
  const { surface, interrupts, standingOn, placeOpen, satchelRibbon, dockHeight, talkingTo } = ui;
  useEffect(() => {
    latest.current.poiId = standingOn;
  }, [standingOn]);

  // Written when it moves, rather than inside the reducer's case: the reducer is pure and tested
  // under Node, and a `localStorage` write in it would be both a side effect and a browser global
  // in the one file most carefully kept free of them.
  useEffect(() => {
    writeShowing({ satchelRibbon, hints });
  }, [satchelRibbon, hints]);

  // The scene owns the clock and says when it turns. React used to run its own timer off the
  // same formulas, which is two clocks agreeing by luck -- and they would have drifted the
  // moment walking started spending time, which it does.
  const [moment, setMoment] = useState<WorldMoment | null>(null);
  /**
   * Where the day is, for the dial.
   *
   * **Its own state rather than a field on `moment`**, because `WorldMoment` is handed to
   * `journey.ts` and is canon's vocabulary -- five words, no midday. See `sky-changed` in
   * `EventBus.ts`. `null` until the scene has said, which is the first half-second of a journey.
   */
  const [skyPhase, setSkyPhase] = useState<number | null>(null);

  // The fog set changes on every step, which is far too often to keep in React state — it would
  // re-render the whole panel each tile. The scene owns it; this ref only carries it to the save.
  const discovered = useRef<string[]>(initialJourney.current.discovered);

  useEffect(() => {
    const onWorldReady = ({ world: next, places }: GameToUi['world-ready']) => {
      fieldPlaced.current = places ?? [];
      setWorld(next);
    };
    const onTileEntered = (payload: Arrival) => {
      setArrival(payload);
      setMemory('');
      travelledRef.current = payload.travelled;
    };
    const onJourneyChanged = ({ discovered: tiles }: GameToUi['journey-changed']) => {
      discovered.current = tiles;
    };

    const onLandmarkReached = (payload: GameToUi['landmark-reached']) => {
      setArrivalPage(payload);
      setReached(true);
    };

    // Arriving opens the place once; leaving closes it. Both rules now live in the reducer,
    // where they are tested — including the one this handler could not express before: leaving
    // must not close the album or the diary, which are not about the tile being left.
    const onStandingOn = ({ poiId: id }: GameToUi['standing-on']) =>
      dispatch({ type: 'standing-on', poiId: id });
    const onMoment = (next: GameToUi['moment-changed']) => {
      latest.current.moment = next;
      setMoment(next);
    };
    const onSky = (next: GameToUi['sky-changed']) => setSkyPhase(next.phase);
    const onTravellers = (next: GameToUi['travellers-changed']) => setTravellerStates(next.travellers);
    const onNearby = (next: GameToUi['travellers-nearby']) => setNearbyTravellers(next.travellers);
    // Who the scene says it is drawing, which is the only authority on it. The picker sets its
    // own state optimistically; this is what corrects it if the scene ever disagreed.
    const onCharacter = ({ characterId: drawn }: GameToUi['character-changed']) => setDrawn(drawn);

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
      if (!world) return false;
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
        surroundingsAt(world, at, latest.current.fieldMapId, latest.current.moment, roll, extra),
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
    EventBus.onEvent('world-ready', onWorldReady);
    EventBus.onEvent('tile-entered', onTileEntered);
    EventBus.onEvent('journey-changed', onJourneyChanged);
    EventBus.onEvent('landmark-reached', onLandmarkReached);
    EventBus.onEvent('standing-on', onStandingOn);
    EventBus.onEvent('moment-changed', onMoment);
    EventBus.onEvent('sky-changed', onSky);
    EventBus.onEvent('travellers-changed', onTravellers);
    EventBus.onEvent('travellers-nearby', onNearby);
    EventBus.onEvent('character-changed', onCharacter);
    EventBus.onEvent('night-passed', onNight);
    EventBus.onEvent('poi-reached', onArrived);
    EventBus.onEvent('tile-entered', onRoad);
    EventBus.onEvent('tile-entered', onCampSeen);
    return () => {
      EventBus.offEvent('world-ready', onWorldReady);
      EventBus.offEvent('tile-entered', onTileEntered);
      EventBus.offEvent('journey-changed', onJourneyChanged);
      EventBus.offEvent('landmark-reached', onLandmarkReached);
      EventBus.offEvent('standing-on', onStandingOn);
      EventBus.offEvent('moment-changed', onMoment);
      EventBus.offEvent('sky-changed', onSky);
      EventBus.offEvent('travellers-changed', onTravellers);
      EventBus.offEvent('travellers-nearby', onNearby);
      EventBus.offEvent('approached', onApproached);
      EventBus.offEvent('character-changed', onCharacter);
      EventBus.offEvent('night-passed', onNight);
      EventBus.offEvent('poi-reached', onArrived);
      EventBus.offEvent('tile-entered', onRoad);
      EventBus.offEvent('tile-entered', onCampSeen);
    };
  }, []);

  // Persist on a timer rather than on every step: walking writes to localStorage 4-5 times a
  // second otherwise, and the journey is not worth a synchronous write that often.
  useEffect(() => {
    const flush = () =>
      saveJourney(seed, {
        characterId,
        discovered: discovered.current,
        collection,
        reached,
        progress,
        satchel,
        nodesByMap,
        fieldMapId,
        // The scene owns the clock and reports it with each step; this is only where it is kept
        // so the next boot can hand it back. Nought until the first tile is entered.
        travelled: travelledRef.current,
        // Which events have already happened, so a `once` event does not come round again after a
        // reload. Unversioned: absent reads as none, which is true of every journey written before
        // there were events to have.
        seenEvents: seenEvents.current,
        // Strangers you have met, so somebody on the road can know you the second time.
        met: metStrangers.current,
        // When each event last happened, and what earlier choices left behind.
        eventDays: eventDays.current,
        flags: journeyFlags.current,
        pinned: pinned ?? undefined
      });
    const timer = window.setInterval(flush, 3000);
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [seed, collection, reached, progress, satchel, nodesByMap, fieldMapId, pinned]);

  /**
   * What the person being talked to is, if they are also somebody who walks a circuit.
   *
   * **Null for everybody else, and most people are everybody else.** Fourteen of canon's seventeen
   * stand in one place; a card only says where somebody is headed when there is somewhere they are
   * headed. The traveller is matched on `npcId` rather than on name, because road company carry
   * none and two of them could otherwise answer to the same label.
   */
  const travellerTraits = useMemo(() => {
    if (!talkingTo) return null;
    const traveller = travellersOn(fieldMapId).find((t) => t.npcId === talkingTo);
    if (!traveller) return null;
    const reported = travellerStates.find((t) => t.id === traveller.id);
    const traits = travellerAttributes(traveller, reported?.state ?? null);
    return traits.length > 0 ? traits : null;
  }, [talkingTo, fieldMapId, travellerStates]);

  /**
   * Who is at the place being stood in, and where its other people have gone.
   *
   * Asked of `content/presence.ts` rather than read off canon's `found_at`, which lists everybody
   * who ever visits a place as if they were all there at once. Travellers are placed by what the
   * scene last reported, so this moves when they do.
   */
  /**
   * What the player holds that a holder could be answered with, and who on this map could help.
   *
   * Asked of the rules, never worked out here: a discovery is finished when `isComplete` says so,
   * and a person is helped when a finished discovery names them -- the fact the ending reads.
   */
  const holdings = useMemo<Holdings>(() => {
    const finished = discoveries.filter((d) => isComplete(progress, d.id));
    return {
      words: progress.words,
      finished: finished.map((d) => d.id),
      helped: [...new Set(finished.flatMap((d) => d.helps))],
      carried: satchel
    };
  }, [progress, satchel]);
  const peopleOfMap = useMemo(
    () => [
      ...new Set(
        (fieldMap(fieldMapId)?.pointsOfInterest ?? []).flatMap((p) => whoIsHere(p, fieldMapId, 0, []).here.map((n) => n.id))
      )
    ],
    [fieldMapId]
  );

  const presence = useMemo(
    () => (standingOn ? whoIsHere(standingOn, fieldMapId, arrival?.day ?? 0, travellerStates) : null),
    [standingOn, fieldMapId, arrival?.day, travellerStates]
  );

  const currentCreature = useMemo(() => {
    if (!world || !arrival) return null;
    const tile = world.tiles[arrival.at.y]?.[arrival.at.x];
    return tile ? creatureFor(tile, world.seed) : null;
  }, [world, arrival]);

  // Asked once. A canon service is optional and usually absent, so the panel stays hidden
  // rather than offering something that will fail.
  const [canon, setCanon] = useState<CanonStatus>({ lore: false, ask: false });
  useEffect(() => {
    let live = true;
    canonStatus().then((status) => {
      if (live) setCanon(status);
    });
    return () => {
      live = false;
    };
  }, []);

  const place = useMemo<Place | null>(() => {
    if (!world || !arrival) return null;
    const tile = world.tiles[arrival.at.y]?.[arrival.at.x];
    if (!tile) return null;
    return {
      seed: world.seed,
      x: arrival.at.x,
      y: arrival.at.y,
      biome: tile.biome,
      creature: creatureFor(tile, world.seed)?.name ?? null,
      flora: floraFor(tile, world.seed)?.name ?? null,
      landmark: arrival.atLandmark ? world.landmark.name : null
    };
  }, [world, arrival]);

  const generate = useCallback((next: string) => {
    // A new map is a deliberate fresh start, so it must not inherit fog the player already lifted.
    discovered.current = [];
    // The collection is trip-scoped: a new world is a new walk, not a continuing album.
    setCollection(emptyCollection());
    const loaded = loadJourney(next);
    setProgress(loaded.progress);
    // A new world is a new walk. What was in the satchel belonged to the old one.
    setSatchel(loaded.satchel);
    // And what it had drawn down. This was never reloaded either, so a new seed's reed beds stood
    // picked over wherever the old seed's had been.
    setNodesByMap(loaded.nodesByMap);
    setPinned(loaded.pinned ?? null);
    // And so did the events and the people in them. These were never reloaded here, so a new seed
    // inherited the old one's `seen` list and saved it as its own.
    seenEvents.current = loaded.seenEvents ?? [];
    metStrangers.current = loaded.met ?? [];
    eventDays.current = loaded.eventDays ?? {};
    journeyFlags.current = loaded.flags ?? [];
    setMemory('');
    setArrivalPage(null);
    setReached(false);
    setSeed(next);
    const url = new URL(window.location.href);
    url.searchParams.set('seed', next);
    window.history.replaceState(null, '', url);
    EventBus.emitEvent('new-journey', { seed: next });
  }, []);

  /**
   * Walk as somebody else.
   *
   * **No restart.** Every sheet is loaded and every character's animations exist, so the scene
   * swaps a texture and the journey carries on -- the walk, the fog and the satchel all survive
   * changing your mind about who is carrying them. Nothing about the game differs; only the
   * drawing does.
   *
   * The URL is updated too, so the link in the address bar keeps describing what is on screen,
   * exactly as changing the seed does.
   */
  const chooseCharacter = useCallback((next: string) => {
    setCharacterId(next);
    const url = new URL(window.location.href);
    url.searchParams.set('as', next);
    window.history.replaceState(null, '', url);
    EventBus.emitEvent('set-character', { characterId: next });
  }, []);

  /**
   * Whether the animal is actually here, rather than asleep or sheltering somewhere out of it.
   *
   * A sketch needs a subject. Refusing when the creature is not out is the point of the
   * routine system, and the journal says which hour to come back for.
   */
  const creatureIsOut = useMemo(
    () => Boolean(currentCreature) && isPresent(routineFor(currentCreature!, moment)),
    [currentCreature, moment]
  );

  /**
   * Meeting things is a consequence of being somewhere, not of pressing a button.
   *
   * The old "Observe creature" button appended a name to a list that nothing read -- the whole
   * mechanic was that the button then said something else. Standing on a tile with a creature
   * out is the encounter, so that is what gets recorded, and the starting tile seeds the album
   * so it is never empty on arrival.
   *
   * A creature only counts while it is actually out: `routineFor` decides that from the hour,
   * so a nocturnal animal met at noon was not met. The flora is always there to be seen.
   */
  useEffect(() => {
    if (!world || !arrival) return;
    const tile = world.tiles[arrival.at.y]?.[arrival.at.x];
    if (!tile) return;
    setCollection((previous) =>
      metOnTile(previous, {
        creature: creatureIsOut ? currentCreature : null,
        flora: floraFor(tile, world.seed)
      })
    );
  }, [world, arrival, currentCreature, creatureIsOut]);

  /** Look closer at something. The rule for whether that is possible is `journey.ts`'s. */
  const look = useCallback(
    (discoveryId: string) => setProgress((p) => advance(p, discoveryId, moment)),
    [moment]
  );

  /**
   * Listen to someone, and take what the line gives — a word, a question, a lead, a recipe.
   *
   * Both halves of `hear` are applied, and that is why it returns both: a line can cost an
   * item, and a gift the player keeps is worse than one they never gave, because it looks
   * like it worked. `satchel` is in the dependency list rather than read through a ref
   * because paying with a stale one would spend something already spent.
   */
  /**
   * Hear one line, and take what it gives.
   *
   * **Updated from the previous state rather than from the captured one.** A conversation can now
   * report several lines in a single tick — leaving a place mid-exchange records everything that
   * was still to be said — and a handler that read `progress` from its closure gave each of those
   * calls the *same* starting state, so only the last one survived. Thrali would hand over his
   * question and the panel would drop it on the way out.
   *
   * The satchel is updated the same way and for the same reason, though only a line with a price
   * touches it.
   */
  const listen = useCallback((npcId: string, lineIndex: number) => {
    // Both halves come from one `hear`, so the price and what it bought cannot come apart. The
    // refs are what make a run of calls in a single tick each see the one before it: a state
    // setter's argument is not readable until React re-renders, and by then the rest of the
    // exchange has already been reported.
    const heard = hear(latest.current.progress, npcId, lineIndex, latest.current.satchel);
    latest.current.progress = heard.progress;
    setProgress(heard.progress);
    if (heard.paid) {
      latest.current.satchel = heard.satchel;
      setSatchel(heard.satchel);
    }
  }, []);

  /**
   * Where the traveller stands, as far as making is concerned.
   *
   * A sited process -- firing, tanning, brewing -- wants a kind of place, and canon states the
   * kind on the point of interest. Off an authored place this is null, which `crafting.ts`
   * reads as open ground.
   */
  const bench = useMemo(
    () => ({ kind: standingOn ? poi(standingOn)?.kind ?? null : null }),
    [standingOn]
  );

  /** The tile under foot, for gathering. Null before the world has been built. */
  const underfoot = useMemo(() => {
    if (!world || !arrival) return null;
    const tile = world.tiles[arrival.at.y]?.[arrival.at.x];
    return tile ? { at: arrival.at, biome: tile.biome, seed: world.seed } : null;
  }, [world, arrival]);

  /**
   * What this ground still has to give, in the present tense.
   *
   * **Hoisted out of `tileActions` so the notes and the rail read one array.** The rail turns it
   * into a sentence (`standingLine`) and the standing row turns it into a chip apiece; computing
   * it twice would let the two disagree about what is on a tile, which is the exact shape of the
   * bug that once had the journal describing a crane while the sketch recorded an otter.
   */
  const standing = useMemo(
    () =>
      underfoot
        ? takeableAt(nodes, underfoot.seed, underfoot.at, underfoot.biome, arrival?.day ?? 0)
        : [],
    [underfoot, nodes, arrival?.day]
  );

  /** What the last bench job made, step by step, for the workshop to show. */
  const [lastMade, setLastMade] = useState<Step[]>([]);

  // Taking, making, a night and using what is carried, and the card each opens: `useActivity.ts`.
  const { activity, card: activityCard, pickUp, startRest, makeHere, useCarried } = useActivity({
    underfoot,
    day: arrival?.day ?? 0,
    fatigued: Boolean(arrival?.fatigue),
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
  });

  /**
   * Tell the scene what is pitched, whenever the satchel changes.
   *
   * A push rather than a pull: `night.shelterAt` ranks where you are standing and a tent is the
   * one input to it that is a fact about what you are carrying. The payload is the whole state, so
   * a stale value cannot survive a change -- see the event's own note in `EventBus.ts`.
   */
  useEffect(() => {
    EventBus.emitEvent('shelter-built', { built: shelterBuilt(satchel) });
  }, [satchel]);

  /**
   * Tell the scene who is at each place, for the pips at their doors.
   *
   * Pushed from here because whether somebody has something new to say is a question about the
   * diary, and the diary is React's. `world` is in the list so the first answer goes out once the
   * scene is listening, and again after every map change.
   */
  useEffect(() => {
    if (!world) return;
    EventBus.emitEvent('people-at-places', {
      places: peopleAtPlaces(fieldMapId, arrival?.day ?? 0, travellerStates, (id) =>
        hasSomethingNew(progress, id)
      )
    });
  }, [world, fieldMapId, arrival?.day, travellerStates, progress]);

  /**
   * Everything that can be done on the tile under foot, in one list.
   *
   * Assembled here because this is the only place that already holds all three answers -- what
   * the ground offers, how tired the traveller is, and what the hour is doing. The panel renders
   * the list and decides nothing.
   *
   * **A blocked action keeps its row and states its reason.** That is the genre convention and
   * it is load-bearing rather than polite: a row reading "nothing here to take" teaches that
   * ground can hold things, where a vanished row teaches nothing at all. It is also the shape
   * the workshop will need in phase two, where the reason is "needs a settlement".
   */
  /**
   * What a stranger the player walked up to makes of them, for small talk.
   *
   * Asked of the rules rather than worked out here: how the map knows you is `standingOn`, whether
   * their people care is `warmTo`, and what they have heard is `rumoursOn`, picked by a seeded roll
   * on the tile and the day. A place counts as reached once visited this session or once anything
   * there has been looked at.
   */
  const talkFor = useCallback(
    (travellerId: string, at: { x: number; y: number }): Talk => {
      const facts = { finished: (id: string) => isComplete(progress, id), met: metStrangers.current };
      const { standing: known } = howKnownOn(fieldMapId, facts);
      const traveller = travellersOn(fieldMapId).find((t) => t.id === travellerId);
      const day = arrival?.day ?? 0;
      const places = fieldMap(fieldMapId)?.pointsOfInterest ?? [];
      const rumours = rumoursOn(fieldMapId, {
        reached: (poiId) =>
          visited.current.has(poiId) ||
          offeredAt(poiId, poi(poiId)?.discoveries ?? []).some((d) => rungOf(progress, d) >= 0),
        knowsQuestion: (id) => knowsQuestion(progress, id),
        hasNews: (npcId) => hasSomethingNew(progress, npcId),
        whereIs: (npcId) =>
          places.find((p) => whoIsHere(p, fieldMapId, day, travellerStates).here.some((n) => n.id === npcId)) ??
          null,
        flags: journeyFlags.current,
        camp: world ? encampmentOn(world, fieldMapId, fieldPlaced.current, day) : null
      });
      const seed = world?.seed ?? '';
      return {
        standing: known,
        warm: warmTo(traveller?.culture ?? null, known, facts),
        rumour: rumourFor(rumours, (salt) => tileHash(seed, at.x, at.y, `${salt}:${day}:${travellerId}`))
      };
    },
    [progress, fieldMapId, arrival?.day, travellerStates, world]
  );

  /**
   * Somebody speaking first, when the player bumps into them.
   *
   * The owner's brief: named people especially, and especially on a first meeting or when they want
   * something. Who has a reason is `reasonToSpeak`; who actually speaks, on a seeded chance and at
   * most once a day each, is `whoSpeaksFirst`. Never while anything else is on screen: a card, a
   * conversation, an activity or a dialog already has the moment.
   *
   * Kept in a ref and rebuilt each render, because the place check runs on a timer and must read
   * the state as it is when the timer fires, not as it was when it was set.
   */
  const spokenFirst = useRef(new Set<string>());
  /**
   * Whether anybody may speak first at all. **Off under browser automation, by the same reasoning
   * as the front door**: fifty-odd browser tests walk into places and choose somebody from the list,
   * and a person calling out a moment later would race every one of them. `?chatter=on` asks for it
   * back, and `e2e/speaks-first.spec.ts` does.
   */
  const [chatter] = useState(() => {
    const asked = new URLSearchParams(window.location.search).get('chatter');
    if (asked === 'on') return true;
    if (asked === 'off') return false;
    return !navigator.webdriver;
  });
  const speakFirst = useRef<(near: readonly Bumped[]) => void>(() => {});
  speakFirst.current = (near) => {
    if (!chatter || !world || !arrival || happening || ui.talkingTo || activity || atTheDoor) return;
    if (Object.values(interrupts).some(Boolean)) return;
    const day = arrival.day;
    const who = whoSpeaksFirst(
      near,
      day,
      spokenFirst.current,
      (salt) => (tileHash(world.seed, 0, 0, salt) % 10_000) / 10_000
    );
    if (!who) return;
    spokenFirst.current.add(`${who.key}@${day}`);
    if (who.npcId) {
      if (who.reason === 'first') journeyFlags.current = [...journeyFlags.current, `spoke:${who.npcId}`];
      dispatch({ type: 'talk-to', npcId: who.npcId });
      return;
    }
    if (!who.travellerId) return;
    // A camp's leader calling you over opens what pressing their row would: the camp's welcome.
    if (campFolk.some((p) => p.id === who.travellerId)) {
      talkWith.current(who.travellerId, null);
      return;
    }
    const met = metStrangers.current.includes(who.key);
    happens.current?.('road', arrival.at, null, `spoke-first:${day}:${who.travellerId}`, {
      strangerId: who.travellerId,
      talk: met ? talkFor(who.travellerId, arrival.at) : null,
      force: { kind: met ? 'small-talk' : 'company', asked: true }
    });
  };

  /** Who has a reason to speak first, of the named people given. */
  const bumpedNamed = useCallback(
    (npcIds: readonly string[], travellerOf: (npcId: string) => string | null): Bumped[] =>
      npcIds.flatMap((npcId) => {
        const reason = reasonToSpeak(progress, npcId, satchel, journeyFlags.current.includes(`spoke:${npcId}`));
        return reason ? [{ key: npcId, npcId, travellerId: travellerOf(npcId), reason }] : [];
      }),
    [progress, satchel]
  );

  // Who the talk row is about, calling out to them, the camp's people, and who speaks first on the
  // road: all of it is `useRoadTalk`, which names what it needs from here.
  const { talk, campFolk, talkWith, callTo } = useRoadTalk({
    nearbyTravellers,
    world,
    arrival,
    fieldMapId,
    fieldPlaced,
    metStrangers,
    seenEvents,
    happens,
    dispatch,
    talkFor,
    cardOpen,
    cardOpenRef,
    bumpedNamed,
    speakFirst
  });

  // In a place: whoever is here, a moment after walking in, once the arrival has had its turn --
  // the princess walking up, a rumour kept, a card. The timer reads the state it finds then.
  useEffect(() => {
    if (!standingOn || !presence || presence.here.length === 0) return;
    const named = bumpedNamed(
      presence.here.map((n) => n.id),
      () => null
    );
    if (named.length === 0) return;
    const timer = window.setTimeout(() => speakFirst.current(named), SPEAK_FIRST_AFTER_MS);
    return () => window.clearTimeout(timer);
    // Only on walking in: a change of who is here while you stand there is not bumping into them.
  }, [standingOn]);

  const tileActions = useMemo<TileAction[]>(() => {
    // What is left here and how much of it comes up, so the row can say both *before* the
    // player commits. The whole design rests on this being visible rather than rolled: a stand
    // somebody has been cutting reads as worked ground, and a good cut reads as two.
    const today = arrival?.day ?? 0;
    const left = standing;
    const takeable = underfoot
      ? standingLine(left, (m) =>
          conditionOf(nodes, underfoot.seed, underfoot.at, m, today) === 'picked-over'
        )
      : null;
    const shelter = arrival?.shelter ?? 'bedroll';

    // **The row says which gesture it is before you press it.** "Follow it" and "Cut and gather"
    // are different promises, and a player who cannot tell which one a tile is offering is back
    // in the position this whole layer exists to fix. The gesture comes from the first material
    // on offer, which is the one the modal will be about.
    const first = left[0]?.material ?? null;
    const gesture = first ? gestureFor(first, isAnimal, isWaterSpecies) : null;
    const routine = currentCreature ? routineFor(currentCreature, moment) : null;
    // A stalk is refused when the animal is only sign. `blockedReason` writes the sentence,
    // because the reason is the teaching -- it sends the player back at a better hour.
    const cannotStalk =
      gesture && first
        ? blockedReason(gesture, routine, currentCreature?.name ?? null)
        : null;

    // **Asked of the rule, never recomputed here.** `rideFrom` decides whether there is a line,
    // where it goes and which carriage runs it; this reads the answer and writes a sentence about
    // it. A panel that worked out the far station itself would be a second copy of `railSpan`.
    const ride = world && arrival ? rideFrom(world, arrival.at) : null;
    // Why the row is *there* when it is refused, which is this panel's convention: a line you are
    // standing on but cannot board from teaches that the carriage calls at the islands.
    const onTheLine = Boolean(
      world && arrival && world.tiles[arrival.at.y]?.[arrival.at.x]?.track
    );
    const lineOnThisMap = Boolean(world && trackRoute(world).length > 0);
    const atTheFarEnd = Boolean(
      world && arrival && !ride && canBoardAt(world, arrival.at)
    );

    // Somebody on the road near enough to see: `talk`, above. The row only exists while somebody is
    // in view, and comes last so a chip that wraps on a small screen is this one rather than one of
    // the steady three.

    return [
      {
        id: 'take',
        label: gesture ? GESTURE_VERB[gesture] : 'Take what is here',
        detail: takeable ?? undefined,
        mark: gesture === 'stalk' ? '🐾' : gesture === 'work' ? '⛏' : '❀',
        blocked: takeable ? cannotStalk : 'Nothing on this ground to take.',
        key: 'E',
        onDo: pickUp
      },
      // **The talk row stands in the rest row's place while resting is refused for the daylight.**
      // People walk only by day, and by day this row can only ever say "there is daylight left" --
      // both rows are about what the hour is for. Measured on a 360-pixel phone with a busy tile,
      // the rail has room for two chips, and a fourth row ran off the bottom of the screen.
      ...(talk && !arrival?.canCamp
        ? []
        : [
      {
        id: 'rest',
        label: SHELTER_LABEL[shelter] ?? 'Stop for the night',
        detail: arrival?.fatigue ?? undefined,
        mark: <ShelterMark shelter={shelter} />,
        // `canCamp` is the rules layer's answer, not this panel's guess -- resting is refused
        // in daylight because a night passed at noon is not a night.
        blocked: arrival?.canCamp ? null : 'Not yet -- there is daylight left.',
        key: 'R',
        // Through the same modal as everything else. Nothing is won and nothing can go wrong, so
        // it settles on its own -- but it is the same shape of act, and the night should look like
        // one rather than happening between two frames.
        onDo: () => startRest(shelter)
      } satisfies TileAction
          ]),
      // The line is one map's furniture, so the row only exists where there is a line. Every other
      // row here is about ground that exists everywhere; this one would be a permanent "there is no
      // railway" on three maps out of four, which teaches nothing.
      ...(lineOnThisMap
        ? [
            {
              id: 'ride',
              label: ride ? `Ride the ${ride.vehicle.name.toLowerCase()}` : 'Ride the line',
              detail: ride
                ? `${ride.tiles} tiles of rail, at a quarter of the walking.`
                : undefined,
              mark: '🚋',
              blocked: ride
                ? null
                : atTheFarEnd
                  ? 'You are at the far station. The line runs the other way.'
                  : onTheLine
                    ? 'Out on the span. The carriage calls at the islands.'
                    : 'Not on the line.',
              key: 'B',
              onDo: () => {
                if (ride) EventBus.emitEvent('ride', { to: ride.to });
              }
            } satisfies TileAction
          ]
        : []),
      ...(talk
        ? [
            {
              id: 'talk',
              label: talk.label,
              detail: talk.detail ?? undefined,
              mark: talk.npcId || talk.atCamp ? '💬' : '👣',
              // Never greyed: anybody in view can be called to, and they wait while you walk up.
              blocked: null,
              key: 'T',
              onDo: () => callTo.current(talk.travellerId)
            } satisfies TileAction
          ]
        : [])
    ];
  }, [
    underfoot,
    arrival,
    nodes,
    standing,
    pickUp,
    currentCreature,
    moment,
    world,
    talk
  ]);

  /**
   * A key for each thing you can do here.
   *
   * **Driven off `tileActions` rather than beside it**, so a key and a tap can never come to mean
   * different things -- including the blocked case: a hotkey for an action whose row says "there is
   * daylight left" does nothing, exactly as pressing the greyed row does. A second list of what the
   * keys do would be a second copy of the rules, and this codebase has paid for that kind of copy
   * before.
   *
   * E and R, because W A S D are the walk and the arrows are captured for it. They are also the
   * genre's own keys -- E interacts nearly everywhere -- and this game has no other letter bound.
   *
   * `typing()` in `WorldScene` guards the walk the same way and states the reason: searching the
   * album for a plant with an "a" in it used to walk the traveller across the map. A hotkey on the
   * document has exactly that hazard, so the check is repeated here rather than assumed.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      // A modal is open: it owns the keyboard, and Space is its own. Acting on the map underneath
      // something the player is reading is how a stray press loses a run.
      if (activity) return;

      const wanted =
        e.code === 'KeyE'
          ? 'take'
          : e.code === 'KeyR'
            ? 'rest'
            : e.code === 'KeyB'
              ? 'ride'
              : e.code === 'KeyT'
                ? 'talk'
                : null;
      if (!wanted) return;
      const action = tileActions.find((a) => a.id === wanted);
      if (!action || action.blocked) return;
      e.preventDefault();
      action.onDo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tileActions, activity]);

  /**
   * Whether the player has been shown how to make something.
   *
   * Composed here rather than inside the panel or inside `crafting.ts`: knowing is a fact
   * about the journey, making is a fact about the satchel, and this is the one place that
   * holds both. Memoised on `progress.recipes` rather than on `progress`, because the panel
   * re-filters 72 recipes with it and every step of the walk changes `progress`.
   */
  const knowsRecipeHere = useCallback(
    (recipeId: string) => knowsRecipe(progress, recipeId),
    [progress.recipes]
  );

  /**
   * Make a thing, and remember having made it.
   *
   * `journey.craft` returns both halves for the same reason `hear` does: the satchel loses the
   * object the moment it is given away, and the keepsake at the end is built from what was
   * made rather than from what is still carried.
   */
  /**
   * The rungs of the last thing made, for the workshop to print.
   *
   * Held here rather than in the panel because the panel is not the thing that made it -- and a
   * log that lived in the panel would vanish the moment it closed, which is exactly when a player
   * wants to reread what just happened.
   */

  /**
   * The bench the workshop was opened at, or null for the whole thing.
   *
   * Set by the place's station board and cleared when the workshop closes, so walking up to a kiln
   * and pressing it opens the kiln rather than eighty-three recipes. A filter and never a gate --
   * `crafting.canMake` still decides what can actually be made.
   */
  const [atStation, setAtStation] = useState<Station | null>(null);

  /** The last day a road event was asked about, so the question is one a day and not one a step. */
  const lastRoadDay = useRef(-1);

  /**
   * The event the player is in the middle of, if any, every one they have already had, and every
   * stranger an event has introduced them to.
   *
   * Held in refs because the bus handlers read them, and written to the save with the rest of
   * the journey -- both in the what-you-know half, so they survive the ground moving.
   */
  /**
   * Settling: which ground is being talked about, and a tick that moves whenever the homestead's
   * flags do, so everything reading them renders again. The flags themselves live in
   * `journeyFlags` with the rest of the journey's, and are saved with it.
   */
  const [negotiatingAt, setNegotiatingAt] = useState<string | null>(null);
  const [homeTick, setHomeTick] = useState(0);
  const setHomeFlags = useCallback((next: string[]) => {
    journeyFlags.current = next;
    setHomeTick((n) => n + 1);
  }, []);

  const [happening, setHappening] = useState<{ event: GameEvent; shelter: string | null } | null>(
    null
  );
  useEffect(() => {
    cardOpenRef.current = happening !== null;
    setCardOpen(happening !== null);
  }, [happening]);
  // Who is walking: Varuna and Mithra, and whoever has joined since. Read from the flags each render,
  // because a joining is a flag a story card's choice sets. See `walkers` in characters.ts.
  const roster = walkers(journeyFlags.current);

  /**
   * **The morning a camp pitches, the notes say so.** "Smoke to the north-east this morning, out past
   * the Eastern Field." One line, once per camp, where every other outcome in this game is told --
   * never a pop-up, and never a claim that something was generated. The smoke itself is on the map.
   */
  useEffect(() => {
    if (!world || !arrival) return;
    const camp = encampmentOn(world, fieldMapId, fieldPlaced.current, arrival.day);
    if (!camp || camp.from !== arrival.day) return;
    const flag = `smoke:${camp.id}`;
    if (journeyFlags.current.includes(flag)) return;
    journeyFlags.current = [...journeyFlags.current, flag];
    const near = camp.near ? poi(camp.near)?.name.replace(/^The /, 'the ') : null;
    setMemory(`Smoke to the ${bearingTo(arrival.at, camp.at)} this morning${near ? `, out past ${near}` : ''}, where nobody lives.`);
    // Once a day is enough to ask: the camp pitches at a day's turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrival?.day, world, fieldMapId]);

  /**
   * The homestead as the place you stand in sees it: what it says, and the one thing to do next.
   *
   * **In the place panel, not the action rail**, because it is about this place and the rail holds
   * two chips on a small phone. Every refusal is a sentence, as the rail's are: why a holder will
   * not hear you yet, what a stage is short of. Asked of `content/homestead.ts` throughout.
   */
  /**
   * This map's road to settling, for the diary's lead section and the one "next" line in the notes.
   * Read off the save like the place panel's view below; see `content/settlingRoad.ts`.
   */
  const road = useMemo(() => {
    void homeTick;
    const facts = { finished: (id: string) => isComplete(progress, id), met: metStrangers.current };
    return settlingRoad(fieldMapId, homesteadOn(fieldMapId), {
      standing: howKnownOn(fieldMapId, facts),
      state: homesteadState(fieldMapId, journeyFlags.current),
      helpedHere: peopleOfMap.filter((id) => holdings.helped.includes(id)).length,
      carried: satchel
    });
  }, [homeTick, progress, fieldMapId, peopleOfMap, holdings, satchel]);

  /**
   * The first morning's one line, or null: after the opening, until the knife is made. Read off the
   * save each time, like everything the coach knows; see `content/coach.ts`.
   */
  const coach = useMemo(() => {
    if (!hints || !journeyFlags.current.includes('coach:on') || journeyFlags.current.includes('coach:done')) return null;
    const here = arrival ? `${arrival.at.x},${arrival.at.y}` : null;
    if (here && firstAt.current === null) firstAt.current = here;
    return coachLine({
      moved: here !== null && firstAt.current !== null && here !== firstAt.current,
      knows: (id) => progress.recipes.includes(id),
      made: (id) => progress.made.includes(id),
      carried: (id) => satchel[id] ?? 0
    });
  }, [hints, arrival, progress, satchel, opening]);

  // The morning is over when the knife is made: the coach stands down and Uma's mat is pinned, so
  // the dock carries on where the hints stop.
  useEffect(() => {
    if (coach !== null || !journeyFlags.current.includes('coach:on') || journeyFlags.current.includes('coach:done')) return;
    if (!progress.made.includes('recipe_flint_knife')) return;
    journeyFlags.current = [...journeyFlags.current, 'coach:done'];
    setPinned((p) => p ?? MORNING_GOAL);
  }, [coach, progress]);

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
            setSatchel((bag) => done.spends.reduce((b, need) => takeFromSatchel(b, need.id, need.count), bag));
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

  // Tell the scene what stands, whenever it changes and whenever a map is drawn.
  useEffect(() => {
    void homeTick;
    if (!world) return;
    const homestead = homesteadOn(fieldMapId);
    const state = homesteadState(fieldMapId, journeyFlags.current);
    const ground = homestead?.grounds.find((g) => g.id === state.ground) ?? null;
    const standing = homestead && ground && groundAgreed(ground, state);
    EventBus.emitEvent('homestead-changed', {
      poiId: standing ? ground!.at : null,
      stage: standing ? stagesBuilt(homestead!, state) : 0
    });
  }, [world, fieldMapId, homeTick]);

  /** Settle a question. The player may be wrong, and nothing here tells them so. */
  const settle = useCallback(
    (questionId: string, index: number) => setProgress((p) => answer(p, questionId, index)),
    []
  );

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

  const travelLog = useMemo(() => {
    if (!world) return null;
    return buildTravelLog(
      world,
      { discovered: arrival?.discovered ?? 0, collection, reachedLandmark: reached, progress },
      `${window.location.origin}${window.location.pathname}`
    );
  }, [world, arrival?.discovered, collection, reached, progress]);

  // Tell the scene how much of the canvas the overlays are covering, so the camera can keep the
  // traveller somewhere they can be seen. React is the only side that knows this — it renders them.
  //
  // Measured rather than derived: the CSS already decides where the panels go, and re-implementing
  // those breakpoints here would be a second copy of the rules waiting to disagree with the first.
  // Only the field notes float over the map now. The travel log used to as well, in two
  // different shapes -- a side panel in landscape, a bottom sheet in portrait -- and telling
  // those apart by measuring its width, then deciding which edge it covered, was most of what
  // this effect did. Retiring the panel retires the arithmetic with it.
  // **The dock is what covers the bottom now, not the notes.** Measuring `.journal` was right when
  // it was the only thing down there; it is one of two occupants of a slot today, so standing in a
  // place would have reported nothing covering the map and let the camera centre the traveller
  // underneath the panel they were reading.
  const hasNotes = Boolean(arrival) && surface === 'here';
  useEffect(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return;

    const report = () => {
      const bounds = stage.getBoundingClientRect();
      const notes = document.querySelector('.dock')?.getBoundingClientRect();

      EventBus.emitEvent('viewport-insets', {
        right: 0,
        bottom: notes ? Math.round(bounds.bottom - notes.top) : 0
      });
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(stage);
    for (const panel of document.querySelectorAll('.dock')) observer.observe(panel);
    window.addEventListener('orientationchange', report);

    // And again once the scene exists. Phaser boots asynchronously, so the first report can go out
    // before `WorldScene.create` has subscribed — the message is sent, nobody is listening, and the
    // camera spends the session behaving as though nothing were covering it.
    EventBus.onEvent('world-ready', report);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', report);
      EventBus.offEvent('world-ready', report);
    };
    // Re-run when the notes appear or disappear, so the observer watches the current set.
  }, [hasNotes]);

  const exportText = useCallback(() => {
    if (!travelLog || !world) return;
    downloadText(travelLogToText(travelLog), travelLogFilename(world, 'md'));
  }, [travelLog, world]);

  const exportImage = useCallback(() => {
    if (!travelLog || !world) return;
    void downloadImage(travelLog, travelLogFilename(world, 'png'));
  }, [travelLog, world]);

  return (
    // The stage is the viewport. The canvas fills it and everything else floats on top, which is
    // why nothing here scrolls and there is no page chrome left to scroll past.
    // `data-traveller` is who the *scene* says it is drawing, not who was asked for. It is a
    // readout rather than a control, and it exists because a browser test otherwise cannot tell a
    // working picker from a highlighted button -- see `e2e/travellers.spec.ts`.
    <div className="stage" data-traveller={drawn}>
      {/* The scene mounts only once the door is open. Booting it behind the door and hiding it
          would spend a second of loading nobody asked for, and would make "start a new walk" a
          restart of something already running rather than a beginning. */}
      {!atTheDoor && (
        <PhaserGame
          seed={seed}
          discovered={initialJourney.current.discovered}
          travelled={initialJourney.current.travelled}
          fieldMapId={bootFieldMap.current}
          characterId={characterId}
        />
      )}

      {journey && fieldMap(journey.from) && fieldMap(journey.to) && (
        <Journey
          from={fieldMap(journey.from)!}
          to={fieldMap(journey.to)!}
          road={journey.road}
          first={journey.first}
          roll={(salt) => tileHash(seed, 0, 0, `${journey.road.art}:${salt}`)}
          onDone={stepDown}
        />
      )}

      {opening && fieldMap(fieldMapId)?.prologue && (
        <Opening prologue={fieldMap(fieldMapId)!.prologue!} onDone={() => setOpening(false)} />
      )}

      <FrontDoor
        open={atTheDoor}
        canContinue={hasBegun(initialJourney.current)}
        seed={seed}
        characterId={characterId}
        roster={roster}
        onChoose={chooseCharacter}
        onContinue={() => setAtTheDoor(false)}
        onBegin={() => {
          // **Starting over clears the save first.** `generate` reloads whatever the seed has
          // stored, so on a seed already walked "start a new walk" kept the old progress, satchel
          // and flags -- the opposite of what the door's second press promises.
          clearJourney(seed);
          generate(seed);
          // A new walk starts where the address asks, else on the opening map -- never on the map
          // the old walk ended on.
          const map = fieldMapFromUrl();
          bootFieldMap.current = map;
          setFieldMapId(map);
          const prologue = fieldMap(map)?.prologue ?? null;
          if (prologue) {
            // **Among the people, not on a tile the generator picked**: the opening ends at the
            // kilns, so the walk begins there. Written as `?at=`, which the scene reads as it boots.
            const url = new URL(window.location.href);
            const start = arrivalPoint(map);
            if (start && !url.searchParams.has('at')) url.searchParams.set('at', start);
            window.history.replaceState(null, '', url);
            journeyFlags.current = ['opening:seen', 'coach:on'];
            if (url.searchParams.get('opening') !== 'skip') setOpening(true);
          }
          setAtTheDoor(false);
        }}
      />

      {/* The bar and the satchel strip stack together in the top-left. The strip is always on
          screen because every other decision is read against it -- see the note at the top of
          `SatchelStrip` -- and it flows under the bar rather than sitting at a fixed offset,
          because the bar wraps to two rows on a narrow phone. */}
      <div className="controls-stack">
      <Controls
        seed={seed}
        onGenerate={generate}
        characterId={characterId}
        onCharacter={chooseCharacter}
        metCount={size(collection)}
        diaryCount={diaryCount(progress)}
        recordsOpen={surface === 'progress' || surface === 'collection'}
        // Opens on the journey, which is the one a player is more often coming back to -- the
        // album is browsed and the diary is worked. Toggling closes whichever is showing.
        onOpenRecords={() =>
          dispatch({
            type: 'toggle',
            surface: surface === 'collection' ? 'collection' : 'progress'
          })
        }
        carryCount={distinct(satchel)}
        offeredHere={offeredHere(bench, knowsRecipeHere).length}
        onOpenWorkshop={() => dispatch({ type: 'open-interrupt', which: 'workshop' })}
        onOpenOverworld={() =>
          dispatch({
            type: interrupts.overworld ? 'close-interrupt' : 'open-interrupt',
            which: 'overworld'
          })
        }
        notesOpen={surface === 'here'}
        onToggleNotes={() => dispatch({ type: 'toggle', surface: 'here' })}
        satchelRibbon={satchelRibbon}
        onToggleSatchelRibbon={() => dispatch({ type: 'toggle-satchel-ribbon' })}
        hints={hints}
        onToggleHints={() => setHints((h) => !h)}
        roster={roster}
        placeName={standingOn ? poi(standingOn)?.name ?? null : null}
        placeOpen={placeOpen}
        onTogglePlace={() => dispatch({ type: 'toggle-place' })}
      />
        {satchelRibbon && (
          <SatchelStrip
            satchel={satchel}
            onOpen={() => dispatch({ type: 'open-interrupt', which: 'satchel' })}
            onHide={() => dispatch({ type: 'toggle-satchel-ribbon' })}
          />
        )}
      </div>

      {/* One door, three tabs. The panels are unchanged -- each keeps its own escape handling and
          focus behaviour, because they were right before this and consolidating surfaces is not a
          licence to rewrite them. The strip renders into each panel's own `tabs` slot rather than
          floating over it: both draw a full-screen veil, so anything positioned above the page
          sits underneath them. */}
      <Progress
        tabs={
          <RecordTabs
            tab="journey"
            onTab={(tab: RecordTab) => dispatch({ type: 'show', surface: recordSurface(tab) })}
            journeyCount={diaryCount(progress)}
            metCount={size(collection)}
            peopleCount={met(progress).length}
          />
        }
        lead={<SettlingSection road={road} />}
        progress={progress}
        moment={moment}
        open={surface === 'progress'}
        onClose={() => dispatch({ type: 'close' })}
        onAnswer={settle}
        onOpenEnding={() => dispatch({ type: 'open-interrupt', which: 'ending' })}
        onOpenKit={() => dispatch({ type: 'open-interrupt', which: 'kit' })}
        replayUrl={travelLog?.replayUrl ?? null}
        onExportImage={exportImage}
        onExportText={exportText}
      />

      <CollectionPanel
        tabs={
          <RecordTabs
            tab="collection"
            onTab={(tab: RecordTab) => dispatch({ type: 'show', surface: recordSurface(tab) })}
            journeyCount={diaryCount(progress)}
            metCount={size(collection)}
            peopleCount={met(progress).length}
          />
        }
        collection={collection}
        open={surface === 'collection'}
        onClose={() => dispatch({ type: 'close' })}
        canAsk={canon.lore}
      />

      <PeoplePanel
        tabs={
          <RecordTabs
            tab="people"
            onTab={(tab: RecordTab) => dispatch({ type: 'show', surface: recordSurface(tab) })}
            journeyCount={diaryCount(progress)}
            metCount={size(collection)}
            peopleCount={met(progress).length}
          />
        }
        progress={progress}
        strangers={metStrangers.current}
        open={surface === 'people'}
        onClose={() => dispatch({ type: 'close' })}
      />

      <FieldKit
        progress={progress}
        open={interrupts.kit}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'kit' })}
        canResearch={canon.lore}
      />

      <SatchelPanel
        satchel={satchel}
        onUse={useCarried}
        open={interrupts.satchel}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'satchel' })}
      />

      <WorkshopPanel
        satchel={satchel}
        bench={bench}
        knows={knowsRecipeHere}
        onMake={makeHere}
        lastMade={lastMade}
        station={atStation}
        fieldMapId={fieldMapId}
        pinned={pinned}
        onPin={setPinned}
        focus={workshopAt}
        flags={journeyFlags.current}
        open={interrupts.workshop}
        onClose={() => {
          setAtStation(null);
          setWorkshopAt(null);
          dispatch({ type: 'close-interrupt', which: 'workshop' });
        }}
      />

      {(() => {
        // The negotiation at a ground, mounted only while it is open. `key` so a new ground starts
        // a new conversation rather than carrying the last one's words.
        const here = negotiatingAt ? homesteadOn(fieldMapId) : null;
        const ground = here?.grounds.find((g) => g.id === negotiatingAt) ?? null;
        if (!here || !ground) return null;
        return (
          <Negotiation
            key={ground.id}
            open
            homestead={here}
            ground={ground}
            flags={journeyFlags.current}
            holdings={holdings}
            peopleHere={peopleOfMap}
            onFlags={setHomeFlags}
            onClose={() => setNegotiatingAt(null)}
          />
        );
      })()}

      <Ending
        progress={progress}
        settlement={(() => {
          void homeTick;
          const homestead = homesteadOn(fieldMapId);
          if (!homestead || !homesteadState(fieldMapId, journeyFlags.current).settled) return null;
          return { name: homestead.name, prose: homestead.settled, people: peopleOfMap, fieldMapId };
        })()}
        open={interrupts.ending}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'ending' })}
      />

      {/* The activity, while one is running: `useActivity` hands over everything the card needs. */}
      {activityCard && <ActivityModal {...activityCard} />}

      {/* Something that happened to you, as opposed to something you did. There are no events
          authored yet, so this never mounts -- the path is live so the first one needs no wiring.
          It sits beside the activity card because it *is* the activity card's furniture; see
          `EventCard.tsx` for why that reuse is the point rather than a shortcut. */}
      {happening && (
        <EventCard
          event={happening.event}
          shelter={happening.shelter}
          met={metStrangers.current}
          holds={[...progress.words, ...Object.keys(progress.rungs), ...progress.recipes]}
          onChoose={(choice: Choice) => {
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
          }}
          onClose={() => setHappening(null)}
        />
      )}

      <Overworld
        current={fieldMapId}
        progress={progress}
        met={metStrangers.current}
        standingOn={standingOn}
        open={interrupts.overworld}
        onTravel={travel}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'overworld' })}
      />

      {/* One surface, two layers: the notes are the floor, a place sits over them, and canon
          is a section inside the notes rather than a panel of its own. */}
      <Here
        open={surface === 'here'}
        height={dockHeight}
        onHeight={() => dispatch({ type: 'dock-toggle' })}
        notes={{
          entry: arrival?.entry ?? null,
          surroundings: arrival?.surroundings ?? '',
          hint: arrival?.hint ?? '',
          whereNext: arrival?.whereNext ?? '',
          goal: road?.next ?? '',
          fatigue: arrival?.fatigue ?? null,
          dusk: arrival?.dusk ?? null,
          discovered: arrival?.discovered ?? 0,
          atLandmark: arrival?.atLandmark ?? false,
          memory,
        }}
        sky={skyPhase === null ? null : { phase: skyPhase, weather: moment?.weather }}
        coach={coach?.line ?? null}
        pinned={{
          recipeId: pinned,
          satchel,
          bench,
          flags: journeyFlags.current,
          // Tapping the line opens the workshop at it, where it can be changed or unpinned.
          onOpen: () => {
            setWorkshopAt(pinned);
            dispatch({ type: 'open-interrupt', which: 'workshop' });
          }
        }}
        standing={{
          creature: arrival?.entry?.creature ?? { name: null, note: '', species: null },
          doing: arrival?.entry?.doing ?? '',
          flora: arrival?.entry?.flora ?? { name: null, note: '', species: null },
          standing
        }}
        place={{
          poiId: placeOpen ? standingOn : null,
          presence,
          settling,
          progress,
          moment,
          firstVisit: Boolean(standingOn) && !visited.current.has(standingOn!),
          onLook: look,
          onTalkTo: (npcId: string) => dispatch({ type: 'talk-to', npcId }),
          /**
           * Walk up to a bench and open the workshop at it.
           *
           * **Null below reading height**, which makes the board a readout rather than a control:
           * a pressable mark owes the 44px touch floor where a readout owes 26, and the dock has
           * measured that difference in chips falling off a landscape phone. The board still says
           * what is here at every height -- what the height decides is whether it can be pressed.
           */
          onOpenStation:
            dockHeight === 'peek'
              ? null
              : (s: Station) => {
                  setAtStation(s);
                  dispatch({ type: 'open-interrupt', which: 'workshop' });
                },
          onClose: () => {
            if (standingOn) visited.current.add(standingOn);
            dispatch({ type: 'close-place' });
          }
        }}
        conversation={
          talkingTo
            ? {
                npcId: talkingTo,
                progress,
                satchel,
                traits: travellerTraits,
                onListen: listen,
                onClose: () => dispatch({ type: 'stop-talking' })
              }
            : null
        }
        canon={<CanonPanel place={place} status={canon} />}
        actions={tileActions}
      />

      {/* The arrival still stops the world for a moment, but it can no longer sit below the map —
          there is no below. It comes to the middle, which is where you want to read it anyway. */}
      <Modal
        open={Boolean(arrivalPage)}
        label="A page of the journal"
        onClose={() => setArrivalPage(null)}
        veilClassName="arrival-veil"
      >
        {arrivalPage && (
          <section className="arrival" aria-live="polite">
            <h2>{arrivalPage.title}</h2>
            <p>{arrivalPage.body}</p>
            <p className="arrival-closing">{arrivalPage.closing}</p>
            <div className="arrival-actions">
              <button type="button" onClick={exportImage}>
                Keep this page
              </button>
              <button type="button" className="ghost" onClick={() => setArrivalPage(null)}>
                Close the journal
              </button>
            </div>
          </section>
        )}
      </Modal>
    </div>
  );
}
