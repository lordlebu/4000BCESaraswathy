// Approved sample C: broad object-style cliff shrubs + existing old-map border grass.
// Approved covered clay lamp. Native code art, no raster recolouring/quantization.
const fs=require('node:fs'),path=require('node:path');const {encodePng}=require('./sprite-png');
const root=path.join(__dirname,'../assets/twins');
function image(width,height){
 const data=Buffer.alloc(width*height*4);
 const box=(x,y,w,h,hex)=>{const colour=hex.match(/../g).map(v=>parseInt(v,16));if(colour.length===3)colour.push(255);
  for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++)data.set(colour,(py*width+px)*4);};
 return {box,save:file=>fs.writeFileSync(path.join(root,file),encodePng(width,height,data))};
}
const shrubs=image(256,256);
for(const [frame,p] of [
 ['52774e','71935a','455d42','8aa474'],['7e8972','9aa48a','5f715d','adb39b'],
 ['476a52','638665','385641','809a75'],['5d7967','7b9580','466454','96aa91']
].entries()){
 const b=(x,y,w,h,c)=>shrubs.box(frame%2*128+x*4,Math.floor(frame/2)*128+y*4,w*4,h*4,c);
 b(8,27,17,2,p[2]);b(7,17,19,10,p[0]);b(4,20,25,5,p[0]);b(10,13,13,7,p[1]);b(7,17,18,3,p[1]);b(12,13,8,2,p[3]);
}
shrubs.save('verge-shrubs.png');
const lamp=image(64,128),b=(x,y,w,h,c)=>lamp.box(x*4,y*4,w*4,h*4,c);
b(3,5,2,26,'6a6552');b(3,5,1,26,'aaa487');b(2,31,5,1,'8d917a');
b(3,4,11,1,'8c8163');b(11,5,1,5,'655c48');b(9,10,6,7,'9e7852');b(10,11,4,4,'d4b67f');
b(8,9,8,1,'8c8163');b(10,8,4,1,'b6ad8c');b(11,12,1,2,'f6dda4');
lamp.save('covered-clay-lamp.png');
console.log('Built approved object shrubs and covered clay lamp; grass reuses the old atlas.');
