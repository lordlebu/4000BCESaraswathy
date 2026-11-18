import type Phaser from 'phaser';
import type {World} from '../../world/types';
import {rippleKey,TILE_SIZE} from '../tileTextures';
import {otterWakeStep,OTTER_WAKE_LIMIT,OTTER_WAKE_MS,type WakePosition} from '../otterWake';

/** Reuses the accepted wading/boat ripple, with a fixed pool and no new art or redraw pass. */
export class OtterWakeView {
  private marks:{sprite:Phaser.GameObjects.Image;born:number;x:number;y:number}[]=[];
  private last:WakePosition|null=null;
  private next=0;private cursor=0;private emitted=0;
  constructor(private scene:Phaser.Scene,private world:World,private seen:(x:number,y:number)=>boolean){
    for(let i=0;i<OTTER_WAKE_LIMIT;i++)this.marks.push({sprite:scene.add.image(0,0,rippleKey(scene)).setDepth(63).setVisible(false),born:-Infinity,x:0,y:0});
    scene.events.once('shutdown',()=>{for(const m of this.marks)m.sprite.destroy();this.marks=[];});
  }
  update(now:number,otter:Phaser.GameObjects.Image|null):void{
    const view=this.scene.cameras.main.worldView;
    const visible=(x:number,y:number)=>this.seen(Math.floor(x/TILE_SIZE),Math.floor((y-2)/TILE_SIZE))
      &&x>=view.x-64&&x<=view.right+64&&y>=view.y-64&&y<=view.bottom+64;
    for(const mark of this.marks){
      const age=(now-mark.born)/OTTER_WAKE_MS;
      mark.sprite.setVisible(age>=0&&age<1&&visible(mark.x,mark.y));
      if(mark.sprite.visible)mark.sprite.setAlpha(.38*(1-age)).setDisplaySize(30+age*18,9+age*5);
    }
    if(!otter?.visible){this.last=null;return;}
    const point={x:otter.x,y:otter.y};
    if(!visible(point.x,point.y)){this.last=point;return;}
    if(!this.last){this.last=point;return;}
    const distance=Math.hypot(point.x-this.last.x,point.y-this.last.y);
    if(distance<6)return;
    if(now>=this.next&&otterWakeStep(this.world,this.last,point)){
      const mark=this.marks[this.cursor++%this.marks.length]!;
      const dx=point.x-this.last.x,dy=point.y-this.last.y;
      const tail=(Math.abs(dx)>Math.abs(dy)?otter.displayWidth:otter.displayHeight)*.5;
      mark.x=this.last.x-dx/distance*tail;
      mark.y=this.last.y-otter.displayHeight*.45-dy/distance*tail;mark.born=now;
      mark.sprite.setPosition(mark.x,mark.y).setVisible(true).setAlpha(.38).setDisplaySize(30,9);
      this.emitted++;this.next=now+160;
    }
    this.last=point;
  }
  report(){return {pool:this.marks.length,visible:this.marks.filter(m=>m.sprite.visible).length,emitted:this.emitted};}
}
