// A temporary camp as drawn on the map: its pieces round the fire, their shadows, the trodden way in
// from the road, the smoke and the firelight, the small lights a piece carries, and the cold ring a
// struck camp leaves for a few days.
//
// **The first system out of `WorldScene`** (`docs/retrospective.md`, what to do next, item 2;
// `docs/scaling-study.md` section 2). It moved as it was, with no change in behaviour: the scene
// keeps the camp's *people*, because they are travellers and the traveller code places them, and
// asks this class only what was pitched or struck so it can add or drop them. Where a camp is and
// what its day looks like are still `content/encampments.ts` and `content/campLife.ts`; this draws
// their answers.
//
// It reads the scene through `CampHost` rather than holding the scene's own fields, so what it
// depends on is written down in one place.

import Phaser from 'phaser';
import {
  FEATURE_SHEET,
  HUT_SHEET,
  PLACE_SHEET,
  SHADOW_TEXTURE,
  TILE_SIZE,
  TREE_SHEET,
  lampGlowKey
} from '../tileTextures';
import { FIRST_YURT, ROW_SLOT, depthFor, placeFrame } from '../frames';
import { campSpots, encampmentOn, wayIn, type Encampment, type WayIn } from '../../content/encampments';
import { campStage } from '../../content/campLife';
import {
  ASHES_DAYS,
  CAMP_FLAMES,
  CAMP_LAYOUT,
  CROSSED_COLOUR,
  CROSSED_GROUND,
  PRINTED_GROUND,
  YURT_ONE_IN,
  campKey,
  carriesTint,
  troddenColour
} from '../campArt';
import { walkedRoad } from '../../content/travellers';
import { biomeFor } from '../../content/species';
import { tileHash } from '../../world/rng';
import type { Point, World } from '../../world/types';

/** What the camp drawing reads of the scene. Live: a getter answers for the map shown now. */
export interface CampHost {
  readonly world: World;
  readonly fieldMapId: string;
  /** Tiles the fog has lifted from; a piece shows once its own tile is known. */
  readonly discovered: ReadonlySet<string>;
  /** Everything the scene drew on a tile, so the trees on a camp's ground can be cleared. */
  readonly tileOwned: readonly { sprite: Phaser.GameObjects.GameObject & { visible: boolean }; x: number; y: number }[];
  /** The painted ground, so the trodden way takes its colour. */
  readonly tileSprites: readonly (readonly Phaser.GameObjects.Image[])[];
  /** The depth lights draw at, over the night's tint. */
  readonly lightDepth: number;
  /** The depth smoke rises at: above the fog, so a camp not yet walked to shows from afar. */
  readonly smokeDepth: number;
  /** How strongly the lamps are lit now, 0 by day. */
  glow(): number;
}

/** Today's camp, as drawn. */
export interface DrawnCamp {
  id: string;
  key: string;
  camp: Encampment;
  sprites: Phaser.GameObjects.Image[];
  /** The shelter and its shadow, put up on the first morning and struck on the last afternoon. */
  shelter: Phaser.GameObjects.Image[];
  /** The trees cleared off the camp's own tiles while it stands, and the alpha each had. See `clearCampGround`. */
  cleared: { sprite: Phaser.GameObjects.Image; alpha: number }[];
  /** Firelight after dark, like a lamp's. */
  glow: Phaser.GameObjects.Image | null;
  /** The small flames the camp's pieces carry, lit with the fire. See `CAMP_FLAMES`. */
  lamps: { key: string; sprite: Phaser.GameObjects.Image }[];
  /** The way in from the road, and the trodden tiles drawn along it. See `drawTrodden`. */
  way: WayIn | null;
  trodden: { key: string; sprite: Phaser.GameObjects.Image }[];
  /** What the smoke was last set to, so an unchanged hour costs nothing. */
  smokeAt: string;
  /** Which tile each sprite stands on, so each shows once its own tile is known. */
  tiles: string[];
  smoke: Phaser.GameObjects.Particles.ParticleEmitter | null;
}

