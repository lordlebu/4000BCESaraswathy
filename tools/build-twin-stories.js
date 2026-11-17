// Generated NES JRPG bust stages; existing authored cave/sand silhouettes stay unchanged.
const fs=require('node:fs'),path=require('node:path');
const {encodePng,decodePng}=require('./sprite-png');
const P={ink:[64,53,51,255],rock:[135,112,83,255],light:[201,180,136,255],
 earth:[161,121,79,255],cloth:[178,151,106,255],green:[92,108,69,255]};
const width=128*7,height=160,data=Buffer.alloc(width*height*4);
function box(f,x,y,w,h,c){const v=P[c]||c;for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(py>=0&&py<40&&px>=0&&px<32)data.set(v,((py*4+a)*width+f*128+px*4+b)*4);}
// Three reviewed 32x40 source cells: plinth, work in progress, finished likeness.
// Copy full RGBA samples at integer 4x scale; never quantize colour or alpha.
const bust=decodePng(path.join(__dirname,'../assets/source/twins/kang-bust-nes-jrpg.png'));
if(bust.width!==96||bust.height!==40)throw new Error('Kang bust source must be 96x40');
for(let y=0;y<40;y++)for(let x=0;x<96;x++)for(let a=0;a<4;a++)for(let b=0;b<4;b++){
 const from=(y*96+x)*4,to=((y*4+a)*width+x*4+b)*4;
 bust.data.copy(data,to,from,from+4);
}
// 3: open cave mouth; broad rock faces above a sheltered, dark threshold.
box(3,4,10,24,29,'rock');box(3,7,6,18,7,'rock');box(3,10,4,12,3,'light');
box(3,8,13,16,25,'ink');box(3,11,10,10,5,'ink');
box(3,4,12,3,24,'earth');box(3,25,13,3,23,'light');box(3,8,36,16,3,'earth');
// 4: sheltered hearth. No animated particle system.
box(4,10,32,12,5,'rock');box(4,12,31,8,3,'ink');box(4,14,28,4,6,'earth');box(4,15,27,2,5,'light');
// 5: a low fold, with clear centre rather than a solid wall.
box(5,4,31,24,2,'earth');for(const x of [4,11,20,27])box(5,x,26,1,12,'rock');
// 6: short sand accent; the flight renderer fades this single image.
for(const [x,y,w]of [[6,30,6],[16,27,5],[22,32,5],[11,34,9]])box(6,x,y,w,1,'light');
fs.writeFileSync(path.join(__dirname,'../assets/twins/stories-nes.png'),encodePng(width,height,data));

// Beedu's compact SNES exception and wildlife share one reproducible source.
require('node:child_process').execFileSync('python', [path.join(__dirname,'build-twin-fauna.py')], {stdio:'inherit'});
console.log('Built seven story scenery frames.');
