// The homestead as drawn on the map: the mill going up beside its ground in two unfinished stages,
// then the map's own finished building -- tower, turning wheel, house and perhaps one small thing
// more -- or, on a map with none of its own, the Grit Mill and the greenhouse.
//
// **The third system out of `WorldScene`**, after `CampView.ts` and `WandererView.ts`, and moved the
// same way: as it was, with no change in behaviour. Every rule about settling is
// `content/homestead.ts`; React decides the stage and sends it as `homestead-changed`; this draws it.
// The builder's manifest and the art it names live here too, because nothing else reads them.

import Phaser from 'phaser';
import stageOneUrl from '../../../assets/windmill-stage-1.png';
import stageTwoUrl from '../../../assets/windmill-stage-2.png';
import greenhouseUrl from '../../../assets/greenhouse.png';
import windmillManifest from '../../../assets/windmill.json';
import homesteadManifest from '../../../assets/homestead.json';
import windpumpTowerUrl from '../../../assets/windpump-tower.png';
import windpumpVanesUrl from '../../../assets/windpump-vanes.png';
import stillHouseUrl from '../../../assets/still-house.png';
import scarpMillTowerUrl from '../../../assets/scarp-mill-tower.png';
import scarpMillSailsUrl from '../../../assets/scarp-mill-sails.png';
import apiaryUrl from '../../../assets/apiary.png';
import { BLADE_SHEET, TILE_SIZE, WINDMILL_SHEET } from '../tileTextures';
import { BLADE_PERIOD, ROW_SLOT, depthFor } from '../frames';
import { buildable, buildingTiles } from '../../content/homestead';
import type { UiToGame } from '../EventBus';
import type { FieldMapWorld } from '../../world/fieldMap';
import type { World } from '../../world/types';

/**
 * A map's own finished building, from `tools/build-homestead.js`: a tower, a wheel turned at build
 * time, a house beside it and perhaps one small thing more. Maps without one -- Lothal -- finish with
 * the Grit Mill's tower and wheel and the greenhouse. The names are the builder's; the URLs are here
 * because Vite has to see each import.
 */
export interface FinishedBuilding {
  tower: string;
  wheel: string;
  house: string;
  extra?: string;
  blade: number;
  steps: number;
  small: number;
  /** The tower's cell in pixels. Not always a tile wide: Dwarka's pump splays its guy ropes. */
  cell: { width: number; height: number };
  boss: { x: number; y: number };
  /** When the tower carries moving water, it is a sheet of this many frames. Dwarka's pump. */
  water?: { frames: number };
}
/**
 * One loop of the pump's water, in milliseconds: six frames at 120 each. Quicker than the wheel,
 * because water falls faster than a vane turns -- and slow enough that the glint is followed down
 * the spout rather than seen as a flicker.
 */
const WATER_PERIOD = 720;
const FINISHED = (homesteadManifest as { finished?: Record<string, FinishedBuilding> }).finished ?? {};
const HOMESTEAD_ART: Record<string, string> = {
  'windpump-tower': windpumpTowerUrl,
  'windpump-vanes': windpumpVanesUrl,
  'still-house': stillHouseUrl,
  'scarp-mill-tower': scarpMillTowerUrl,
  'scarp-mill-sails': scarpMillSailsUrl,
  apiary: apiaryUrl
};
/** The texture a homestead piece is loaded under. The greenhouse is the one every map may share. */
const homesteadKey = (name: string) => (name === 'greenhouse' ? 'homestead-greenhouse' : `homestead-${name}`);

/** Load every map's homestead art, for the reason the character sheets are all loaded. Called from `preload`. */
export function loadHomesteadArt(scene: Phaser.Scene): void {
  // The homestead's unfinished mill and its greenhouse: single images, drawn only once built.
  scene.load.image('homestead-stage-1', stageOneUrl);
  scene.load.image('homestead-stage-2', stageTwoUrl);
  scene.load.image('homestead-greenhouse', greenhouseUrl);
  // And every map's finished building, for the reason the character sheets are all loaded.
  for (const f of Object.values(FINISHED)) {
    const towerUrl = HOMESTEAD_ART[f.tower];
    if (towerUrl && f.water) {
      scene.load.spritesheet(homesteadKey(f.tower), towerUrl, { frameWidth: f.cell.width, frameHeight: f.cell.height });
    } else if (towerUrl) scene.load.image(homesteadKey(f.tower), towerUrl);
    for (const name of [f.house, f.extra]) {
      if (name && HOMESTEAD_ART[name]) scene.load.image(homesteadKey(name), HOMESTEAD_ART[name]);
    }
    const wheel = HOMESTEAD_ART[f.wheel];
    if (wheel) scene.load.spritesheet(homesteadKey(f.wheel), wheel, { frameWidth: f.blade, frameHeight: f.blade });
  }
}

