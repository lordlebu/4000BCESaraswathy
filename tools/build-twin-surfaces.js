// Deterministic material textures, assembled on a two-pixel SNES grid.
// No accepted sheet is rewritten. Run: node tools/build-twin-surfaces.js
const fs = require('node:fs');
const path = require('node:path');
const { encodePng } = require('./sprite-png');
const cell = 128, count = 4, width = cell * count;
const data = Buffer.alloc(width * cell * 4);
function rect(frame, x, y, w, h, color) {
  for (let py=y; py<Math.min(64,y+h); py++) for(let px=x;px<Math.min(64,x+w);px++) {
    if(px<0||py<0)continue;
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++) {
      const i=((py*2+dy)*width+frame*cell+px*2+dx)*4;
      data.set(color,i);
    }
  }
}
// Small swept earthen forecourt, irregular perimeter and worn stepping bricks.
for(let y=25;y<59;y++) {
  const inset=4+((y*7)%5);
  rect(0,inset,y,64-inset*2,1,[201,166,115,125]);
}
for(let y=32;y<58;y+=8)for(let x=10+(y%3)*3;x<53;x+=13) {
  rect(0,x,y,10,5,[169,122,82,130]);
  rect(0,x,y,10,1,[231,201,151,160]);
}
// Fired brick apron: staggered courses, chipped corners, warm lit upper edges.
for(let y=24;y<60;y+=7)for(let x=5+(y%2)*6;x<57;x+=12) {
  rect(1,x,y,10,5,[146,88,69,165]);
  rect(1,x,y,10,1,[213,156,115,190]);
  rect(1,x+1,y+1,8,3,[177,111,83,175]);
}
// A recessed urban drain with partial covers; a narrow wet channel beneath.
rect(2,28,0,9,64,[77,65,56,220]);
rect(2,30,0,5,64,[56,89,92,230]);
rect(2,25,0,3,64,[190,136,95,220]);
rect(2,37,0,3,64,[118,78,62,220]);
for(let y=3;y<64;y+=14) {
  rect(2,26,y,13,7,[154,113,84,255]);
  rect(2,26,y,13,1,[224,180,132,255]);
  rect(2,30,y+10,4,1,[164,188,168,170]);
}
// Loose sand and talus at the foot of a rock face. Quiet, translucent clusters.
for(let i=0;i<27;i++) {
  const x=3+(i*19)%56,y=42+(i*7)%20;
  rect(3,x,y,3+i%3,2,[131,109,80,130]);
  rect(3,x,y,3+i%3,1,[221,193,143,150]);
}
fs.writeFileSync(path.join(__dirname,'../assets/twins/surfaces.png'),encodePng(width,cell,data));
console.log('Built four 128x128 material overlays');
