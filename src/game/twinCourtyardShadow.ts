import Phaser from 'phaser';
import { TILE_SIZE } from './tileTextures';
import type {Placement} from './scenePlan';

export const COURTYARD_SHADOW = 'twins:harappa-neem-shadow';
const MASK_WIDTH = 64;
const MASK_HEIGHT = 32;
const FOOT_X = 19;
const FOOT_Y = 8;
// Above the courtyard surfaces and roads, below row-sorted objects and actors.
const COURTYARD_SHADOW_DEPTH = 80;

type ShadowClass = NonNullable<Placement['twinShadow']>;
const SHADOW_STYLE = {
  contact:{width:22,flatten:.14,shear:0,alpha:.16},
  wall:{width:35,flatten:.19,shear:.16,alpha:.20},
  house:{width:36,flatten:.29,shear:.39,alpha:.23},
  outcrop:{width:32,flatten:.22,shear:.25,alpha:.22},
  tree:{width:38,flatten:.29,shear:.48,alpha:.26}
} as const;

/** Cache the source silhouette and projection at logical pixel scale. Only instances are culled. */
export function addTwinStaticShadow(scene: Phaser.Scene, source: Phaser.GameObjects.Image, kind: ShadowClass) {
  const style=SHADOW_STYLE[kind];
  const displayScale=Math.round(source.displayWidth/TILE_SIZE*8)/8;
  const frame=source.frame;
  const key=kind==='contact'?'twins:shadow:contact':
    `twins:shadow:${kind}:${source.texture.key}:${frame.name}:${displayScale}`;
  if(!scene.textures.exists(key)){
    const mask=scene.textures.createCanvas(key,MASK_WIDTH,MASK_HEIGHT);
    if(!mask)return null;
    const ctx=mask.getContext();
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#483b2c';
    for(let y=0;y<5;y++){
      const inset=Math.abs(2-y)*2;
      ctx.fillRect(FOOT_X-8+inset,FOOT_Y-1+y,16-inset*2,1);
    }
    if(kind!=='contact'){
      const w=Math.max(16,Math.min(style.width,Math.round(displayScale*32)));
      const h=Math.min(44, Math.round(source.displayHeight/TILE_SIZE*32));
      ctx.setTransform(1,.09,-style.shear,-style.flatten,FOOT_X-w/2+style.shear*h,FOOT_Y+style.flatten*h);
      ctx.drawImage(frame.source.image as CanvasImageSource,
        frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,w,h);
      ctx.resetTransform();
      ctx.globalCompositeOperation='source-in';
      ctx.fillRect(0,0,MASK_WIDTH,MASK_HEIGHT);
      ctx.globalCompositeOperation='source-over';
    }
    mask.refresh();
    mask.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return scene.add.image(source.x,source.y-12,key)
    .setOrigin(FOOT_X/MASK_WIDTH,FOOT_Y/MASK_HEIGHT)
    .setDisplaySize(TILE_SIZE*2,TILE_SIZE)
    .setAlpha(style.alpha)
    .setDepth(COURTYARD_SHADOW_DEPTH)
    .setName('twin-static-shadow');
}

/** Project the approved neem silhouette onto the courtyard once per texture manager. */
export function addCourtyardShadow(scene: Phaser.Scene, neem: Phaser.GameObjects.Image): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(COURTYARD_SHADOW)) {
    const mask = scene.textures.createCanvas(COURTYARD_SHADOW, MASK_WIDTH, MASK_HEIGHT);
    if (!mask) return null;

    const context = mask.getContext();
    const frame = neem.frame;
    context.imageSmoothingEnabled = false;
    // A 48px tree on the logical ground pixel grid, flattened and projected southeast.
    context.setTransform(.70, .09, -.50, -.28, 26.2, 19.28);
    context.drawImage(frame.source.image as CanvasImageSource,
      frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, 48, 48);
    context.resetTransform();
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = '#483b2c';
    context.fillRect(0, 0, MASK_WIDTH, MASK_HEIGHT);
    context.globalCompositeOperation = 'source-over';
    mask.refresh();
    mask.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  return scene.add.image(neem.x, neem.y - 12, COURTYARD_SHADOW)
    .setOrigin(FOOT_X / MASK_WIDTH, FOOT_Y / MASK_HEIGHT)
    .setDisplaySize(TILE_SIZE * 2, TILE_SIZE)
    .setAlpha(.28)
    .setDepth(COURTYARD_SHADOW_DEPTH)
    .setName(COURTYARD_SHADOW);
}
