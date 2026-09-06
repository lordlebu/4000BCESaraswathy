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
import { fieldMap, poi } from '../content/places';
import { SatchelPanel } from './SatchelPanel';
import { SatchelStrip } from './SatchelStrip';
import { RecordTabs, type RecordTab } from './Records';
import { PeoplePanel } from './PeoplePanel';
import { met } from '../content/people';
import { seedFromUrl } from './seed';
import { WorkshopPanel } from './WorkshopPanel';
import { distinct, emptySatchel } from '../content/satchel';
import { offeredHere } from '../content/crafting';
import { carry, gatheredLine, standingLine } from '../content/gathering';
import { conditionOf, draw, noNodes, takeableAt, type Taking } from '../content/nodes';
import { canonStatus, type CanonStatus, type Place } from './canonClient';
import { isPresent, routineFor } from '../content/routine';
import { creatureFor, floraFor } from '../content/species';
import { type Collection, emptyCollection, metOnTile, size } from '../content/collection';
import { buildTravelLog, travelLogFilename, travelLogToText } from '../content/travelLog';
import { downloadImage, downloadText } from './exportJournal';
import { hasBegun, loadJourney, saveJourney } from '../save';
import { advance, answer, craft, hear, knowsRecipe, type WorldMoment } from '../journey';
import { DEFAULT_FIELD_MAP } from '../game/scenes/WorldScene';
import { characterFor } from '../game/player';
import type { World } from '../world/types';
import { tileHash } from '../world/rng';
import { isAnimal } from '../content/species';
import {
  GESTURE_VERB,
  blockedReason,
  difficultyOf,
  gestureFor,
  type Gesture
} from '../content/gestures';
import { ActivityModal } from './ActivityModal';

/**
 * Which country to open on, for a link that wants to start somewhere other than Lothal.
 *
 * The same kind of hook as `?hour=` and `?at=`, and here for the same reason: looking at the
 * Narmada should not require travelling there first. An unknown id falls back to the default
 * rather than throwing — this is a convenience, and must never break the game for someone who
 * mistypes one.
 */
