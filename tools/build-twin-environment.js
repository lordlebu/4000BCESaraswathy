// Simple 8-bit environmental accents: 32px logical cells, four-pixel clusters.
// No image generation. Existing accepted sheets remain intact.
const fs=require('node:fs'),path=require('node:path');
const {encodePng}=require('./sprite-png');
const size=128,cols=8,frames=24,width=cols*size;
const data=Buffer.alloc(width*size*3*4);
const P={dark:[75,61,54,255],earth:[164,117,78,255],light:[217,181,126,255],
 brick:[150,85,64,255],green:[103,119,66,255],water:[62,100,112,255],reed:[165,151,96,255]};
function box(f,x,y,w,h,c){c=P[c]||c;for(let py=Math.max(0,y);py<Math.min(32,y+h);py++)for(let px=Math.max(0,x);px<Math.min(32,x+w);px++)
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)data.set(c,(((Math.floor(f/cols)*128+py*4+a)*width)+(f%cols)*128+px*4+b)*4);}
// 0: a quiet courtyard paving ring with an open centre.
box(0,5,7,22,22,'earth');box(0,7,9,18,18,[207,175,126,180]);
box(0,11,13,10,10,[175,153,106,180]);
// 1: storage jars; broad light/base/shadow masses, no fine ornament.
for(const [x,y] of [[6,17],[17,19]]){box(1,x,y,8,10,'dark');box(1,x,y,7,8,'earth');box(1,x+1,y,5,2,'light');box(1,x+2,y-2,3,2,'dark');}
// 2: drying brick stack and a clay work mat.
box(2,4,17,24,12,'earth');for(let y=18;y<28;y+=4)for(let x=5+(y%2)*2;x<27;x+=7){box(2,x,y,5,3,'brick');box(2,x,y,5,1,'light');}
// 3: reed shade, open in the middle for the player to see through.
box(3,4,8,2,22,'dark');box(3,26,8,2,22,'dark');box(3,3,6,26,5,'reed');box(3,3,6,26,1,'light');
// 4: landing timber and tied rope.
for(let y=14;y<30;y+=4){box(4,4,y,24,3,'earth');box(4,4,y,24,1,'light');}box(4,3,10,2,20,'dark');box(4,27,10,2,20,'dark');
// 5: water well, simple octagonal suggestion and dark opening.
box(5,8,16,16,13,'earth');box(5,5,18,22,8,'earth');box(5,8,15,16,3,'light');box(5,10,18,12,5,'dark');box(5,12,20,8,2,'water');
// 6: a reed-root strip, placed only beside water.
for(const x of [5,11,20,26]){box(6,x,16,1,14,'green');box(6,x-1,11,2,7,'reed');box(6,x+1,23,3,1,'green');}
// 7: broad terrace steps, three values rather than stone microtexture.
for(let i=0;i<4;i++){box(7,3,9+i*5,26,4,i%2?'earth':'light');box(7,3,13+i*5,26,1,'dark');}
// 8..23: water-side bank shadows. A stepped alpha gradient stays on water.
for(let mask=0;mask<16;mask++)for(let edge=0;edge<4;edge++)if(mask&(1<<edge)){
 for(let d=0;d<4;d++){
  const c=[37,61,64,[100,70,40,16][d]];
  if(edge===0)box(8+mask,0,d,32,1,c);
  if(edge===1)box(8+mask,31-d,0,1,32,c);
  if(edge===2)box(8+mask,0,31-d,32,1,c);
  if(edge===3)box(8+mask,d,0,1,32,c);
 }
}
fs.writeFileSync(path.join(__dirname,'../assets/twins/environment-nes.png'),encodePng(width,384,data));
console.log(`Built ${frames} simple environmental frames`);
