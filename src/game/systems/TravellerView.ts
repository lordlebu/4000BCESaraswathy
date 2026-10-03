// The people on the road as drawn on the map: the road company walking their circuits, the people
// who keep today's camp, the runner meeting a traveller at the turn-off and the visitor at the fire.
// Where each of them is drawn, who has stopped because the player called, the marker over whoever
// the talk row means, and what React is told about all of it.
//
// **The fourth system out of `WorldScene`**, after `CampView`, `WandererView` and `HomesteadView`,
// and moved the same way: as it was, with no change in behaviour. Every rule is still in `content/`
// -- `whereabouts`, `untangle`, `stillWaiting` and `delayAfter` in `travellers.ts`, `campPlacements`
// and the camp's day in `campLife.ts` -- and this asks them. **The player's walk stays in the
// scene**: calling to somebody stops them here, and `hail` answers where they are so the scene can
// walk the player up by its own tap-to-walk path.

import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { TILE_SIZE } from '../tileTextures';
import { ROW_SLOT, depthFor } from '../frames';
import { DAY_MS, phaseAt } from '../dayNight';
import { animFor, dyeSheet, everyCharacter, facingFromStep, forgetSheet, frameOf, travellerScale } from '../player';
import { WADE_ALPHA, wadeFor } from '../wading';
import { PIP_NEWS, PIP_RING } from '../marks';
import {
  campPeople,
  campPlacements,
  campVisitors,
  phaseAfterMeeting,
  runnerErrand,
  standingRoom,
  visitorAt,
  type CampPerson,
  type RunnerErrand,
  type Visit
} from '../../content/campLife';
import {
  NEARBY_TILES,
  delayAfter,
  hourOf,
  hoursFor,
  nearby,
  placedCircuit,
  stillWaiting,
  travellerState,
  travellersOn,
  untangle,
  whereabouts,
  type Traveller,
  type TravellerState,
  type Waiting
} from '../../content/travellers';
import type { Encampment } from '../../content/encampments';
import { waitAtPiers } from '../../content/vehicles';
import { isWalkable } from '../../world/generate';
import type { FieldMapWorld } from '../../world/fieldMap';
import type { Point, World } from '../../world/types';
import type { DrawnCamp } from './CampView';

/** What the road reads of the scene. Live: a getter answers for the map shown now. */
export interface TravellerHost {
  readonly world: World;
  readonly built: FieldMapWorld;
  readonly fieldMapId: string;
  /** The player's tile. */
  readonly at: Point;
  /** The player's own sheet, which no traveller is ever drawn in. */
  readonly playerKey: string;
  /** The day's clock in ms -- standing and walking both -- and the phase it starts from. */
  clock(): number;
  /** The clock only standing still advances, in ms: what a wait's patience is measured on. */
  standingClock(): number;
  readonly startPhase: number;
  day(): number;
  /** Today's camp as drawn, if one stands. */
  camp(): DrawnCamp | null;
  /** How tall the player is drawn, for the browser suite to compare a traveller against. */
  playerHeight(): number;
}

export class TravellerView {
  private list: {
    traveller: Traveller;
    /** Set for somebody who keeps today's camp: placed by `campPlacements`, not by a circuit. */
    person?: CampPerson;
    /** The circuit's placed stops, ids and all, so a card can name where somebody is headed. */
    circuit: { poiId: string; at: Point }[];
    stops: Point[];
    sprite: Phaser.GameObjects.Sprite;
  }[] = [];