function fieldMapFromUrl(): string {
  const asked = new URLSearchParams(window.location.search).get('map')?.trim();
  return asked && fieldMap(asked) ? asked : DEFAULT_FIELD_MAP;
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
  // What the traveller has drawn down. The one piece of world state a save has to hold, because
  // it is the only thing about a tile that cannot be recomputed from the seed.
  const [nodes, setNodes] = useState(initialJourney.current.nodes ?? noNodes());

  /**
   * The activity being played, or null when none is.
   *
   * Holds what the tile promised at the moment the player committed, rather than recomputing it
   * when the run settles. `takeableAt` is a function of the day and the nodes, and both can move
   * under a modal that is open -- so re-asking would let a player see one offer and receive
   * another, which is exactly the "promising two reeds and handing over one" fault `Taking`
   * exists to prevent.
   */
  const [activity, setActivity] = useState<{
    taking: Taking[];
    day: number;
    /** Set when this is a night rather than a gathering. Carries the shelter kind for the picture. */
    resting?: string;
  } | null>(null);
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
    satchel: initialJourney.current.satchel ?? emptySatchel()
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
  const [fieldMapId, setFieldMapId] = useState(fieldMapFromUrl);
  const visited = useRef(new Set<string>());

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
  const [ui, dispatch] = useReducer(surfaceReducer, initialSurface);
  const { surface, interrupts, standingOn, placeOpen, satchelRibbon } = ui;

  // The scene owns the clock and says when it turns. React used to run its own timer off the
  // same formulas, which is two clocks agreeing by luck -- and they would have drifted the
  // moment walking started spending time, which it does.
  const [moment, setMoment] = useState<WorldMoment | null>(null);

  // The fog set changes on every step, which is far too often to keep in React state — it would
  // re-render the whole panel each tile. The scene owns it; this ref only carries it to the save.
  const discovered = useRef<string[]>(initialJourney.current.discovered);

  useEffect(() => {
    const onWorldReady = ({ world: next }: GameToUi['world-ready']) => setWorld(next);
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
    const onMoment = (next: GameToUi['moment-changed']) => setMoment(next);
    // Who the scene says it is drawing, which is the only authority on it. The picker sets its
    // own state optimistically; this is what corrects it if the scene ever disagreed.
    const onCharacter = ({ characterId: drawn }: GameToUi['character-changed']) => setDrawn(drawn);

    EventBus.onEvent('world-ready', onWorldReady);
    EventBus.onEvent('tile-entered', onTileEntered);
    EventBus.onEvent('journey-changed', onJourneyChanged);
    EventBus.onEvent('landmark-reached', onLandmarkReached);
    EventBus.onEvent('standing-on', onStandingOn);
    EventBus.onEvent('moment-changed', onMoment);
    EventBus.onEvent('character-changed', onCharacter);
    return () => {
      EventBus.offEvent('world-ready', onWorldReady);
      EventBus.offEvent('tile-entered', onTileEntered);
      EventBus.offEvent('journey-changed', onJourneyChanged);
      EventBus.offEvent('landmark-reached', onLandmarkReached);
      EventBus.offEvent('standing-on', onStandingOn);
      EventBus.offEvent('moment-changed', onMoment);
      EventBus.offEvent('character-changed', onCharacter);
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
        nodes,
        // The scene owns the clock and reports it with each step; this is only where it is kept
        // so the next boot can hand it back. Nought until the first tile is entered.
        travelled: travelledRef.current
      });
    const timer = window.setInterval(flush, 3000);
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [seed, collection, reached, progress, satchel]);

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
    setProgress(loadJourney(next).progress);
    // A new world is a new walk. What was in the satchel belonged to the old one.
    setSatchel(loadJourney(next).satchel);
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
   * Stoop and pick up whatever this tile offers.
   *
   * Done in React straight from the content layer rather than routed through the scene, on
   * the precedent `EventBus.ts` sets for observing a creature: the content layer is
   * framework-free and importable here, and going through the scene is what once made the
   * journal describe a crane while the sketch recorded an otter.
   */
  const pickUp = useCallback(() => {
    if (!underfoot) return;
    const today = arrival?.day ?? 0;
    // What is *left* here, not what grows here. `gather` still does the carrying; this decides
    // what there is to carry, which is the whole of what a resource node changes.
    const taking = takeableAt(nodes, underfoot.seed, underfoot.at, underfoot.biome, today);
    if (taking.length === 0) return;

    // **Opening a modal rather than taking.** Everything below this line used to run here, and
    // that was the whole of the finding: a reed and a beedu manta came off the same click, so a
    // player looking for the hunting could not find it because there was no gesture to see.
    // `finishTaking` now holds what this did, and runs when the activity settles.
    setActivity({ taking, day: today });
  }, [underfoot, nodes, arrival?.day]);

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
      const today = arrival?.day ?? 0;
      setSatchel((s) => carry(s, taken));
      setNodes((n) => draw(n, underfoot.seed, underfoot.at, taken, today));
      // Noted rather than announced. The whole progression of this game is a written journal, so
      // a good cut is a sentence in the field notes and not a number in a badge. The activity's
      // own line wins when it has one, because it says how the hands went as well as what was cut.
      setMemory(line || gatheredLine(underfoot.seed, underfoot.at, underfoot.biome, taken) || '');
    },
    [underfoot, arrival?.day]
  );

  /**
   * Which gesture the running activity is, from the material it is about.
   *
   * Derived rather than stored on the activity, so it cannot drift from the material the modal is
   * actually settling -- the two would be a pair of facts about the same thing, and pairs like
   * that disagree eventually.
   */
  const activityGesture = useMemo<Gesture | null>(
    () =>
      activity
        ? activity.resting
          ? 'rest'
          : gestureFor(activity.taking[0]!.material, isAnimal)
        : null,
    [activity]
  );

  /**
   * The seeded roll the activity deals its bands from.
   *
   * **Memoised because its identity is load-bearing.** The modal deals a fresh attempt in an
   * effect keyed on this function, so an inline arrow -- a new identity every render -- re-deals
   * the bands on every tick of its own timer. The run then never accumulates a beat and never
   * settles, which is precisely what the browser showed while all 900 unit tests passed: the
   * component is correct and the caller was re-mounting it under itself.
   */
  const activityRoll = useMemo(
    () =>
      underfoot && activity
        ? (salt: string) =>
            tileHash(underfoot.seed, underfoot.at.x, underfoot.at.y, `${salt}:${activity.day}`)
        : () => 0,
    [underfoot, activity]
  );

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
  const tileActions = useMemo<TileAction[]>(() => {
    // What is left here and how much of it comes up, so the row can say both *before* the
    // player commits. The whole design rests on this being visible rather than rolled: a stand
    // somebody has been cutting reads as worked ground, and a good cut reads as two.
    const today = arrival?.day ?? 0;
    const left = underfoot
      ? takeableAt(nodes, underfoot.seed, underfoot.at, underfoot.biome, today)
      : [];
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
    const gesture = first ? gestureFor(first, isAnimal) : null;
    const routine = currentCreature ? routineFor(currentCreature, moment) : null;
    // A stalk is refused when the animal is only sign. `blockedReason` writes the sentence,
    // because the reason is the teaching -- it sends the player back at a better hour.
    const cannotStalk =
      gesture && first
        ? blockedReason(gesture, routine, currentCreature?.name ?? null)
        : null;

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
        onDo: () => setActivity({ taking: [], day: arrival?.day ?? 0, resting: shelter })
      }
    ];
  }, [underfoot, arrival, nodes, pickUp, currentCreature, moment]);

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

      const wanted = e.code === 'KeyE' ? 'take' : e.code === 'KeyR' ? 'rest' : null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const [lastMade, setLastMade] = useState<Step[]>([]);

  const makeHere = useCallback(
    (recipeId: string) => {
      const done = craft(progress, satchel, recipeId, bench);
      if (!done.made) return;
      setProgress(done.progress);
      setSatchel(done.satchel);
      setLastMade(done.steps);
    },
    [progress, satchel, bench]
  );

  /** Settle a question. The player may be wrong, and nothing here tells them so. */
  const settle = useCallback(
    (questionId: string, index: number) => setProgress((p) => answer(p, questionId, index)),
    []
  );

  const travel = useCallback(
    (next: string) => {
      setFieldMapId(next);
      // Arriving in another country is leaving wherever you were standing, and the map that
      // sent you there has done its job.
      dispatch({ type: 'standing-on', poiId: null });
      dispatch({ type: 'close-interrupt', which: 'overworld' });
      discovered.current = [];
      EventBus.emitEvent('travel-to', { fieldMapId: next, seed });
    },
    [seed]
  );

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
  const hasNotes = Boolean(arrival) && surface === 'here';
  useEffect(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return;

    const report = () => {
      const bounds = stage.getBoundingClientRect();
      const notes = document.querySelector('.journal')?.getBoundingClientRect();

      EventBus.emitEvent('viewport-insets', {
        right: 0,
        bottom: notes ? Math.round(bounds.bottom - notes.top) : 0
      });
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(stage);
    for (const panel of document.querySelectorAll('.journal')) observer.observe(panel);
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
          fieldMapId={fieldMapFromUrl()}
          characterId={characterId}
        />
      )}

      <FrontDoor
        open={atTheDoor}
        canContinue={hasBegun(initialJourney.current)}
        seed={seed}
        characterId={characterId}
        onChoose={chooseCharacter}
        onContinue={() => setAtTheDoor(false)}
        onBegin={() => {
          // `generate` with the same seed is exactly "this world again, from nothing" -- it
          // clears fog, collection, satchel and progress, which is what starting over means.
          generate(seed);
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
        placeName={standingOn ? poi(standingOn)?.name ?? null : null}
        placeOpen={placeOpen}
        onTogglePlace={() => dispatch({ type: 'toggle-place' })}
      />
        {satchelRibbon && (
          <SatchelStrip
            satchel={satchel}
            onOpen={() => dispatch({ type: 'open-interrupt', which: 'satchel' })}
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
        open={interrupts.satchel}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'satchel' })}
      />

      <WorkshopPanel
        satchel={satchel}
        bench={bench}
        knows={knowsRecipeHere}
        onMake={makeHere}
        lastMade={lastMade}
        open={interrupts.workshop}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'workshop' })}
      />

      <Ending
        progress={progress}
        open={interrupts.ending}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'ending' })}
      />

      {/* The activity. Mounted only while one is running, so every open deals fresh bands rather
          than resuming a run the player has forgotten the state of. */}
      {activity && underfoot && activityGesture && (
        <ActivityModal
          open
          gesture={activityGesture}
          promised={activity.taking}
          difficulty={
            // A night is not a test of anybody's hands. There is nothing to aim at, so the band is
            // at its widest and the beats pass on their own -- which is the whole of what makes
            // this the gentlest place to learn what the modal is.
            activity.resting
              ? 0
              : difficultyOf(
                  activity.taking[0]!.material,
                  activityGesture,
                  currentCreature ? routineFor(currentCreature, moment) : null
                )
          }
          roll={activityRoll}
          creatureId={activityGesture === 'stalk' ? currentCreature?.id ?? null : null}
          creatureName={activityGesture === 'stalk' ? currentCreature?.name ?? null : null}
          variant={activity.resting ?? null}
          subject={activity.resting ? SHELTER_LABEL[activity.resting] ?? 'Stop for the night' : null}
          onClose={() => {
            setActivity(null);
            // The night is spent on the way out rather than when the run settles, so a player who
            // changes their mind has not already slept. `camp` is the rules layer's own event and
            // it still decides whether a night is legal.
            if (activity.resting) EventBus.emitEvent('camp', {});
          }}
          onFinish={activity.resting ? () => {} : finishTaking}
        />
      )}

      <Overworld
        current={fieldMapId}
        progress={progress}
        open={interrupts.overworld}
        onTravel={travel}
        onClose={() => dispatch({ type: 'close-interrupt', which: 'overworld' })}
      />

      {/* One surface, two layers: the notes are the floor, a place sits over them, and canon
          is a section inside the notes rather than a panel of its own. */}
      <Here
        open={surface === 'here'}
        notes={{
          entry: arrival?.entry ?? null,
          surroundings: arrival?.surroundings ?? '',
          hint: arrival?.hint ?? '',
          whereNext: arrival?.whereNext ?? '',
          fatigue: arrival?.fatigue ?? null,
          dusk: arrival?.dusk ?? null,
          discovered: arrival?.discovered ?? 0,
          atLandmark: arrival?.atLandmark ?? false,
          memory,
        }}
        place={{
          poiId: placeOpen ? standingOn : null,
          progress,
          moment,
          firstVisit: Boolean(standingOn) && !visited.current.has(standingOn!),
          onLook: look,
          satchel,
          onListen: listen,
          onClose: () => {
            if (standingOn) visited.current.add(standingOn);
            dispatch({ type: 'close-place' });
          }
        }}
        canon={<CanonPanel place={place} status={canon} />}
        actions={tileActions}
      />

      {/* The arrival still stops the world for a moment, but it can no longer sit below the map —
          there is no below. It comes to the middle, which is where you want to read it anyway. */}
      {arrivalPage && (
        <div className="arrival-veil">
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
        </div>
      )}
    </div>
  );
}
