// Cut the two retained building sources into a tightly fitted, baseline-aligned atlas.
// Run: node tools/build-twin-homes.js. Four-pixel clusters by default; --detailed retains the older two-pixel grid.
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./sprite-png');
const root=path.resolve(__dirname,'..');
const width=128,height=144;
const simple=!process.argv.includes('--detailed');
const step=simple?4:2,logicalW=width/step,logicalH=height/step;
// Small authored ramps, rather than the source's hundreds of paint tones.
const ramp=['#403539','#604344','#805447','#9d6950','#ba8058','#cf9d6a',
  '#e4b980','#efcf99','#6b704e','#8c9261','#b6af7b','#806e59','#a88a66','#c5ad83']
  .map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
const pixels=Buffer.alloc(width*2*height*4);
for(const [frame,name] of ['harappa-home','mohenjodaro-home'].entries()) {
  const input=decodePng(path.join(root,`assets/source/twins/${name}.png`));
  let left=input.width,right=0,top=input.height,bottom=0;
  for(let y=0;y<input.height;y++)for(let x=0;x<input.width;x++) {
    if(input.data[(y*input.width+x)*4+3]<128)continue;
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(left>right||top>bottom)throw new Error(`${name}: empty silhouette`);
  const sourceW=right-left+1,sourceH=bottom-top+1;
  const scale=Math.min((logicalW-4)/sourceW,(logicalH-4)/sourceH);
  const w=Math.max(1,Math.round(sourceW*scale)),h=Math.max(1,Math.round(sourceH*scale));
  const ox=Math.floor((logicalW-w)/2),oy=logicalH-2-h;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const sx=left+Math.min(sourceW-1,Math.floor((x+.5)*sourceW/w));
    const sy=top+Math.min(sourceH-1,Math.floor((y+.5)*sourceH/h));
    const from=(sy*input.width+sx)*4;
    const rgba=Array.from(input.data.subarray(from,from+4));
    if(simple){
      // Average each source area before palette reduction. Point sampling aliases tiny
      // brick marks into speckles; area sampling keeps the broad roof and wall masses.
      const total=[0,0,0];let alpha=0;
      for(let ay=0;ay<7;ay++)for(let ax=0;ax<7;ax++){
        const px=left+Math.min(sourceW-1,Math.floor((x+(ax+.5)/7)*sourceW/w));
        const py=top+Math.min(sourceH-1,Math.floor((y+(ay+.5)/7)*sourceH/h));
        const i=(py*input.width+px)*4,a=input.data[i+3]/255;
        alpha+=a;for(let c=0;c<3;c++)total[c]+=input.data[i+c]*a;
      }
      for(let c=0;c<3;c++)rgba[c]=alpha?total[c]/alpha:0;
      rgba[3]=Math.round(alpha/49*255);
      const nearest=ramp.reduce((best,c)=>{
        const distance=(v)=>v.reduce((sum,n,i)=>sum+(n-rgba[i])**2,0);
        return distance(c)<distance(best)?c:best;
      });
      rgba.splice(0,4,...nearest,rgba[3]>=128?255:0);
    }
    for(let dy=0;dy<step;dy++)for(let dx=0;dx<step;dx++) {
      const to=(((oy+y)*step+dy)*width*2+frame*width+(ox+x)*step+dx)*4;
      pixels.set(rgba,to);
    }
  }
  console.log(`${name}: ${sourceW}x${sourceH} silhouette -> ${w*step}x${h*step}`);
}
fs.writeFileSync(path.join(root,`assets/twins/homes-${simple?'snes':'painted'}.png`),encodePng(width*2,height,pixels));
