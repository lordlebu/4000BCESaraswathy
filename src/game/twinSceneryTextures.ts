import Phaser from 'phaser';
import {SITE,type SiteFrame} from './twinPlaceScenes';
import {RELIEF_CAVE_LEFT,RELIEF_CAVE_RIGHT,RELIEF_CAVE_SKIRT,RELIEF_ROCK_SUMMIT,RELIEF_SNOW_SUMMIT} from './twinRelief';

export const TWIN_SITE_TEXTURE = 'twins-site-review';
export const TWIN_RELIEF_TEXTURE = 'twins-relief-review';
const WIDTH=32, SITE_HEIGHT=40, RELIEF_HEIGHT=48;
type Ink=CanvasRenderingContext2D;
type XY=readonly [number,number];
const rect=(c:Ink,colour:string,x:number,y:number,w:number,h:number)=>{c.fillStyle=colour;c.fillRect(x,y,w,h);};
function shape(c:Ink,colour:string,points:readonly XY[]){
  c.fillStyle=colour;
  const ys=points.map(p=>p[1]);
  for(let y=Math.min(...ys);y<Math.max(...ys);y++){
    const cuts:number[]=[];
    for(let i=0;i<points.length;i++){
      const [ax,ay]=points[i]!,[bx,by]=points[(i+1)%points.length]!;
      if(Math.min(ay,by)>y+.5||Math.max(ay,by)<=y+.5)continue;
      cuts.push(ax+(bx-ax)*(y+.5-ay)/(by-ay));
    }
    cuts.sort((a,b)=>a-b);
    for(let i=0;i<cuts.length;i+=2){
      const start=Math.round(cuts[i]!),end=Math.round(cuts[i+1]!);
      c.fillRect(start,y,end-start,1);
    }
  }
}

function wall(c:Ink,x:number,y:number,w:number,kind:'clay'|'brick'|'ruin'){
  const colour={clay:['#624838','#927053','#bd966c','#caab7e'],brick:['#633f35','#9c6249','#bb7d59','#d09a6d'],
    ruin:['#605345','#82705a','#a89475','#b9a78a']}[kind];
  rect(c,colour[0]!,x+1,y+8,w,2);rect(c,colour[1]!,x,y+3,w,6);
  rect(c,colour[2]!,x,y+1,w-1,3);rect(c,colour[3]!,x,y,w-2,1);
  for(let j=4;j<w-2;j+=5){rect(c,colour[0]!,x+j,y+5,1,2);rect(c,colour[2]!,x+j+1,y+7,2,1);}
}
function jar(c:Ink,x:number,y:number,colour:string){
  rect(c,'#6c4b39',x+1,y+7,5,2);rect(c,colour,x,y+2,7,5);
  rect(c,colour,x+1,y+7,5,1);rect(c,'#d4aa76',x+1,y+3,2,3);
  rect(c,'#d7b28a',x+1,y,5,2);rect(c,'#704e3d',x+2,y,3,1);
}
function reed(c:Ink,x:number,y:number,colour='#9d9a56'){
  rect(c,'#66663e',x,y+3,1,8);rect(c,colour,x-2,y,2,4);rect(c,colour,x+1,y+3,2,4);
  rect(c,'#a5a66a',x,y+1,1,6);
}
function garden(c:Ink,x:number,y:number,w:number,h:number){
  rect(c,'#855740',x,y,w,h);rect(c,'#bf855e',x,y,w,2);rect(c,'#b97b54',x+1,y+h-2,w-2,2);
  rect(c,'#656044',x+2,y+2,w-4,h-4);
  for(let j=3;j<w-2;j+=3)for(let k=3;k<h-2;k+=3){rect(c,'#8f9d65',x+j,y+k,2,1);rect(c,'#aaa976',x+j+1,y+k-1,1,1);}
}
function floor(c:Ink,frame:SiteFrame){
  const [tone,shade,light]=[
    ['#b59769','#957750','#d1b582'],['#b3926b','#8a7158','#c6ac85'],['#b88262','#965d48','#cd9d79'],
    ['#c8ac77','#aa895c','#ddc58d'],['#a79766','#7c7650','#c9b685'],['#aaa175','#746b46','#c3b184'],
    ['#a19a7e','#72766a','#bcb29b'],['#9c9b80','#667e78','#bab49b']
  ][frame]!;
  c.globalAlpha=.83;
  shape(c,tone!,[[0,18],[7,13],[16,11],[27,16],[32,21],[32,32],[24,36],[14,38],[3,34],[0,30]]);
  c.globalAlpha=.75;
  for(let i=0;i<11;i++){
    const x=(i*11+frame*7)%27+2,y=(i*5+frame*3)%19+16;
    rect(c,i%3===0?shade!:light!,x,y,frame===SITE.brickCourt?4:2+(i%4),1);
  }
  c.globalAlpha=1;
  if(frame===SITE.clippedGarden)garden(c,7,19,18,13);
  if(frame===SITE.stoneEdge||frame===SITE.riverEdge)for(let i=0;i<5;i++){
    const x=3+i*6,y=29-(i%3)*2;rect(c,shade!,x,y,5,3);rect(c,light!,x+1,y,3,1);
  }
}