  /**
   * The last states sent to React, as one string.
   *
   * Compared rather than diffed: three travellers with three short fields is a key cheaper to build
   * than the render it saves, and `travellers-changed` exists to be rare.
   */
  private travellerStatesSent = '';
  /** Where each walking traveller was last drawn, after `untangle`. Nobody resting is in it. */
  private tiles = new Map<string, Point>();
  /** The last `travellers-nearby` sent, so an unchanged answer is not sent again. */
  private nearbySent = '';
  /** Somebody the player called to, standing on their tile until reached. See `hail`. */
  private waiting: Waiting | null = null;
  /**
   * How far behind their own hours each traveller is, in days, from waits they have been kept for.
   * Not saved: see `delayAfter`. Dropped once they are at a place for the night.
   */
  private delays = new Map<string, number>();
  /** Who the talk row means, as React last said, and the mark drawn over their head. */
  private talkTarget: string | null = null;
  private targetMark: Phaser.GameObjects.Graphics | null = null;
  /** The last phase the travellers were moved for, so they are not recomputed every frame. */
  private movedAt = -1;
  /** What each of the camp's people is doing, as last placed, for `travellers-nearby`. */
  private campDoing = new Map<string, string>();
  /** Today's errand and visitors for the camp, worked out once a day. See `refreshCampDay`. */
  private campDay: { id: string; day: number; errand: RunnerErrand | null; visits: Visit[] } | null = null;
  /** The rail the carriage is running over now, or empty. Anybody on it waits at the pier. */
  private line: Point[] = [];
  /** Who is waiting at a pier for the carriage to pass, for the browser suite. */
  private atPier = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: TravellerHost
  ) {}

  /**
   * The carriage has set out over this stretch of rail, or arrived (`[]`): move everybody now.
   *
   * Anybody standing on it waits at the pier for the ride (`pierFor`), turned to watch it go by,
   * and goes back to where their own hours put them once it is in. **Placed at once rather than on
   * the half-second gate**, or the carriage would set out through them before they stepped off.
   * Nothing is saved and no clock moves: where somebody is drawn changes, not where they are.
   */
  closeLine(path: readonly Point[], phase: number): void {
    this.line = [...path];
    this.movedAt = -1;
    this.updateWaiting();
    this.update(phase);
  }

  /** The road company -- not the camp's people -- with their stops: what the camp rules take. */
  roadRoster(): { id: string; npcId: string | null; stops: Point[] }[] {
    return this.list
      .filter((t) => !t.person)
      .map(({ traveller, stops }) => ({ id: traveller.id, npcId: traveller.npcId, stops }));
  }

  /**
   * Put a sprite on the map for everybody else walking it.
   *
   * **Created once and moved, never created per frame.** Three sprites against the largest map's
   * ~17,650 objects is 0.02%, and `docs/rendering.md` establishes that frame cost tracks canvas
   * area rather than object count -- so the cost of this layer is three tiles of fill, which is
   * nothing. What would *not* be nothing is rebuilding them on a clock.
   *
   * The player's own sheet is skipped so the traveller never meets themselves: with five sheets and
   * a roster of three there is always one to move to.
   */
  create(): void {
    // **Half the player's size, and the reason is the mount rather than modesty.** Every traveller
    // on every map carries a `conveyance` -- eight ox and Harappan carts, a reed raft and the
    // lodestone train, measured across the four maps -- and none of it is drawn yet: `vehicles.png`
    // is built by `tools/build-terrain.js` from one painted carriage and loaded by nothing. At the
    // player's 4x there was no room to draw one under the figure even once the art exists, because
    // 104x160 pixels covers a 128 tile outright. `travellerScale` says why two and not a quarter.
    const scale = travellerScale(TILE_SIZE);
    for (const traveller of travellersOn(this.host.fieldMapId, this.host.world.seed)) {
      const circuit = placedCircuit(traveller, this.host.built.placed);
      const stops = circuit.map((s) => s.at);
      // A circuit whose stops did not all get placed is not a circuit. Dropping the traveller is
      // right: inventing a walk for somebody canon only put in one place would put a person on the
      // road that nothing sent anywhere.
      if (stops.length < 2) continue;

      const body = traveller.art === this.host.playerKey ? this.otherSheet(traveller.art) : traveller.art;
      // Re-dyed to this person's look when the body has one, so three painted strangers read as
      // many. Only when the body is the one the look was chosen for: a look names the colours of
      // one sheet, and applied to the player-avoidance fallback it would match nothing.
      // The cell the body was built at: a wide or tall figure has its own, so it is cut and drawn at
      // that size rather than squeezed into the shared 26x40. Feet stay on the anchor either way.
      const frame = frameOf(body);
      const key =
        traveller.look && traveller.look.body === body ? dyeSheet(this.scene, body, traveller.look, frame) : body;
      const sprite = this.scene.add
        .sprite(0, 0, key, 0)
        .setOrigin(0.5, 1)
        .setDisplaySize(frame.width * scale, frame.height * scale);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      sprite.setName(`traveller:${traveller.id}`);
      this.list.push({ traveller, circuit, stops, sprite });
    }

    // A dyed sheet is made per look, and the looks belong to one map. Release the ones this roster
    // does not wear, so a journey across every map holds one map's strangers rather than all of
    // them. Only dyed keys (`body~skin~cloth~second`): the painted bodies are loaded once and kept.
    const worn = new Set(this.list.map(({ sprite }) => sprite.texture.key));
    for (const key of this.scene.textures.getTextureKeys()) {
      if (key.includes('~') && !worn.has(key)) forgetSheet(this.scene, key);
    }

    // **Exposed for the browser suite, which is the only thing that can see a Phaser sprite.**
    // This codebase's signature fault is a layer that is built, tested and connected to nothing --
    // five recorded instances -- and a Node test can prove every rule in `travellers.ts` while the
    // scene never calls any of them. `e2e/road-company.spec.ts` reads this and would fail the day
    // `createTravellers` stopped being called, which no other check could notice.
    (window as unknown as { __travellers?: () => unknown[] }).__travellers = () =>
      this.list.map(({ traveller, sprite }) => ({
        id: traveller.id,
        named: traveller.npcId !== null,
        sheet: sprite.texture.key,
        visible: sprite.visible,
        x: Math.round(sprite.x),
        y: Math.round(sprite.y),
        // The tile they are drawn on after `untangle`, or null while resting. So a spec can stand
        // somebody beside them without guessing a coordinate -- see `e2e/road-talk.spec.ts`.
        tile: this.tiles.get(traveller.id) ?? null,
        // Whether they stopped because the player called to them -- see `onHail`.
        waiting: this.waiting?.id === traveller.id,
        // Stepped off the line to let the carriage by -- see `closeLine`.
        atPier: this.atPier.has(traveller.id),
        // How deep they are drawn in water, the share of the figure cut away: see `wadeWalker`.
        cut: (sprite.getData('cut') as number | undefined) ?? 0,
        // Somebody who keeps today's camp rather than walking a circuit, and their slot there.
        camp: traveller.campId ?? null,
        slot: (traveller as Partial<CampPerson>).slot ?? null,
        // Whether the talk row's mark is over them, which is how a player tells two people apart.
        marked: this.talkTarget === traveller.id && Boolean(this.targetMark?.visible),
        // **How big they are drawn, and the player's own size to compare it against.** A ratio the
        // scene applies is not provable from Node: `travellerScale` can be right while
        // `createTravellers` uses the other one, which is exactly what it did.
        w: Math.round(sprite.displayWidth),
        h: Math.round(sprite.displayHeight),
        playerH: Math.round(this.host.playerHeight())
      }));
  }

  /** Any built sheet but this one, so a traveller is never the player's own figure. */
  private otherSheet(taken: string): string {
    const art = everyCharacter().find((c) => c.key !== taken);
    return art?.key ?? taken;
  }

  /**
   * Today's runner errand and visitors, worked out once for the camp and the day.
   *
   * Asked of `campLife.ts` with the road company's own stops, so the runner meets somebody whose leg
   * today really does pass the turn-off.
   */
  refreshCampDay(day: number): void {
    const camp = this.host.camp();
    if (!camp) {
      this.campDay = null;
      return;
    }
    if (this.campDay && this.campDay.id === camp.id && this.campDay.day === day) return;
    const roster = this.list
      .filter((t) => !t.person)
      .map(({ traveller, stops }) => ({ id: traveller.id, npcId: traveller.npcId, stops }));
    const errand = runnerErrand(this.host.world, camp.camp, camp.way, roster, day);
    const visits = campVisitors(this.host.world, camp.camp, camp.way, roster, day, errand);
    this.campDay = { id: camp.id, day, errand, visits };
    this.movedAt = -1;
  }

  /** Draw the people who keep this camp: travellers who do not travel. See `campLife.ts`. */
  addCampFolk(camp: Encampment): void {
    const scale = travellerScale(TILE_SIZE);
    for (const person of campPeople(camp, this.host.fieldMapId, this.host.world.seed)) {
      const body = person.art === this.host.playerKey ? this.otherSheet(person.art) : person.art;
      const frame = frameOf(body);
      const key = person.look && person.look.body === body ? dyeSheet(this.scene, body, person.look, frame) : body;
      const sprite = this.scene.add
        .sprite(0, 0, key, 0)
        .setOrigin(0.5, 1)
        .setDisplaySize(frame.width * scale, frame.height * scale)
        .setVisible(false);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      sprite.setName(`traveller:${person.id}`);
      this.list.push({ traveller: person, person, circuit: [], stops: [], sprite });
    }
    this.movedAt = -1;
  }

  /** Take the struck camp's people off the map, and let go of anybody among them who was waiting. */
  dropCampFolk(): void {
    const leaving = this.list.filter((t) => t.person);
    if (leaving.length === 0) return;
    for (const t of leaving) {
      t.sprite.destroy();
      this.tiles.delete(t.traveller.id);
      if (this.waiting?.id === t.traveller.id) this.waiting = null;
    }
    this.list = this.list.filter((t) => !t.person);
    this.campDay = null;
    this.movedAt = -1;
    this.reportNearby();
  }

  /**
   * Move everybody to where the hour says they are.
   *
   * `whereabouts` is the whole rule and it is asked rather than reimplemented -- the scene owns the
   * clock and the pixels and nothing else, which is the same split `dayNight.ts` and `fatigue.ts`
   * already keep.
   *
   * **Hidden rather than moved off-screen when they are resting at a place.** A traveller standing
   * on a point of interest would be drawn over the building, and a player who walks in expects to
   * find them in the place panel rather than as a figure on the roof. The panel is where a person
   * at a place lives; the map is where a person between places lives.
   */
  update(phase: number): void {
    if (this.list.length === 0) return;
    // A traveller crosses a tile every few in-game minutes; a hundredth of a day is about fifteen.
    const step = Math.floor(phase * 100);
    if (step === this.movedAt) return;
    this.movedAt = step;

    const day = this.host.day();
    this.refreshCampDay(day);
    const camp = this.host.camp();
    const campDay = this.campDay;
    const errand = campDay?.errand ?? null;
    // The camp's people for this hour, and somewhere at the fire for a visitor to sit that none of
    // them is using.
    const folk = camp ? campPlacements(this.host.world, camp.camp, day, phase, errand) : [];
    this.campDoing = new Map(folk.map((f) => [f.id, f.activity]));
    const hour = hourOf(phase);
    const seats = camp
      ? standingRoom(this.host.world, camp.camp).filter((p) => !folk.some((f) => f.at && f.at.x === p.x && f.at.y === p.y))
      : [];
    // Everybody's position first, then room made between them: whether somebody steps aside depends
    // on who else is on the tile, so it cannot be decided one traveller at a time.
    //
    // Each by their own clock: somebody who waited for the player is that far behind their hours,
    // so they go on from where they stopped (`delayAfter`). A delay is forgotten once they are at a
    // place for the night by both clocks, since nothing about a night depends on it. A traveller who
    // stops to trade with a camp's runner is held at the turn-off for it, and goes on that much later.
    const onTheirWay = this.list.map(({ traveller, stops, person }) => {
      if (person) {
        const f = folk.find((x) => x.slot === person.slot);
        const where = f?.at ? { at: f.at, heading: null, resting: false, from: f.at, to: f.at } : null;
        return { id: traveller.id, where, folk: f ?? null, faceTo: null as Point | null };
      }
      const visit = campDay?.visits.find((v) => v.travellerId === traveller.id);
      if (visit) {
        // Sitting at the fire for the visit itself, turned to it; walking there and on, otherwise.
        const sitting = hour >= visit.arrive && hour < visit.leave;
        if (sitting) this.campDoing.set(traveller.id, 'visit');
        const where = visitorAt(this.host.world, visit, phase, seats[0] ?? camp!.camp.at);
        return { id: traveller.id, where, folk: null, faceTo: sitting ? camp!.camp.at : null };
      }
      const hours = hoursFor(traveller.id);
      const delay = this.delays.get(traveller.id) ?? 0;
      const own = phaseAfterMeeting(errand, traveller.id, this.phaseLess(delay));
      const where = whereabouts(this.host.world, stops, day, own, hours);
      if (delay > 0 && where?.resting && whereabouts(this.host.world, stops, day, phase, hours)?.resting) {
        this.delays.delete(traveller.id);
      }
      // Stopped at the turn-off to trade with the camp's runner, turned to them.
      const trading = errand?.travellerId === traveller.id && hour >= errand.arrive && hour < errand.part;
      if (trading) this.campDoing.set(traveller.id, 'trade');
      return { id: traveller.id, where, folk: null, faceTo: trading ? errand.way[errand.way.length - 1]! : null };
    });
    // While the carriage runs, nobody stands in its way: they wait at the pier, watching the line,
    // and the line itself is ground nobody may be moved back onto when room is made.
    const line = this.line;
    const placed = waitAtPiers(this.host.world, onTheirWay, line);
    this.atPier = new Set(placed.filter((p, i) => p.where !== onTheirWay[i]!.where).map((p) => p.id));
    // Somebody waiting keeps the tile they stopped on, and nobody else may take it from them -- the
    // player is walking up to that tile's side.
    const waiting = this.waiting;
    const room = untangle(
      this.host.world,
      placed.filter((p) => p.id !== waiting?.id),
      [...(waiting ? [this.host.at, waiting.at] : [this.host.at]), ...line]
    );
    if (waiting) room.set(waiting.id, waiting.at);
    this.tiles = room;
    this.list.forEach(({ sprite }, i) => {
      const { where, folk: f, faceTo } = placed[i]!;
      if (placed[i]!.id === waiting?.id) {
        this.standWaiting(sprite, waiting.at);
        return;
      }
      if (!where || where.resting) {
        sprite.setVisible(false);
        return;
      }
      const at = room.get(placed[i]!.id) ?? where.at;
      // **Never drawn standing in the sea.** Nothing places anybody there -- `test/campLife.test.ts`
      // simulates every placement on every map and finds none -- but if a future change ever did,
      // somebody hidden for a moment is a far smaller fault than somebody standing in open water.
      const ground = this.host.world.tiles[at.y]?.[at.x];
      if (!ground || !isWalkable(ground)) {
        sprite.setVisible(false);
        return;
      }
      sprite.setVisible(true);
      sprite.setPosition(at.x * TILE_SIZE + TILE_SIZE / 2, at.y * TILE_SIZE + TILE_SIZE - 2);
      this.wadeWalker(sprite, at);
      // Sorted by row like everything else that stands on the ground, so a traveller south of the
      // player passes in front of them and one north of them passes behind.
      sprite.setDepth(depthFor(at.y, ROW_SLOT.walker));
      // Somebody at a camp faces what they are doing -- the fire, their work, the way they walk --
      // and only walks while they are on the way in.
      const toward = f?.facing ?? faceTo;
      const facing = toward
        ? facingFromStep(toward.x - at.x, toward.y - at.y, 'down')
        : facingFromStep(
            where.heading === 'east' ? 1 : where.heading === 'west' ? -1 : 0,
            where.heading === 'south' ? 1 : where.heading === 'north' ? -1 : 0,
            'down'
          );
      const walking = f ? f.activity === 'road' || f.activity === 'home' : !faceTo;
      const { key, flipX } = animFor(sprite.texture.key, facing, walking ? 'walk' : 'idle');
      if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
      sprite.setFlipX(flipX);
    });

    this.reportTravellers(day, phase);
    this.reportNearby();
  }

  /**
   * Tell React who is walking near the player, when that changes.
   *
   * Ids and a step count, never tiles -- React holds no tiles. Asked after travellers move and after
   * the player does, since either can bring somebody alongside.
   */
  reportNearby(): void {
    const close = nearby(this.tiles, this.host.at).map(({ id, steps, beside }) => ({
      id,
      npcId: this.list.find((t) => t.traveller.id === id)?.traveller.npcId ?? null,
      steps,
      beside,
      doing: this.campDoing.get(id) ?? null
    }));
    const key = JSON.stringify(close);
    if (key === this.nearbySent) return;
    this.nearbySent = key;
    EventBus.emit('travellers-nearby', { travellers: close });
  }

  /**
   * Tell React what everybody on the road is doing, when it changes.
   *
   * **The scene is the only side that can answer this**, because where a place landed belongs to
   * one generated world and React never sees the placement. What crosses the seam is the answer
   * rather than the ingredients: `travellerState` turns a position into places here, so React holds
   * no tiles and the rule about a traveller's hours stays in `content/`.
   */
  private reportTravellers(day: number, phase: number): void {
    const states = this.list
      .filter(({ person }) => !person)
      .map(({ traveller, circuit, stops }) => ({
        id: traveller.id,
        npcId: traveller.npcId,
        state: travellerState(circuit, whereabouts(this.host.world, stops, day, phase, hoursFor(traveller.id)))
      }))
      .filter((t): t is { id: string; npcId: string | null; state: TravellerState } =>
        t.state !== null
      );

    const key = JSON.stringify(states);
    if (key === this.travellerStatesSent) return;
    this.travellerStatesSent = key;
    EventBus.emit('travellers-changed', { travellers: states });
  }

  /** The phase of the day for somebody running `delay` days behind it. */
  private phaseLess(delay: number): number {
    return phaseAt(this.host.clock() - delay * DAY_MS, this.host.startPhase);
  }

  /** The day's clock in days -- standing and walking both -- which is what a delay is measured on. */
  private clockDays(): number {
    return this.host.clock() / DAY_MS;
  }

  /** The clock only standing still advances, in days, which is what a wait's patience is measured on. */
  private standingDays(): number {
    return this.host.standingClock() / DAY_MS;
  }

  /**
   * Somebody near was called to: stop them where they are drawn, turned to the player, and answer
   * where they stand and how far off, so the scene can walk the player up beside them. Out of sight,
   * it is ignored and answers nothing -- React only sends people the scene reported as near, but a
   * step can land between the two.
   */
  hail(travellerId: string): { at: Point; steps: number } | null {
    const at = this.tiles.get(travellerId);
    if (!at) return null;
    const steps = Math.max(Math.abs(at.x - this.host.at.x), Math.abs(at.y - this.host.at.y));
    if (steps > NEARBY_TILES) return null;
    // Calling a second person lets the first go on, held back by the time they stood.
    this.letGo();
    this.waiting = {
      id: travellerId,
      at,
      stopped: this.clockDays(),
      since: this.standingDays(),
      reached: steps <= 1
    };
    const sprite = this.list.find((t) => t.traveller.id === travellerId)?.sprite;
    if (sprite) this.standWaiting(sprite, at);
    return { at, steps };
  }


  /**
   * Draw somebody on the road in the water they are crossing, the way the player is: cut at the
   * waist in a river, the shins at a ford, the feet in a swamp, and faded into a sky pool. `wadeFor`
   * is the player's own rule, so nobody wades where the player would not. The cut is a crop on
   * whichever frame is showing, kept between frames, so it is only set when the depth changes.
   */
  private wadeWalker(sprite: Phaser.GameObjects.Sprite, at: Point): void {
    const wade = wadeFor(this.host.world.tiles[at.y]?.[at.x]);
    const depth = wade.kind === 'cut' ? wade.depth : 0;
    if (depth !== ((sprite.getData('cut') as number | undefined) ?? 0)) {
      sprite.setData('cut', depth);
      if (depth > 0) sprite.setCrop(0, 0, sprite.frame.width, Math.round(sprite.frame.height * (1 - depth)));
      else sprite.setCrop();
    }
    const sky = wade.kind === 'sky';
    sprite.setAlpha(1, 1, sky ? WADE_ALPHA : 1, sky ? WADE_ALPHA : 1);
  }

  /** Draw somebody waiting: still, on their tile, turned to face the player. */
  private standWaiting(sprite: Phaser.GameObjects.Sprite, at: Point): void {
    sprite.setVisible(true);
    sprite.setPosition(at.x * TILE_SIZE + TILE_SIZE / 2, at.y * TILE_SIZE + TILE_SIZE - 2);
    this.wadeWalker(sprite, at);
    sprite.setDepth(depthFor(at.y, ROW_SLOT.walker));
    const facing = facingFromStep(this.host.at.x - at.x, this.host.at.y - at.y, 'down');
    const { key, flipX } = animFor(sprite.texture.key, facing, 'idle');
    if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
    sprite.setFlipX(flipX);
  }

  /** Let whoever is waiting go on, held back by the time they stood. */
  private letGo(): void {
    const waiting = this.waiting;
    if (!waiting) return;
    this.waiting = null;
    this.delays.set(waiting.id, delayAfter(this.delays.get(waiting.id) ?? 0, waiting, this.clockDays()));
    // Back onto their own walk on the next tick rather than the next hundredth of a day, so they do
    // not stand looking at somebody who has gone.
    this.movedAt = -1;
  }

  /**
   * Ask whether somebody waiting still is. `stillWaiting` is the whole rule; this keeps them turned
   * to the player while they wait and lets them go when it says so.
   */
  updateWaiting(): void {
    const waiting = this.waiting;
    if (!waiting) return;
    const next = stillWaiting(waiting, this.host.at, this.standingDays());
    if (!next) {
      this.letGo();
      return;
    }
    this.waiting = next;
    const sprite = this.list.find((t) => t.traveller.id === next.id)?.sprite;
    if (sprite) this.standWaiting(sprite, next.at);
  }

  /**
   * Whoever is drawn under a tap, if they are near enough to talk to.
   *
   * A figure stands taller than its tile, so a tap on somebody's head lands on the tile above their
   * feet; both count.
   */
  under(tapped: Point): string | null {
    for (const [id, at] of this.tiles) {
      if (at.x !== tapped.x || (at.y !== tapped.y && at.y - 1 !== tapped.y)) continue;
      const steps = Math.max(Math.abs(at.x - this.host.at.x), Math.abs(at.y - this.host.at.y));
      if (steps <= NEARBY_TILES) return id;
    }
    return null;
  }

  /** Who the talk row means, from React. */
  setTalkTarget(travellerId: string | null): void {
    this.talkTarget = travellerId;
    this.placeTargetMark();
  }

  /**
   * A small marker over whoever the talk row means.
   *
   * **Reported from play: with two people equally near, nobody could tell who the row would talk
   * to.** The row says a name, and a name is no help when you have not met either of them. Drawn in
   * the pips' colours so it reads as the same family of mark -- somebody to talk to -- and moved
   * every frame because the traveller it rides on is moved on the half-second gate.
   */
  placeTargetMark(): void {
    const sprite = this.talkTarget
      ? this.list.find((t) => t.traveller.id === this.talkTarget)?.sprite
      : undefined;
    if (!sprite || !sprite.visible) {
      this.targetMark?.setVisible(false);
      return;
    }
    if (!this.targetMark) {
      const w = Math.max(6, Math.round(TILE_SIZE * 0.12));
      const g = this.scene.add.graphics();
      g.fillStyle(PIP_RING, 1).fillTriangle(-w - 2, -w - 3, w + 2, -w - 3, 0, 3);
      g.fillStyle(PIP_NEWS, 1).fillTriangle(-w, -w - 1.5, w, -w - 1.5, 0, 0);
      g.setName('talk-target');
      this.targetMark = g;
    }
    const row = Math.floor(sprite.y / TILE_SIZE);
    this.targetMark
      .setVisible(true)
      .setPosition(sprite.x, sprite.y - sprite.displayHeight - 2)
      .setDepth(depthFor(row, ROW_SLOT.canopy + 1));
  }
}
