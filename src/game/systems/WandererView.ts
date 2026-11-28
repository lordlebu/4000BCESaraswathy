// The animals that walk their own ground -- a wading whale between pools, a herd between grazings --
// as drawn on the map.
//
// **The second system out of `WorldScene`**, after `CampView.ts`, and moved the same way: as it was,
// with no change in behaviour. Where an animal is at an hour is `content/wanderers.ts`; which picture
// it is drawn from is `wandererArt.ts`; this puts the one at the other. An animal that is a property
// of a tile is still `species.ts` and is not drawn here.

import Phaser from 'phaser';
import { TILE_SIZE, paintedHeight } from '../tileTextures';
import { ROW_SLOT, depthFor } from '../frames';
import { isAlongside, patrolAt, wanderersOn, wandererAt, type Wanderer } from '../../content/wanderers';
import { EventBus } from '../EventBus';
import { paintedKey, walkArt, walkKey } from '../wandererArt';
import type { Facing } from '../player';
import type { Point, World } from '../../world/types';
import {OtterWakeView} from './OtterWakeView';
import {OTTER_SWIM_MS} from '../otterWake';

/** What the animals read of the scene. Live: a getter answers for the map shown now. */
export interface WandererHost {
  seen?:(x:number,y:number)=>boolean;
  readonly world: World;
  readonly fieldMapId: string;
  /** Where the map's places landed, for a patrol kept near one (`content/wanderers.ts`). */
  readonly placed: readonly { poiId: string; at: Point }[];
  /** The player's tile, for coming alongside. */
  readonly at: Point;
}

export class WandererView {
  private wake:OtterWakeView|null=null;
  /**
   * The animals walking their own ground, and the sprites drawing them.
   *
   * Same shape and same bargain as the scene's travellers: the circuit is held because it is a fact
   * about this generated world, and the position is not, because `wandererAt` derives it from the
   * seed, the day and the hour and stores nothing.
   */
  private list: { wanderer: Wanderer; sprite: Phaser.GameObjects.Image }[] = [];

  /** The last phase the animals were moved for. Separate from the travellers' so neither gates the other. */
  private movedAt = -1;

  /** Where each one was last put, by id. Only those drawn this hour; a hidden one is not here. */
  private standing = new Map<string, Point>();

  /** Who the player is alongside now, so coming alongside is said once and not every tick. */
  private beside = new Set<string>();

  /** Which way each one faces and whether it is on the move, by id: what `animate` steps through. */
  private going = new Map<string, { facing: Facing; moving: boolean }>();