export class CampView {
  /** Today's camp, as drawn, or none. */
  current: DrawnCamp | null = null;
  /** Cold fire rings where camps struck in the last few days, by camp id. See `campArt.ts`. */
  private ashes = new Map<
    string,
    { key: string; sprite: Phaser.GameObjects.Image; trodden: { key: string; sprite: Phaser.GameObjects.Image }[] }
  >();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: CampHost
  ) {}

  /**
   * Today's camp, if one stands: its things round the fire and the trodden way in from the road,
   * each shown once its own tile is known, and the ashes of the last few.
   *
   * Says what changed, so the scene can add or drop the camp's people: they are drawn with the
   * travellers, not here.
   */
  draw(
    today: Encampment | null,
    places: readonly { poiId: string; at: Point }[],
    day: number,
    phase: number
  ): { struck: boolean; pitched: Encampment | null } {
    let struck = false;
    let pitched: Encampment | null = null;
    if (this.current && this.current.id !== today?.id) {
      for (const s of this.current.sprites) s.destroy();
      for (const c of this.current.cleared) c.sprite.setAlpha(c.alpha);
      this.current.smoke?.destroy();
      this.current.glow?.destroy();
      for (const l of this.current.lamps) l.sprite.destroy();
      // The way stays on the ground a few days, faded, with the ashes: `drawAshes` keeps it.
      for (const t of this.current.trodden) t.sprite.destroy();
      this.current = null;
      struck = true;
    }
    if (today && !this.current) {
      this.current = this.pitchCamp(today, places);
      pitched = today;
    }
    const camp = this.current;
    if (camp) {
      const known = this.host.discovered;
      camp.sprites.forEach((s, i) => s.setVisible(known.has(camp.tiles[i]!) || known.has(camp.key)));
      for (const t of camp.trodden) t.sprite.setVisible(known.has(t.key));
      this.stage(phase, day);
    }
    this.drawAshes(places, day, today);
    return { struck, pitched };
  }

  /**
   * A camp, drawn from its kind's own props round the old fire ring.
   *
   * **Every camp of a kind is not the same picture.** The seed for this camp chooses whether the
   * kind's own shelter stands or the old yurt does (`YURT_ONE_IN`), and which way round the things
   * about the fire are set. The ring is the one the camp was always drawn with; the owner asked for
   * the generic camp art to be kept, and this is where it lives now.
   *
   * **The smoke is what tells you it is there.** A thin column over the fire, drawn above the fog,
   * so a camp nobody has walked to yet can still be seen from across the map -- the way open games
   * telegraph a campfire. Nothing pops up to announce it. How thick it is follows the camp's day
   * (`campStage`).
   */
  private pitchCamp(camp: Encampment, places: readonly { poiId: string; at: Point }[]): DrawnCamp {
    const roll = tileHash(this.host.world.seed, camp.at.x, camp.at.y, `camp:${camp.id}`);
    const layout = CAMP_LAYOUT[camp.kind];
    const foot = (at: Point) => ({ x: at.x * TILE_SIZE + TILE_SIZE / 2, y: at.y * TILE_SIZE + TILE_SIZE - 6 });
    const sprites: { img: Phaser.GameObjects.Image; at: Point }[] = [];
    const lamps: { key: string; sprite: Phaser.GameObjects.Image }[] = [];
    const piece = (key: string, frame: number | undefined, at: Point, slot: number, scale = 1, shadow = true) => {
      const { x, y } = foot(at);
      const depth = depthFor(at.y, ROW_SLOT.marker) + slot;
      const img = (frame === undefined ? this.scene.add.image(x, y, key) : this.scene.add.image(x, y, key, frame))
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(depth);
      const made = [img];
      // A shadow under anything that stands, laid before the piece in the list as well as in depth.
      // A fold or a fire ring lies flat on the ground and casts none. See `castUnder`.
      if (shadow) {
        for (const under of this.castUnder(img, at)) {
          sprites.push({ img: under, at });
          made.push(under);
        }
      }
      sprites.push({ img, at });
      const flame = this.flameOn(img, at);
      if (flame) lamps.push(flame);
      return made;
    };

    // **Spread over the tiles round the fire, not stacked on one.** The first cut put every piece
    // on the camp's own tile and the owner read it at once: everything bundled together, cramped.
    // `campSpots` lays them out -- the fire keeps the camp's tile, the shelter stands behind it and
    // the other things to either side, in a seeded order -- and it is the same rule `campLife.ts`
    // keeps the camp's people off these tiles with, so nobody stands inside the tent.
    const { around } = campSpots(this.host.world, camp);
    const spot = (n: number): Point => around[n] ?? camp.at;

    if (layout.ground !== null) piece(campKey(camp.kind, layout.ground), undefined, camp.at, -1, 1, false);
    const ring = placeFrame('', 'travel_node');
    if (ring !== null) piece(PLACE_SHEET, ring, camp.at, 1, 0.6, false);
    // About one camp in three is pitched round the old yurt instead of the kind's own shelter.
    const yurt = Math.floor(roll / 7) % YURT_ONE_IN === 0;
    const shelter = yurt
      ? piece(HUT_SHEET, FIRST_YURT, spot(0), 2)
      : piece(campKey(camp.kind, layout.shelter), undefined, spot(0), 2);
    layout.extras.forEach((n, i) => piece(campKey(camp.kind, n), undefined, spot(i + 1), 2));

    for (const s of sprites) s.img.setName(`camp:${camp.kind}`);
    const cleared = this.clearCampGround(camp, sprites.map((s) => s.at));
    for (const s of shelter) s.setName(`camp-shelter:${camp.kind}`);
    const fire = foot(camp.at);
    const glow = this.scene.add
      .image(fire.x, fire.y - 10, lampGlowKey(this.scene))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.host.lightDepth)
      .setScale(1.6)
      .setAlpha(0)
      .setName('camp-glow');
    const way = wayIn(this.host.world, camp, walkedRoad(this.host.world, this.host.fieldMapId, places), places.map((p) => p.at));
    return {
      id: camp.id,
      key: `${camp.at.x},${camp.at.y}`,
      camp,
      sprites: sprites.map((s) => s.img),
      tiles: sprites.map((s) => `${s.at.x},${s.at.y}`),
      shelter,
      cleared,
      glow,
      lamps,
      way,
      trodden: this.drawTrodden(camp, way, 0.75, lamps),
      smokeAt: '',
      smoke: this.campSmoke(fire.x, fire.y - 30)
    };
  }

  /**
   * The way in, worn into the ground: a few dabs of bare earth on each tile from the road to the
   * fire, and the camp's own small marker where it leaves the road.
   *
   * **It shows the way and changes nothing about walking it.** The owner's ruling (Q3 of the Living
   * Camps plan): the walk through the wild is the point, so a trodden tile costs what its ground
   * costs. Drawn under everything that stands, and shown tile by tile as the fog lifts. While the
   * camp stands it is plain; for the few days the ashes lie, faint.
   */
  private drawTrodden(
    camp: Encampment,
    way: WayIn | null,
    alpha: number,
    lamps: { key: string; sprite: Phaser.GameObjects.Image }[] = []
  ): { key: string; sprite: Phaser.GameObjects.Image }[] {
    if (!way) return [];
    // Both drawn white and tinted per tile by `troddenColour`, so the way is the ground's own colour.
    if (!this.scene.textures.exists('camp-prints')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      const dabs = [
        [10, 14, 7, 4],
        [24, 8, 6, 3],
        [36, 18, 8, 4],
        [50, 10, 6, 3],
        [18, 26, 6, 3],
        [44, 28, 7, 3]
      ];
      for (const [x, y, rx, ry] of dabs) {
        g.fillStyle(0xffffff, 0.85);
        g.fillEllipse(x!, y!, rx! * 2, ry! * 2);
      }
      g.generateTexture('camp-prints', 60, 36);
      g.destroy();
    }
    // **Three treatments, by the ground, each coloured from the tile under it** (`troddenColour`,
    // `groundColourAt`) -- the owner's notes on the first cut, a brown line that sat on top of grass
    // and snow alike. Mud, snow and sand take footprints. Dry ground takes what a footpath through
    // grass actually is: a thin, faint line, drawn as a half-strip from each tile's middle toward each
    // neighbour on the way, so the halves meet and the line runs unbroken from the road to the fire.
    // Water, mountain and the like take the same line in one pale colour, barely there.
    if (!this.scene.textures.exists('camp-worn')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      // Soft-edged: three bands, faint outside to firm in the middle, and a round end at the tile's
      // centre so a bend joins without a notch.
      for (const [inset, a] of [[0, 0.3], [2, 0.55], [4, 0.8]] as const) {
        g.fillStyle(0xffffff, a);
        g.fillRect(6, inset, 58, 12 - inset * 2);
        g.fillCircle(6, 6, 6 - inset);
      }
      g.generateTexture('camp-worn', 64, 12);
      g.destroy();
    }
    const out: { key: string; sprite: Phaser.GameObjects.Image }[] = [];
    const tiles = way.tiles;
    // The colour the line last had on ordinary ground, carried over the rails, the ropes and the sky
    // pool (`carriesTint`). Worn earth until the way has crossed any.
    let carried = 0x8c7a58;
    // Not the road tile it leaves from, and not the fire's own tile.
    for (let i = 1; i < tiles.length - 1; i++) {
      const p = tiles[i]!;
      const key = `${p.x},${p.y}`;
      const shown = this.host.discovered.has(key);
      const cx = p.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = p.y * TILE_SIZE + TILE_SIZE / 2;
      const depth = depthFor(p.y, ROW_SLOT.underfoot);
      const ground = this.host.world.tiles[p.y]![p.x]!;
      const biome = ground.biome;
      // Over the rails, ropes and sky pool, the grass line in the colour it already had.
      const carries = carriesTint(ground);
      const printed = !carries && PRINTED_GROUND.has(biome);
      // Over a river, mountain and the like, one neutral colour and barely there: see `CROSSED_GROUND`.
      const crossed = !carries && CROSSED_GROUND.has(biome);
      const tint = carries
        ? carried
        : crossed
          ? CROSSED_COLOUR
          : troddenColour(this.groundColourAt(p) ?? biomeFor(biome)?.color ?? '#8a7a5a', printed);
      if (!carries && !crossed && !printed) carried = tint;
      if (printed) {
        const sprite = this.scene.add
          .image(cx, cy, 'camp-prints')
          .setTint(tint)
          .setDisplaySize(TILE_SIZE * 0.9, TILE_SIZE * 0.54)
          .setAlpha(alpha)
          .setDepth(depth)
          .setVisible(shown)
          .setName('camp-trodden');
        out.push({ key, sprite });
        continue;
      }
      for (const n of [tiles[i - 1]!, tiles[i + 1]!]) {
        const sprite = this.scene.add
          .image(cx, cy, 'camp-worn')
          .setOrigin(6 / 64, 0.5)
          .setDisplaySize(TILE_SIZE / 2 + 6, TILE_SIZE * 0.16)
          .setRotation(Math.atan2(n.y - p.y, n.x - p.x))
          .setTint(tint)
          // Fainter than the prints: worn grass is a change of colour, not a mark on top of it. Fainter
          // still over ground nobody wears a path into.
          .setAlpha(alpha * (crossed ? 0.22 : 0.6))
          .setDepth(depth)
          .setVisible(shown)
          .setName('camp-trodden');
        out.push({ key, sprite });
      }
    }
    // The marker: the kind's own smallest thing, set down on the first tile off the road.
    const first = way.tiles[1];
    const layout = CAMP_LAYOUT[camp.kind];
    const mark = layout.extras[layout.extras.length - 1];
    if (first && mark !== undefined && alpha >= 0.5) {
      const sprite = this.scene.add
        .image(first.x * TILE_SIZE + TILE_SIZE / 2, first.y * TILE_SIZE + TILE_SIZE - 6, campKey(camp.kind, mark))
        .setOrigin(0.5, 1)
        .setScale(0.45)
        .setDepth(depthFor(first.y, ROW_SLOT.marker))
        .setVisible(this.host.discovered.has(`${first.x},${first.y}`))
        .setName('camp-turnoff');
      for (const under of this.castUnder(sprite, first)) {
        out.push({ key: `${first.x},${first.y}`, sprite: under.setVisible(sprite.visible).setName('camp-turnoff-shade') });
      }
      out.push({ key: `${first.x},${first.y}`, sprite });
      // The pilgrims' cairn keeps its lamp lit at the turn-off too: a light by the road after dark.
      const flame = this.flameOn(sprite, first);
      if (flame) lamps.push(flame);
    }
    return out;
  }

  /** The painted tiles' average colours, by texture and frame. See `groundColourAt`. */
  private groundColours = new Map<string, number | null>();
  /** Where each camp piece meets the ground, read from its pixels once. See `footprintOf`. */
  private footprints = new Map<string, { bottom: number; left: number; right: number }>();

  /**
   * The average colour of the painted tile at this point, read from its own pixels: a five by five
   * grid of samples across the frame, ignoring anything transparent. Cached per picture, since the
   * same crop of grass is drawn on many tiles. Null when the texture cannot be read.
   */
  /**
   * Where a piece of art actually stands: the bottom of what is painted, and how wide it is there.
   *
   * The camp props are cut from painted sheets with uneven margins -- up to thirteen clear pixels
   * under a tent, none under a pack -- so the image's own bottom edge is not the ground. Read once per
   * texture from the pixels and kept. Width is taken over the lowest eighth of the figure, the part
   * that touches the ground, not the widest part: a hide rack's poles splay above its feet.
   */
  private footprintOf(img: Phaser.GameObjects.Image): { bottom: number; left: number; right: number } {
    const id = `${img.texture.key}#${img.frame.name}`;
    const had = this.footprints.get(id);
    if (had) return had;
    const { width, height, cutX, cutY } = img.frame;
    const whole = { bottom: height - 1, left: 0, right: width - 1 };
    let found = whole;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const source = img.frame.source.image as CanvasImageSource;
      if (ctx) {
        ctx.drawImage(source, cutX, cutY, width, height, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;
        const solid = (x: number, y: number) => data[(y * width + x) * 4 + 3]! > 48;
        let top = -1;
        let bottom = -1;
        for (let y = 0; y < height && top < 0; y++) for (let x = 0; x < width; x++) if (solid(x, y)) { top = y; break; }
        for (let y = height - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < width; x++) if (solid(x, y)) { bottom = y; break; }
        if (top >= 0 && bottom >= top) {
          const band = Math.max(3, Math.round((bottom - top) / 8));
          let left = width;
          let right = -1;
          for (let y = bottom - band; y <= bottom; y++) {
            for (let x = 0; x < width; x++) {
              if (!solid(x, y)) continue;
              left = Math.min(left, x);
              right = Math.max(right, x);
            }
          }
          if (right >= left) found = { bottom, left, right };
        }
      }
    } catch {
      // A texture the canvas cannot read: the whole image is the footprint, as it was before.
    }
    this.footprints.set(id, found);
    return found;
  }

  /**
   * The shadow under a camp piece, sized to where the piece meets the ground.
   *
   * **Two layers, as a painter shades a thing standing in daylight.** A broad, soft one -- the light
   * the piece keeps off the ground round it -- and a narrow, darker one along the very line it
   * touches, which is what stops a tent reading as a sticker. The first cut was one ellipse the
   * width of the whole image and centred two pixels above an edge that was not the ground: on the
   * tents it hung below the canvas as a separate grey disc, and on the narrow pieces it was a smear
   * wider than the thing it belonged to.
   *
   * Both are placed from `footprintOf`, so the base sits *in* its shadow rather than above it. The
   * colour and the texture are the world's contact shade, and the depth is its slot: on the ground,
   * under the piece and anything else standing on that row.
   */
  private castUnder(img: Phaser.GameObjects.Image, at: Point): Phaser.GameObjects.Image[] {
    const { bottom, left, right } = this.footprintOf(img);
    const scale = img.scaleX;
    const ground = img.y - (img.frame.height - 1 - bottom) * scale;
    const cx = img.x + ((left + right) / 2 - img.frame.width / 2) * scale;
    const base = Math.max(12, (right - left + 1) * scale);
    const depth = depthFor(at.y, ROW_SLOT.underfoot) + 0.6;
    // **Tucked under the base, never in front of it.** The second cut centred the soft layer just in
    // front of the base line, and the owner read it at once: a shadow that starts below the art makes
    // the art float above it. Both layers are centred *above* the line, so the darkest part of each is
    // hidden behind the piece where it meets the ground, and only the soft fringe shows -- a few pixels
    // in front and out at the sides. Capped in depth, so a wide tent does not throw a pool.
    const soft = Math.min(34, Math.max(10, base * 0.2));
    const core = Math.min(12, Math.max(5, base * 0.08));
    return [
      this.scene.add.image(cx, ground - soft * 0.3, SHADOW_TEXTURE).setDisplaySize(base * 1.1, soft).setDepth(depth),
      this.scene.add.image(cx, ground - core * 0.3, SHADOW_TEXTURE).setDisplaySize(base * 0.92, core).setDepth(depth + 0.1)
    ];
  }

  /**
   * A camp is pitched in a clearing, so nothing tall stands on the ground it uses.
   *
   * Forest is never camp ground (`campable`), but open ground still carries the odd lone tree, and
   * one on the fire's tile or under the tent put the camp back in the woods. While the camp stands,
   * any standing feature round the fire or on a tile the camp uses -- and the contact shade under it --
   * is faded out, and put back exactly as it was when the camp is struck. Faded rather than hidden,
   * because the cull owns `visible` and resets it as the camera moves.
   */
  private clearCampGround(camp: Encampment, tiles: readonly Point[]): { sprite: Phaser.GameObjects.Image; alpha: number }[] {
    const used = new Set(tiles.map((p) => `${p.x},${p.y}`));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) used.add(`${camp.at.x + dx},${camp.at.y + dy}`);
    const tall = new Set([TREE_SHEET, FEATURE_SHEET, SHADOW_TEXTURE]);
    const out: { sprite: Phaser.GameObjects.Image; alpha: number }[] = [];
    for (const owned of this.host.tileOwned) {
      if (!used.has(`${owned.x},${owned.y}`)) continue;
      const sprite = owned.sprite as Phaser.GameObjects.Image;
      if (!sprite.texture || !tall.has(sprite.texture.key)) continue;
      out.push({ sprite, alpha: sprite.alpha });
      sprite.setAlpha(0);
    }
    return out;
  }

  private groundColourAt(p: Point): number | null {
    const img = this.host.tileSprites[p.y]?.[p.x];
    if (!img) return null;
    const key = img.texture.key;
    const frame = img.frame.name;
    const id = `${key}#${frame}`;
    if (this.groundColours.has(id)) return this.groundColours.get(id)!;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    const { width, height } = img.frame;
    for (let i = 1; i <= 5; i++) {
      for (let j = 1; j <= 5; j++) {
        const c = this.scene.textures.getPixel(Math.floor((width * i) / 6), Math.floor((height * j) / 6), key, frame);
        if (!c || c.alpha === 0) continue;
        r += c.red;
        g += c.green;
        b += c.blue;
        n++;
      }
    }
    const colour = n > 0 ? (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n) : null;
    this.groundColours.set(id, colour);
    return colour;
  }

  /** A soft grey puff, made once, and a slow column of them over the fire. */
  private campSmoke(x: number, y: number): Phaser.GameObjects.Particles.ParticleEmitter | null {
    if (!this.scene.textures.exists('camp-smoke')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      for (let r = 16; r > 0; r -= 2) {
        g.fillStyle(0x8f8a84, 0.12);
        g.fillCircle(16, 16, r);
      }
      g.generateTexture('camp-smoke', 32, 32);
      g.destroy();
    }
    return this.scene.add
      .particles(x, y, 'camp-smoke', {
        speedY: { min: -60, max: -42 },
        speedX: { min: -5, max: 9 },
        lifespan: 7600,
        scale: { start: 1.2, end: 4.2 },
        alpha: { start: 0.9, end: 0.05 },
        frequency: 260,
        quantity: 1
      })
      .setDepth(this.host.smokeDepth)
      .setName('camp-smoke');
  }

  /**
   * The camp's look for the hour: the shelter up or struck, the smoke thick or a thread, the
   * firelight with the dark. `campStage` decides; this only draws it.
   */
  stage(phase: number, day: number): void {
    const camp = this.current;
    if (!camp) return;
    const stage = campStage(camp.camp, day, phase);
    const shelterKnown = camp.shelter.length > 0;
    for (const s of camp.shelter) {
      const i = camp.sprites.indexOf(s);
      const known = i >= 0 && (this.host.discovered.has(camp.tiles[i]!) || this.host.discovered.has(camp.key));
      s.setVisible(stage.shelterUp && known && shelterKnown);
    }
    const smoke = stage.smoke;
    if (smoke !== camp.smokeAt) {
      camp.smokeAt = smoke;
      camp.smoke?.setFrequency(smoke === 'thick' ? 150 : smoke === 'thread' ? 900 : 260);
    }
    camp.glow?.setVisible(this.host.discovered.has(camp.key)).setAlpha(Math.max(0, this.host.glow()));
    for (const l of camp.lamps) l.sprite.setVisible(this.host.discovered.has(l.key)).setAlpha(Math.max(0, this.host.glow()));
  }

  /**
   * The light of a flame painted on a camp piece, if it has one (`CAMP_FLAMES`): the street lamps'
   * pool of light, smaller, over the night's tint, and dark by day like theirs.
   */
  private flameOn(img: Phaser.GameObjects.Image, at: Point): { key: string; sprite: Phaser.GameObjects.Image } | null {
    const flame = CAMP_FLAMES[img.texture.key];
    if (!flame) return null;
    const scale = img.scaleX;
    const x = img.x + (flame.x - img.frame.width / 2) * scale;
    const y = img.y - (img.frame.height - flame.y) * scale;
    const sprite = this.scene.add
      .image(x, y, lampGlowKey(this.scene))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.host.lightDepth)
      .setScale(0.55 * Math.max(0.6, scale))
      .setAlpha(Math.max(0, this.host.glow()))
      .setVisible(false)
      .setName('camp-lamp');
    return { key: `${at.x},${at.y}`, sprite };
  }

  /**
   * Where a camp stood in the last `ASHES_DAYS` days and has struck: its ring, cold and grey, and
   * the way in, faint, once those tiles are known. What a camp leaves behind when it moves on.
   */
  private drawAshes(places: readonly { poiId: string; at: Point }[], day: number, today: Encampment | null): void {
    const want = new Map<string, Encampment>();
    for (let k = 1; k <= ASHES_DAYS; k++) {
      const was = encampmentOn(this.host.world, this.host.fieldMapId, places, day - k);
      if (was && was.id !== today?.id && was.to <= day) want.set(was.id, was);
    }
    for (const [id, a] of this.ashes) {
      if (!want.has(id)) {
        a.sprite.destroy();
        for (const t of a.trodden) t.sprite.destroy();
        this.ashes.delete(id);
      }
    }
    const ring = placeFrame('', 'travel_node');
    for (const [id, was] of want) {
      if (this.ashes.has(id) || ring === null) continue;
      const sprite = this.scene.add
        .image(was.at.x * TILE_SIZE + TILE_SIZE / 2, was.at.y * TILE_SIZE + TILE_SIZE, PLACE_SHEET, ring)
        .setOrigin(0.5, 1)
        .setScale(0.6)
        .setTint(0x8a8580)
        .setAlpha(0.6)
        .setDepth(depthFor(was.at.y, ROW_SLOT.marker))
        .setName('camp-ashes');
      const way = wayIn(this.host.world, was, walkedRoad(this.host.world, this.host.fieldMapId, places), places.map((p) => p.at));
      this.ashes.set(id, { key: `${was.at.x},${was.at.y}`, sprite, trodden: this.drawTrodden(was, way, 0.3) });
    }
    for (const a of this.ashes.values()) {
      a.sprite.setVisible(this.host.discovered.has(a.key));
      for (const t of a.trodden) t.sprite.setVisible(this.host.discovered.has(t.key));
    }
  }
}