function paintSite(c:Ink,frame:SiteFrame){
  if(frame<=SITE.riverEdge){floor(c,frame);return;}
  switch(frame){
    case SITE.bench:
      rect(c,'#684a39',7,29,2,6);rect(c,'#684a39',23,29,2,6);
      shape(c,'#ac8256',[[6,25],[22,25],[26,28],[24,31],[6,31],[4,28]]);
      rect(c,'#d5ad76',7,25,14,2);rect(c,'#a87550',11,24,4,2);jar(c,19,23,'#ae7654');
      rect(c,'#74583e',5,17,2,17);rect(c,'#74583e',25,17,2,17);
      shape(c,'#9f9565',[[6,14],[25,14],[29,20],[3,20]]);
      rect(c,'#c9b57c',7,14,17,2);rect(c,'#7c7750',3,20,26,2);
      for(let x=7;x<24;x+=6)rect(c,'#b6a472',x,17,3,2);
      break;
    case SITE.pottery: jar(c,8,25,'#ac714c');jar(c,16,28,'#bf825b');jar(c,21,23,'#97634d');break;
    case SITE.brokenRooms:
      shape(c,'#ac9672',[[3,20],[21,16],[30,20],[31,33],[19,37],[4,35]]);
      for(let y=22;y<34;y+=4)for(let x=5+(y%3);x<28;x+=5)rect(c,'#988265',x,y,3,1);
      wall(c,4,18,23,'ruin');wall(c,5,26,8,'ruin');wall(c,23,26,6,'ruin');
      rect(c,'#c8b395',13,28,7,2);rect(c,'#998064',9,36,6,1);break;
    case SITE.ruinWall: wall(c,5,24,21,'ruin');rect(c,'#a28363',9,34,3,2);rect(c,'#baa380',21,35,4,1);break;
    case SITE.nest:
      shape(c,'#9c7b50',[[9,30],[14,27],[21,28],[24,32],[21,35],[13,35]]);
      rect(c,'#716042',13,30,8,3);rect(c,'#b69a68',10,32,5,1);rect(c,'#b69a68',18,34,4,1);break;
    case SITE.plantedRooms:
      rect(c,'#9f684e',3,17,26,18);rect(c,'#d2a47a',4,19,24,14);
      garden(c,5,20,9,11);garden(c,18,20,9,11);
      for(let y=20;y<34;y+=3)rect(c,'#b38361',15,y,2,1);
      rect(c,'#dcb787',5,34,22,2);break;
    case SITE.planter: garden(c,6,24,21,12);break;
    case SITE.drain:
      shape(c,'#8d5947',[[4,17],[21,17],[28,21],[28,36],[4,36]]);
      rect(c,'#bf8562',5,20,12,13);rect(c,'#7d5848',18,20,7,15);
      rect(c,'#797e69',20,22,3,13);
      for(let y=22;y<35;y+=4){rect(c,'#9a684f',7,y,8,1);rect(c,'#a5a68a',20,y,2,1);}
      rect(c,'#d2a184',5,18,17,2);break;
    case SITE.drainTrim:
      rect(c,'#8b5542',7,19,18,14);rect(c,'#bd815d',8,20,16,2);
      rect(c,'#736954',12,22,8,8);rect(c,'#9c956f',15,24,3,6);
      rect(c,'#ca9471',8,31,16,2);break;
    case SITE.reedMargin: for(let i=0;i<5;i++)reed(c,6+i*4,23+i%3,'#9c9e65');break;
    case SITE.windbreak:
      shape(c,'#a28356',[[0,30],[7,25],[22,24],[31,29],[28,35],[7,37]]);
      wall(c,3,21,22,'clay');wall(c,4,28,8,'clay');
      for(const x of [4,10,16,22]){rect(c,'#695342',x,18,2,10);rect(c,'#bb9460',x,18,1,6);}
      rect(c,'#d6b57c',7,21,16,2);rect(c,'#bc9e69',14,33,12,1);break;
    case SITE.scrub:
      for(let i=0;i<6;i++)reed(c,6+i*3,27-i%4,i%2?'#aaa573':'#8c8c5b');break;
    case SITE.reedBank:
      shape(c,'#a88b5b',[[1,25],[10,18],[24,19],[30,25],[28,35],[4,37]]);
      rect(c,'#866d4d',4,24,23,10);rect(c,'#b99868',4,22,22,3);
      for(let x=5;x<27;x+=3)rect(c,'#d0b380',x,23,1,11);
      jar(c,19,24,'#a98356');break;
    case SITE.reedBundle:
      shape(c,'#757047',[[3,30],[21,22],[29,24],[27,28],[9,36]]);
      for(let i=0;i<4;i++)shape(c,'#c3ae71',[[4+i,30+i],[23+i,22+i],[25+i,23+i],[6+i,31+i]]);
      rect(c,'#8b684b',15,26,2,6);break;
    case SITE.basket:
      shape(c,'#a68757',[[7,25],[24,25],[23,34],[20,36],[10,35]]);
      rect(c,'#725b40',10,26,11,2);rect(c,'#c5a775',8,24,15,2);
      for(let x=10;x<22;x+=3)rect(c,'#c3a371',x,28,1,5);break;
    case SITE.reedMat:
      rect(c,'#947950',5,18,22,17);rect(c,'#c7af77',6,19,20,14);
      for(let x=7;x<25;x+=3)rect(c,'#a7895b',x,20,1,12);break;
    case SITE.seat:
      rect(c,'#725640',7,30,3,5);rect(c,'#725640',22,30,3,5);
      rect(c,'#a9825e',6,27,20,4);rect(c,'#cca97a',7,26,17,2);break;
    case SITE.earthenWall: wall(c,5,24,23,'clay');break;
    case SITE.brickWall: wall(c,5,25,23,'brick');break;
    case SITE.shadeTree:
      rect(c,'#685943',14,22,4,14);rect(c,'#9d8056',14,24,1,9);
      shape(c,'#66774f',[[2,21],[5,13],[11,11],[18,10],[27,15],[31,21],[28,27],[20,29],[9,27]]);
      shape(c,'#879263',[[3,19],[8,13],[16,11],[21,13],[26,17],[23,21],[12,25],[7,24]]);
      rect(c,'#a4a476',9,14,9,2);rect(c,'#999d70',7,18,6,2);break;
  }
}