  /**
   * How long one step of a painted walk is shown, in milliseconds. Four steps make a stride of about
   * three quarters of a second: an ox's unhurried pace, which is the only walk painted so far.
   */
  static readonly STEP_MS = 190;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: WandererHost
  ) {}

  /** Load the map's wanderers at their authored scale. */
  create(): void {
    for (const wanderer of wanderersOn(this.host.fieldMapId, this.host.world, this.host.placed)) {
      const sprite = this.scene.add
        .image(0, 0, this.texture(wanderer, 'right'))
        .setOrigin(0.5, 1)
        .setVisible(false);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      sprite.setName(`wanderer:${wanderer.id}`);
      this.size(wanderer, sprite);
      this.list.push({ wanderer, sprite });
    }
    if(this.list.some(p=>p.wanderer.id==='river-otter')&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      this.wake=new OtterWakeView(this.scene,this.host.world,(x,y)=>this.host.seen?.(x,y)??true);
    (window as unknown as {__otterWake?:()=>unknown}).__otterWake=()=>this.wake?.report()??null;

    // **Exposed for the browser suite for the same reason `__travellers` is, and it is the half
    // that matters.** Every rule in `wanderers.ts` is proved under Node while this scene calls none
    // of them -- which is this codebase's signature fault, five times recorded. `e2e/wanderers.spec.ts`
    // reads this and fails the day `createWanderers` stops being called.
    (window as unknown as { __wanderers?: () => unknown[] }).__wanderers = () =>
      this.list.map(({ wanderer, sprite }) => ({
        id: wanderer.id,
        name: wanderer.name,
        vehicle: wanderer.vehicle,
        stops: wanderer.circuit.length,
        at: this.standing.get(wanderer.id),
        texture: sprite.texture.key,
        visible: sprite.visible,
        x: Math.round(sprite.x),
        y: Math.round(sprite.y),
        w: Math.round(sprite.displayWidth),
        h: Math.round(sprite.displayHeight)
      }));
  }

  private texture(wanderer: Wanderer, facing: Facing): string {
    const key = paintedKey(wanderer.id, facing);
    if (!this.scene.textures.exists(key)) throw new Error(`Missing loaded wanderer texture: ${key}`);
    return key;
  }

  /** Scale every frame against the authored side view to keep height consistent. */
  private size(wanderer: Wanderer, sprite: Phaser.GameObjects.Image): void {
    const src = sprite.texture.getSourceImage() as { width: number; height: number };
    if (!src?.width || !src?.height) return;
    const side = this.scene.textures.get(this.texture(wanderer, 'right')).getSourceImage() as HTMLImageElement;
    // A step of a painted walk is scaled as its facing's still is, not to the box on its own: the
    // steps differ by a spear-tip in height, and fitting each would make the wagon pulse as it rolls.
    const stillKey = sprite.texture.key.replace(/:\d+$/, '');
    const still = this.scene.textures.get(stillKey).getSourceImage() as HTMLImageElement;
    const scale = paintedHeight(wanderer.id, side) / still.height;
    sprite.setDisplaySize(Math.round(src.width * scale), Math.round(src.height * scale));
  }

  /**
   * Move the animals to where the hour says they are.
   *
   * **Visible when resting, which is the one place this deliberately differs from a traveller.** A
   * person who has arrived somewhere is hidden, because they belong in the place panel rather than
   * standing on the roof of the building. An animal has no panel to be in and no building to stand
   * on: hiding it at its stop would mean the whale exists only while crossing between pools, and
   * coming alongside one is the whole of the quest.
   */
  update(phase: number, day: number): void {
    if (this.list.length === 0) return;
    const step = Math.floor(phase * 100);
    if (step === this.movedAt) return;
    this.movedAt = step;

    for (const { wanderer, sprite } of this.list) {
      // A patrol keeps the scene's clock and is placed every frame, in `animate`.
      if (wanderer.vehicle) continue;
      const where = wandererAt(this.host.world, wanderer, day, phase);
      if (!where) {
        if(wanderer.id==='river-otter')this.scene.tweens.killTweensOf(sprite);
        sprite.setVisible(false);
        this.standing.delete(wanderer.id);
        this.going.delete(wanderer.id);
        continue;
      }
      sprite.setVisible(true);
      const previous=this.standing.get(wanderer.id);
      this.standing.set(wanderer.id, where.at);
      const target={x:where.at.x*TILE_SIZE+TILE_SIZE/2,y:(where.at.y+1)*TILE_SIZE-2};
      const changed=previous&&(previous.x!==where.at.x||previous.y!==where.at.y);
      const wet=(p:Point)=>{const t=this.host.world.tiles[p.y]?.[p.x];return t&&['river','sea'].includes(t.biome)&&!t.bridge&&!t.road&&!t.track;};
      if(wanderer.id==='river-otter'&&changed&&this.wake&&wet(previous)&&wet(where.at)
        &&Math.abs(previous.x-where.at.x)+Math.abs(previous.y-where.at.y)===1){
        this.scene.tweens.killTweensOf(sprite);
        this.scene.tweens.add({targets:sprite,...target,duration:OTTER_SWIM_MS,ease:'Linear'});
      }else if(!changed&&wanderer.id==='river-otter'&&this.scene.tweens.isTweening(sprite)){
        // A logical waypoint can be sampled repeatedly while its cosmetic swim finishes.
      }else{if(wanderer.id==='river-otter')this.scene.tweens.killTweensOf(sprite);sprite.setPosition(target.x,target.y);}
      // Sorted by row like everything else standing on the ground, so an animal south of the player
      // passes in front and one north of them passes behind.
      sprite.setDepth(depthFor(where.at.y, ROW_SLOT.walker));
      // Keep the last direction while the animal stands still.
      if (where.heading) {
        const facing: Facing =
          where.heading === 'west'
            ? 'left'
            : where.heading === 'east'
              ? 'right'
              : where.heading === 'north'
                ? 'up'
                : 'down';
        const next = this.texture(wanderer, facing);
        if (sprite.texture.key !== next) {
          sprite.setTexture(next);
          this.size(wanderer, sprite);
        }
        this.going.set(wanderer.id, { facing, moving: true });
      } else {
        // Standing: back to the still of whichever way it was facing, so a walk stopped mid-stride
        // does not freeze on a lifted hoof.
        const was = this.going.get(wanderer.id);
        if (was?.moving) {
          this.going.set(wanderer.id, { facing: was.facing, moving: false });
          const still = this.texture(wanderer, was.facing);
          if (sprite.texture.key !== still) {
            sprite.setTexture(still);
            this.size(wanderer, sprite);
          }
        }
      }
    }
    this.reportBeside();
  }

  /**
   * Tell React when the player comes alongside one, once per meeting.
   *
   * Asked after the animals move and after the player does, since either can bring them together --
   * the same two moments `TravellerView.reportNearby` is asked at. A meeting ends when they part, so
   * walking away and back is a second one; what React makes of it is React's (the Sinauli wagon's
   * card comes once a journey).
   */
  reportBeside(): void {
    const now = new Set<string>();
    for (const { wanderer } of this.list) {
      const at = this.standing.get(wanderer.id);
      if (!at || !isAlongside(at, this.host.at)) continue;
      now.add(wanderer.id);
      if (this.beside.has(wanderer.id) && !wanderer.vehicle) continue;
      EventBus.emitEvent('wanderer-alongside', { id: wanderer.id, vehicle: wanderer.vehicle, at: this.host.at });
    }
    this.beside = now;
  }

  /**
   * Step a painted walk along while it moves. Every frame, from the scene's `update`, because a stride
   * on the half-second gate would read as a slide-show; only a wanderer painted walking and on the
   * move is touched, so the cost is a texture swap every `STEP_MS` for the one wagon.
   */
  animate(now: number): void {
    this.drive(now);
    this.wake?.update(now,this.list.find(p=>p.wanderer.id==='river-otter')?.sprite??null);
    for (const { wanderer, sprite } of this.list) {
      const go = this.going.get(wanderer.id);
      if (!go?.moving || !sprite.visible) continue;
      const steps = walkArt(wanderer.id, go.facing);
      if (steps.length === 0) continue;
      const step = Math.floor(now / WandererView.STEP_MS) % steps.length;
      const key = walkKey(wanderer.id, go.facing, step);
      if (sprite.texture.key === key || !this.scene.textures.exists(key)) continue;
      sprite.setTexture(key);
      this.size(wanderer, sprite);
    }
  }

  /**
   * Put each patrol where the scene's clock says, every frame: between two tiles while it rolls, so
   * it glides as the strait's ship does rather than jumping a tile at a time (`patrolAt`). Facing
   * and the walk follow its heading; a halt drops back to the still of the way it last faced.
   */
  private drive(now: number): void {
    let moved = false;
    for (const { wanderer, sprite } of this.list) {
      if (!wanderer.vehicle) continue;
      const where = patrolAt(this.host.world, wanderer, now / 1000);
      if (!where) {
        sprite.setVisible(false);
        this.standing.delete(wanderer.id);
        this.going.delete(wanderer.id);
        continue;
      }
      sprite.setVisible(true);
      sprite.setPosition(where.exact.x * TILE_SIZE + TILE_SIZE / 2, where.exact.y * TILE_SIZE + TILE_SIZE - 2);
      sprite.setDepth(depthFor(Math.round(where.exact.y), ROW_SLOT.walker));
      const was = this.standing.get(wanderer.id);
      if (!was || was.x !== where.at.x || was.y !== where.at.y) moved = true;
      this.standing.set(wanderer.id, where.at);
      const before = this.going.get(wanderer.id);
      if (where.heading) {
        const facing: Facing =
          where.heading === 'west' ? 'left' : where.heading === 'east' ? 'right' : where.heading === 'north' ? 'up' : 'down';
        this.going.set(wanderer.id, { facing, moving: true });
        if (!before?.moving || before.facing !== facing) {
          sprite.setTexture(this.texture(wanderer, facing));
          this.size(wanderer, sprite);
        }
      } else if (before?.moving || !before) {
        const facing = before?.facing ?? 'right';
        this.going.set(wanderer.id, { facing, moving: false });
        const still = this.texture(wanderer, facing);
        if (sprite.texture.key !== still) {
          sprite.setTexture(still);
          this.size(wanderer, sprite);
        }
      }
    }
    if (moved) this.reportBeside();
  }
}
