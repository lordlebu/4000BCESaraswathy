const fs=require('fs'), path=require('path');
const {decodePng,encodePng}=require('./build-monuments.js');
const A=path.join(__dirname,'..','assets');
const tower=decodePng(path.join(A,'windmill-tower.png'));
const blades=decodePng(path.join(A,'windmill-blades.png'));
const BLADE=blades.height, STEPS=blades.width/BLADE;
const BOSS={x:Number(process.argv[2]||0.495), y:Number(process.argv[3]||0.335)};
const SHOW=[0,2,4,6,8,10];
const SCALE=2;
const W=tower.width*SHOW.length, H=tower.height;
const out=Buffer.alloc(W*H*4);
const put=(x,y,r,g,b,a)=>{if(x<0||y<0||x>=W||y>=H||a<128)return;const p=(y*W+x)*4;out[p]=r;out[p+1]=g;out[p+2]=b;out[p+3]=255;};
SHOW.forEach((f,n)=>{
  const ox=n*tower.width;
  for(let y=0;y<tower.height;y++)for(let x=0;x<tower.width;x++){
    const p=(y*tower.width+x)*4;
    put(ox+x,y,tower.data[p],tower.data[p+1],tower.data[p+2],tower.data[p+3]);
  }
  const bx=Math.round(ox+BOSS.x*tower.width-BLADE/2);
  const by=Math.round(BOSS.y*tower.height-BLADE/2);
  for(let y=0;y<BLADE;y++)for(let x=0;x<BLADE;x++){
    const p=(y*blades.width+f*BLADE+x)*4;
    put(bx+x,by+y,blades.data[p],blades.data[p+1],blades.data[p+2],blades.data[p+3]);
  }
});
// upscale nearest so it is legible
const UW=W*SCALE, UH=H*SCALE, up=Buffer.alloc(UW*UH*4);
for(let y=0;y<UH;y++)for(let x=0;x<UW;x++){
  const s=((y/SCALE|0)*W+(x/SCALE|0))*4, d=(y*UW+x)*4;
  up[d]=out[s];up[d+1]=out[s+1];up[d+2]=out[s+2];up[d+3]=out[s+3];
}
const f=path.join('/tmp/claude-0/-home-user/2a89790c-e07e-58e9-afc4-02e4d648fd6b/scratchpad','windmill-preview.png');
fs.writeFileSync(f, encodePng(UW,UH,up));
console.log(`preview ${UW}x${UH} -> ${f}  (boss ${BOSS.x}, ${BOSS.y}; frames ${SHOW.join(',')} of ${STEPS})`);