function paintCrown(c:Ink,frame:number){
  if(frame===RELIEF_CAVE_LEFT||frame===RELIEF_CAVE_RIGHT){
    const right=frame===RELIEF_CAVE_RIGHT;
    if(right){c.translate(WIDTH,0);c.scale(-1,1);}
    shape(c,'#75816f',[[5,44],[10,37],[14,35],[20,33],[26,31],[32,32],[32,46],[23,45],[18,46],[9,45]]);
    shape(c,right?'#687566':'#929e85',[[11,41],[16,36],[23,33],[32,32],[32,36],[23,38],[19,40]]);
    return;
  }
  if(frame===RELIEF_CAVE_SKIRT){
    shape(c,'#59665c',[[0,43],[2,31],[8,26],[15,25],[21,27],[28,32],[32,42],[30,47],[1,47]]);
    shape(c,'#7c897b',[[0,40],[4,30],[11,26],[21,27],[25,31],[17,35],[9,35],[6,43]]);
    shape(c,'#a0a88d',[[6,31],[11,26],[19,27],[21,30],[13,30],[9,34]]);
    return;
  }
  shape(c,'#626d65',[[0,40],[3,31],[10,21],[13,11],[17,7],[22,15],[25,24],[31,36],[32,44],[26,47],[8,47]]);
  shape(c,'#8a9587',[[0,40],[4,31],[11,23],[14,13],[17,7],[19,16],[17,22],[16,29],[12,35],[10,44],[4,44]]);
  shape(c,'#77837a',[[14,43],[18,36],[22,31],[28,35],[32,42],[25,44]]);
  shape(c,'#a4ad98',[[5,34],[12,22],[15,13],[17,8],[18,16],[14,23],[12,29],[8,35]]);
  if(frame===RELIEF_SNOW_SUMMIT){
    shape(c,'#b6c4bc',[[9,24],[13,12],[17,7],[22,15],[25,23],[20,21],[17,26],[15,22],[11,26]]);
    shape(c,'#dce1d1',[[11,22],[14,12],[17,7],[19,13],[20,17],[16,17],[16,22],[14,20]]);
  }
  rect(c,'#8f9a87',4,44,7,2);rect(c,'#6b786a',22,43,8,2);
}

function bakeSheet(scene:Phaser.Scene,key:string,height:number,frames:readonly number[],draw:(c:Ink,id:number)=>void){
  if(scene.textures.exists(key))return;
  const columns=Math.min(8,frames.length);
  const atlas=scene.textures.createCanvas(key,WIDTH*columns,height*Math.ceil(frames.length/columns));
  if(!atlas)throw new Error('Could not create Twin Cities scenery atlas');
  const c=atlas.getContext();
  for(const [index,id] of frames.entries()){
    const x=index%columns*WIDTH,y=Math.floor(index/columns)*height;
    c.save();c.translate(x,y);c.beginPath();c.rect(0,0,WIDTH,height);c.clip();draw(c,id);c.restore();
    atlas.add(id,0,x,y,WIDTH,height);
  }
  atlas.refresh();atlas.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function bakeTwinScenery(scene:Phaser.Scene,relief:boolean){
  bakeSheet(scene,TWIN_SITE_TEXTURE,SITE_HEIGHT,Object.values(SITE),(c,id)=>paintSite(c,id as SiteFrame));
  if(relief)bakeSheet(scene,TWIN_RELIEF_TEXTURE,RELIEF_HEIGHT,
    [RELIEF_ROCK_SUMMIT,RELIEF_SNOW_SUMMIT,RELIEF_CAVE_SKIRT,RELIEF_CAVE_LEFT,RELIEF_CAVE_RIGHT],paintCrown);
}
