import type Phaser from 'phaser';
import {beeduAt} from '../../content/beedu';
import type {World,Point} from '../../world/types';
import {EventBus} from '../EventBus';
import {TILE_SIZE} from '../tileTextures';
import {STRAIT_DEPTH,depthFor,ROW_SLOT} from '../frames';
interface Host{world:World;at:Point;seen(x:number,y:number):boolean;busy():boolean}
export class BeeduView{
 private body:Phaser.GameObjects.Image;
 private shadow:Phaser.GameObjects.Image;
 private sand:Phaser.GameObjects.Image;
 private near=false;
 private safe=true;
 private reported='';
 private reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 private readonly review=import.meta.env.DEV&&new URLSearchParams(window.location.search).get('beedu')==='show';
 private reviewStart:number|null=null;
 constructor(private scene:Phaser.Scene,private host:Host){
  this.body=scene.add.image(0,0,'twins-beedu',0).setDepth(STRAIT_DEPTH.air).setVisible(false).setName('flying-beedu');
  this.shadow=scene.add.image(0,0,'twins-beedu',0).setTint(0x393638).setAlpha(.22).setVisible(false).setName('beedu-shadow');
  this.sand=scene.add.image(0,0,'twins-stories',6).setVisible(false);
 }
 update(now:number):void{
  const elapsed=this.review ? now-(this.reviewStart??=now) : now;
  const pose=beeduAt(this.host.world,elapsed,this.reduced.matches,this.review);
  if(!pose){this.body.setVisible(false);this.shadow.setVisible(false);this.sand.setVisible(false);return;}
  const x=Math.floor(pose.x),y=Math.floor(pose.y),cx=pose.x*TILE_SIZE,cy=pose.y*TILE_SIZE;
  const view=this.scene.cameras.main.worldView;
  const visible=pose.state!=='hidden'&&this.host.seen(x,y)&&view.contains(cx,cy);
  const bodySeen=this.host.seen(x,Math.floor(pose.y-pose.height));
  this.body.setVisible(visible&&pose.alpha>0).setFrame(pose.frame)
    .setPosition(cx,cy-pose.height*TILE_SIZE).setAlpha(pose.alpha);
  this.shadow.setVisible(visible&&pose.alpha>0).setFrame(pose.frame)
    .setPosition(cx+TILE_SIZE*.18,cy).setScale(1-pose.height*.12,.4-pose.height*.05)
    .setAlpha(pose.alpha*(.3-pose.height*.06)).setDepth(depthFor(y,ROW_SLOT.underfoot));
  this.sand.setVisible(visible&&pose.sand>0).setPosition(cx,cy).setAlpha(pose.sand)
    .setDepth(depthFor(y,ROW_SLOT.underfoot));
  const near=visible&&bodySeen&&view.contains(cx,cy-pose.height*TILE_SIZE)&&pose.alpha>.5&&pose.height>.2&&Math.hypot(pose.x-this.host.at.x,pose.y-this.host.at.y)<7;
  const safe=!this.host.busy();
  if(near!==this.near||safe!==this.safe){this.near=near;this.safe=safe;EventBus.emitEvent('beedu-nearby',{near,safe});}
  if(near&&this.reported!==pose.flightId){this.reported=pose.flightId;EventBus.emitEvent('beedu-sighted',{flightId:pose.flightId});}
 }
 destroy():void{this.body.destroy();this.shadow.destroy();this.sand.destroy();EventBus.emitEvent('beedu-nearby',{near:false});}
}