/** Something that turns on an index rather than a toggle: a mill's wheel, a pump's water. */
export interface Turning {
  sprite: Phaser.GameObjects.Image;
  frames: number;
  period: number;
  phase: number;
}

/** What the homestead reads of the scene. Live: a getter answers for the map shown now. */
export interface HomesteadHost {
  readonly world: World;
  readonly built: FieldMapWorld | null;
  /** Set this turning with the scene's other wheels. */
  turn(item: Turning): void;
  /** Stop turning these sprites: they are about to be destroyed. */
  stopTurning(sprites: readonly Phaser.GameObjects.Image[]): void;
}

export class HomesteadView {
  /** What the homestead draws now. */
  sprites: Phaser.GameObjects.Image[] = [];
  /** What React last asked for. */
  private wanted: UiToGame['homestead-changed'] = { poiId: null, stage: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: HomesteadHost
  ) {}

  /** The homestead, from React. Drawn at once and kept for a redraw. */
  set(wanted: UiToGame['homestead-changed']): void {
    this.wanted = wanted;
    this.draw();
  }

  /**
   * The mill going up beside its ground, and the greenhouse once it stands.
   *
   * **Beside the place, never on it** -- `buildingTiles` picks two walkable tiles in the place's
   * forecourt, which the scene plan keeps clear, so the trees beyond it frame the mill rising over
   * the canopy. Stage one and two are the unfinished sprites from `tools/build-homestead.js`; the
   * third is the Grit Mill's own tower and wheel, turning on the same clock, and the greenhouse.
   */
  draw(): void {
    for (const sprite of this.sprites) sprite.destroy();
    this.host.stopTurning(this.sprites);
    this.sprites = [];
    const { poiId, stage } = this.wanted;
    if (!this.host.built || !poiId || stage <= 0) return;
    const at = this.host.built.placed.find((p) => p.poi.id === poiId)?.at;
    if (!at) return;
    const tiles = buildingTiles(this.host.world, at, this.host.built.placed.map((p) => p.at));
    if (!tiles) return;

    const standing = (key: string, tile: { x: number; y: number }, frame?: number) => {
      const sprite = this.scene.add
        .image(tile.x * TILE_SIZE + TILE_SIZE / 2, tile.y * TILE_SIZE + TILE_SIZE, key, frame)
        .setOrigin(0.5, 1)
        .setDepth(depthFor(tile.y, ROW_SLOT.marker));
      sprite.setName(`homestead:${key}`);
      this.sprites.push(sprite);
      return sprite;
    };

    if (stage === 1) standing('homestead-stage-1', tiles.mill);
    else if (stage === 2) standing('homestead-stage-2', tiles.mill);
    else {
      // This map's own building if the builder made one, otherwise the Grit Mill's.
      const own = FINISHED[this.host.built.fieldMap.id];
      const tower = own ? homesteadKey(own.tower) : WINDMILL_SHEET;
      const wheelKey = own ? homesteadKey(own.wheel) : BLADE_SHEET;
      const boss = own?.boss ?? windmillManifest.boss;
      const cell = own?.cell ?? windmillManifest.tower;
      const towerSprite = standing(tower, tiles.mill, own && !own.water ? undefined : 0);
      if (own?.water) this.host.turn({ sprite: towerSprite, frames: own.water.frames, period: WATER_PERIOD, phase: 0 });
      // The wheel on the tower's boss. Sprites draw at their own pixel size, bottom-centred on the
      // tile, so the boss is an offset in the cell's pixels from the tile's bottom centre -- the
      // same place the scene plan's formula puts the Grit Mill's, for a cell of any width.
      const cx = tiles.mill.x * TILE_SIZE + TILE_SIZE / 2;
      const bottom = (tiles.mill.y + 1) * TILE_SIZE;
      const wheel = this.scene.add
        .image(cx + (boss.x - 0.5) * cell.width, bottom - (1 - boss.y) * cell.height, wheelKey, 0)
        .setDepth(depthFor(tiles.mill.y, ROW_SLOT.marker) + 1);
      wheel.setName(own ? `homestead:${wheelKey}` : 'homestead:blades');
      this.sprites.push(wheel);
      this.host.turn({ sprite: wheel, frames: own?.steps ?? windmillManifest.steps, period: BLADE_PERIOD, phase: 0 });
      standing(own ? homesteadKey(own.house) : 'homestead-greenhouse', tiles.greenhouse);
      // One small thing more -- the Narmada's hive -- on the mill's other side, if that is ground a
      // thing may stand on. Half a tile, so it reads as smaller than the buildings.
      if (own?.extra) {
        const side = tiles.greenhouse.x >= tiles.mill.x ? -1 : 1;
        const spot = { x: tiles.mill.x + side, y: tiles.mill.y };
        if (buildable(this.host.world, spot)) standing(homesteadKey(own.extra), spot);
      }
    }
  }
}
