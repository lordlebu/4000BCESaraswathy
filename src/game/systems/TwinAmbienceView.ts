import type Phaser from 'phaser';
import {planTwinAtmosphere,TWIN_RIPPLE_MS} from '../twinAtmosphere';
import {cloudTextureKey,TILE_SIZE} from '../tileTextures';
import type {FieldMapWorld} from '../../world/fieldMap';
import type {Point} from '../../world/types';

type Mark=Point&{sprite:Phaser.GameObjects.Image};

/** Tiny cached pixel textures and capped, camera-local quads. No full-screen pass or particle pool. */
export class TwinAmbienceView {
  private water:Mark[]=[];
  private haze:Mark[]=[];
  private smoke:Phaser.GameObjects.Image[]=[];
  private hearth:Point|null=null;
  private nextTick=0;
  private frame=-1;

  constructor(private scene:Phaser.Scene,built:FieldMapWorld,
    private seen:(p:Point)=>boolean,private enabled:boolean){
    if(!enabled)return;
    const plan=planTwinAtmosphere(built);this.hearth=plan.hearth;
    for(let frame=0;frame<3;frame++){
      const key=`twins-ripple-${frame}`;
      if(scene.textures.exists(key))continue;
      const g=scene.make.graphics({x:0,y:0},false);
      g.fillStyle(0xb6e2df,.65);
      g.fillRect(8+frame*4,4+frame*4,20,4);g.fillRect(32-frame*4,20-frame*4,16,4);
      g.generateTexture(key,64,32);g.destroy();
    }
    if(!scene.textures.exists('twins-cave-smoke')){
      const g=scene.make.graphics({x:0,y:0},false);
      g.fillStyle(0xabb1ad,.6);g.fillRect(4,4,20,12);g.fillRect(8,0,12,20);g.fillRect(0,8,28,8);
      g.generateTexture('twins-cave-smoke',32,24);g.destroy();
    }
    this.water=plan.ripples.map(p=>({...p,sprite:scene.add.image((p.x+.5)*TILE_SIZE,(p.y+.5)*TILE_SIZE,'twins-ripple-0')
      .setAlpha(.35).setDepth(62).setVisible(false)}));
    this.haze=plan.haze.map((p,i)=>({...p,sprite:scene.add.image((p.x+.5)*TILE_SIZE,(p.y+.5)*TILE_SIZE,cloudTextureKey(scene,i%6))
      .setTint(0xe2c6a1).setAlpha(.055).setDepth(1988).setVisible(false)}));
    if(this.hearth)for(let i=0;i<6;i++)this.smoke.push(scene.add.image(0,0,'twins-cave-smoke').setDepth(1990).setVisible(false));
    scene.events.once('shutdown',()=>this.destroy());
  }

  update(now:number):void{
    if(!this.enabled||now<this.nextTick)return;
    this.nextTick=now+200;
    const view=this.scene.cameras.main.worldView,margin=TILE_SIZE;
    const visible=(p:Point)=>this.seen(p)&&(p.x+.5)*TILE_SIZE>=view.x-margin&&(p.x+.5)*TILE_SIZE<=view.right+margin
      &&(p.y+.5)*TILE_SIZE>=view.y-margin&&(p.y+.5)*TILE_SIZE<=view.bottom+margin;
    const frame=Math.floor(now/TWIN_RIPPLE_MS)%3,changed=frame!==this.frame;this.frame=frame;
    for(const p of this.water){p.sprite.visible=visible(p);if(p.sprite.visible&&(changed||p.sprite.texture.key!==`twins-ripple-${frame}`))p.sprite.setTexture(`twins-ripple-${frame}`);}
    for(const [i,p] of this.haze.entries()){
      p.sprite.visible=visible(p);
      if(p.sprite.visible)p.sprite.setPosition(Math.round((p.x+.5)*TILE_SIZE+Math.sin(now/19000+i)*10),
        Math.round((p.y+.5)*TILE_SIZE+Math.cos(now/23000+i)*6));
    }
    const show=this.hearth&&visible(this.hearth);
    for(const [i,puff] of this.smoke.entries()){
      puff.visible=Boolean(show);if(!show)continue;
      const u=((now+i*8000/6)%8000)/8000;
      puff.setPosition(Math.round(((this.hearth!.x+.5)*TILE_SIZE+Math.sin(u*4+i)*12)/2)*2,
        Math.round(((this.hearth!.y+.75)*TILE_SIZE-u*128)/2)*2)
        .setAlpha(.32*(1-u)*Math.min(1,u*5)).setScale(.65+Math.floor(u*4)/4);
    }
  }

  report(){return {enabled:this.enabled,ripples:this.water.length,haze:this.haze.length,smoke:this.smoke.length,
    visibleRipples:this.water.filter(p=>p.sprite.visible).length,
    waterFrames:[...new Set(this.water.filter(p=>p.sprite.visible).map(p=>p.sprite.texture.key))],
    visibleHaze:this.haze.filter(p=>p.sprite.visible).length,visibleSmoke:this.smoke.filter(p=>p.visible).length};}

  destroy():void{
    for(const p of [...this.water,...this.haze])p.sprite.destroy();
    for(const p of this.smoke)p.destroy();
    this.water=[];this.haze=[];this.smoke=[];
  }
}
