// Code-native NES props and route masks, matching objects.png/routes.png's broad pixel shapes.
const fs=require('node:fs'),path=require('node:path');
const {encodePng}=require('./sprite-png');
const out=path.join(__dirname,'../assets/twins');
function atlas(cell,columns,rows){
  const width=cell*columns*4,height=cell*rows*4,data=Buffer.alloc(width*height*4);
  const box=(frame,x,y,w,h,colour)=>{
    const c=colour.match(/../g).map(v=>parseInt(v,16));if(c.length===3)c.push(255);
    for(let py=Math.max(0,y);py<Math.min(cell,y+h);py++)for(let px=Math.max(0,x);px<Math.min(cell,x+w);px++)
      for(let a=0;a<4;a++)for(let b=0;b<4;b++)data.set(c,(((Math.floor(frame/columns)*cell+py)*4+a)*width+(frame%columns*cell+px)*4+b)*4);
  };
  return {box,save:name=>fs.writeFileSync(path.join(out,name),encodePng(width,height,data))};
}
const props=atlas(48,2,1),b=props.box;
// Cave body: 48 native pixels = 192px = 1.5 tiles. Door: 16 pixels = 64px = half a tile.
b(0,0,20,48,28,'62695f');b(0,3,12,42,34,'818777');b(0,8,6,33,35,'929880');
b(0,14,1,23,9,'a5aa91');b(0,9,8,23,3,'b4b79b');b(0,3,18,6,24,'9a9d83');
b(0,38,14,7,29,'737b6a');b(0,2,42,44,6,'858973');
b(0,16,24,16,23,'393c36');b(0,19,21,10,4,'393c36');
b(0,13,25,3,20,'acaa8a');b(0,32,26,3,19,'686f5e');
b(0,16,46,16,2,'b1a17a');b(0,3,44,7,3,'a9a688');b(0,38,44,6,3,'62695f');
// A few frozen conifers. Three broad branch tiers, a plain trunk, sparse snow caps.
b(1,22,32,4,15,'686759');b(1,21,32,2,15,'9a9275');
for(const [x,y,w,h] of [[19,6,10,12],[15,16,18,11],[11,27,26,10]]){
 b(1,x,y,w,h,'466b60');b(1,x,y,w-3,3,'789282');b(1,x+2,y,w-4,2,'ccd2c5');
}
b(1,22,2,4,7,'ccd2c5');b(1,11,37,26,3,'38584f');
props.save('highland-life.png');

const roads=atlas(32,8,6),r=roads.box;
const colours=[['959889','737d70','b6b8a1'],['bea17b','9d8669','d1b994'],['ad8169','896957','c49b7f']];
for(let kind=0;kind<3;kind++)for(let mask=0;mask<16;mask++){
 const f=kind*16+mask,[base,shade,light]=colours[kind];
 const spans=[[8,8,17,17]];
 if(mask&1)spans.push([8,0,17,16]);if(mask&2)spans.push([16,8,16,17]);
 if(mask&4)spans.push([8,16,17,16]);if(mask&8)spans.push([0,8,16,17]);
 for(const [x,y,w,h] of spans)r(f,x,y,w,h,base);
 const inside=(x,y)=>spans.some(([a,b,w,h])=>x>=a&&x<a+w&&y>=b&&y<b+h);
 for(let y=1;y<31;y+=kind===2?4:7)for(let x=2+(Math.floor(y/4)%2)*3;x<30;x+=kind===2?7:8){
  if(!inside(x,y)||!inside(x+4,y+2))continue;
  r(f,x,y,5,3,shade);r(f,x,y,4,2,light);
 }
}
roads.save('roads-masonry.png');
console.log('Built cave/conifer atlas and 48 stone/sandstone/brick road masks.');
