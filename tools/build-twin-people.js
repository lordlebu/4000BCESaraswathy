// Authored NES figures for the twin-city cast. No generated image inputs.
// Same 26x40 cells and 20-frame contract as the other character sheets.
const fs = require('node:fs');
const path = require('node:path');
const { encodePng } = require('./sprite-png');
const PEOPLE = {
  'priest-kang': { skin:'#b08b66', light:'#d9b991', cloth:'#d2c3a0', shade:'#a89778', accent:'#a66855', hair:'priest', prop:'token' },
  'mirlepa': { skin:'#a77f5e', light:'#cfa783', cloth:'#646d73', shade:'#454e57', accent:'#b69868', hair:'braid', prop:'none' },
  'yamantaka': { width:34, skin:'#a07958', light:'#c6a17b', cloth:'#66756b', shade:'#46574e', accent:'#c08f59', hair:'three', prop:'none' },
  'cave-cook': { skin:'#a97c59', light:'#d3a677', cloth:'#977f62', shade:'#6d5a49', accent:'#d7bc83', hair:'wrap', prop:'jar' },
  'cave-herder': { skin:'#a77754', light:'#d3a574', cloth:'#8b8c70', shade:'#65694c', accent:'#bc9b68', hair:'wrap', prop:'reeds' },
  'twin-mason': { skin:'#ae7959', light:'#d9a176', cloth:'#d4c29a', shade:'#aa9678', accent:'#ad7650', hair:'beard', prop:'float' },
  'twin-gardener': { skin:'#a66e50', light:'#d39c70', cloth:'#798658', shade:'#566744', accent:'#c5ad79', hair:'bun', prop:'pouch' },
  'twin-waterkeeper': { skin:'#b18160', light:'#dfad80', cloth:'#729593', shade:'#4c7376', accent:'#d8cb9b', hair:'braid', prop:'jar' },
  'twin-stationkeeper': { skin:'#b18464', light:'#dfaf82', cloth:'#c9be9f', shade:'#a79b80', accent:'#667a8a', hair:'moustache', prop:'token' },
  'twin-handler': { skin:'#936348', light:'#bd8b64', cloth:'#b47b57', shade:'#835943', accent:'#dccb9c', hair:'curls', prop:'harness' },
  'twin-brickworker': { skin:'#af7854', light:'#d7a477', cloth:'#b6755e', shade:'#8e5549', accent:'#c7b48b', hair:'wrap', prop:'brick' },
  'twin-landingkeeper': { skin:'#946c50', light:'#b7946e', cloth:'#7d9297', shade:'#576e7b', accent:'#c3b48b', hair:'grey-beard', prop:'rope' },
  'twin-maintainer': { skin:'#b38159', light:'#d8aa77', cloth:'#cdc0a0', shade:'#a69a7f', accent:'#a68b56', hair:'wrap', prop:'mallet' },
  'reedwright-irekha': { skin:'#986e51', light:'#c2966f', cloth:'#9b9765', shade:'#727b50', accent:'#c0b18b', hair:'grey-braid', prop:'reeds' },
  'cove-watcher-ulenna': { skin:'#b18462', light:'#dbae85', cloth:'#8c9ba4', shade:'#637887', accent:'#d5cdb2', hair:'braids', prop:'feather' }
};
function buildTwinPerson(id, out) {
  const person = PEOPLE[id];
  if (!person) throw new Error(`Unknown twin-city figure: ${id}`);
  const cell=person.width??26, width = cell * 20, pixels = Buffer.alloc(width * 40 * 4);
  const { skin, light, cloth, shade, accent } = person;
  const palette = { ink:'#493e3b', hair:person.hair.startsWith('grey')?'#938a7b':'#514237', wood:'#c6a271', skin, light, cloth, shade, accent };
  const colour = name => {
    const hex = palette[name] ?? name;
    return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).concat(255);
  };
  for (let frame = 0; frame < 20; frame++) {
    const seated = frame >= 16, facing = seated ? frame-16 : Math.floor(frame/4);
    const pose = seated ? 0 : frame%4;
    const profile = facing >= 2, back = facing === 1;
    const lower = seated ? 7 : 0;
    const box = (x,y,w,h,c) => {
      const rgba = colour(c);
      for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){
        const local=x+dx+(cell-26)/2,px = facing===3 ? cell-1-local : local, py=y+dy;
        if(px>=0&&px<cell&&py>=0&&py<40)pixels.set(rgba,(py*width+frame*cell+px)*4);
      }
    };
    // Broad, quiet silhouette; three cloth values and two skin values.
    box(8,16+lower,11,12,'shade'); box(9,16+lower,8,11,'cloth');
    box(back?15:9,17+lower,3,11,'accent');
    const headX=profile?11:9, headW=profile?7:8;
    if(person.hair!=='three'){
    box(headX,6+lower,headW,8,'skin'); box(headX,6+lower,headW,3,'hair');
    if(!back){
      box(headX+2,9+lower,profile?5:4,3,'light');
      box(profile?17:10,10+lower,1,1,'ink');
      if(!profile)box(15,10+lower,1,1,'ink');
      if(profile)box(18,11+lower,1,2,'skin');
    }else box(10,8+lower,7,4,'hair');
    if(person.hair.endsWith('beard')&&!back)box(headX+1,13+lower,6,2,'hair');
    if(person.hair==='moustache'&&!back)box(headX+2,12+lower,4,1,'hair');
    if(person.hair==='wrap'){box(headX-1,5+lower,headW+2,4,'accent');box(8,9+lower,2,6,'accent');}
    if(person.hair==='curls'){box(headX-1,5+lower,headW+1,2,'hair');box(headX+1,4+lower,2,2,'hair');}
    if(person.hair==='bun'){box(profile?9:15,4+lower,4,4,'hair');box(11,6+lower,4,1,'accent');}
    if(person.hair.endsWith('braid')){box(back?10:8,12+lower,2,9,'hair');box(back?10:8,20+lower,2,2,'accent');}
    if(person.hair==='braids'){box(8,12+lower,2,9,'hair');box(17,12+lower,2,9,'hair');}
    if(person.hair==='priest'){
      box(headX,6+lower,headW,2,'accent');box(headX+3,6+lower,2,1,'wood');
      if(!back)box(headX+1,12+lower,headW-1,4,'hair');
    }
    }
    if(person.hair==='three'){
      box(4,16+lower,18,4,'cloth');
      for(const hx of [3,11,19]){
        box(hx,8+lower,6,7,'skin');box(hx,6+lower,6,3,'hair');
        box(hx,6+lower,6,1,'accent');
        if(!back){box(hx+1,10+lower,4,2,'light');box(hx+2,10+lower,1,1,'ink');}
      }
    }
    if(['three','braid'].includes(person.hair)&&['yamantaka','mirlepa'].includes(id)){
      box(8,24+lower,11,2,'accent');box(8,26+lower,11,1,'wood');
    }
    // Resting arms stay still; only the second idle pose relaxes a hand by one pixel.
    const reach=pose===1?1:0;
    box(6,18+lower,3,7,'shade');box(7,24+lower+reach,2,3,'skin');
    box(18,18+lower,3,7,'cloth');box(19,24+lower,2,3,'skin');
    if(seated){
      box(7,32,14,4,'shade');box(8,33,5,3,'cloth');
      box(7,37,6,2,'ink');box(17,37,6,2,'ink');
    }else{
      const stride=pose===2?-2:pose===3?2:0;
      box(9+stride,28,3,9,'shade');box(15-stride,28,3,9,'cloth');
      box(8+stride,37,5,2,'ink');box(15-stride,37,5,2,'ink');
    }
    // One role cue each, never fine texture. Back views carry the prop at the same side.
    if(person.prop==='float'){
      box(20,23+lower,5,2,'wood');box(21,21+lower,2,2,'ink');
      box(9,25+lower,7,2,'accent');
    }else if(person.prop==='pouch'){
      box(18,23+lower,5,6,'accent');box(19,24+lower,3,2,'wood');
      box(21,19+lower,1,5,'shade');box(22,19+lower,2,2,'cloth');
    }else if(person.prop==='jar'){
      box(20,21+lower,4,2,'accent');box(19,23+lower,6,5,'shade');
      box(20,23+lower,4,4,'cloth');box(21,24+lower,2,1,'accent');
      box(20,28+lower,4,1,'accent');
    }else if(person.prop==='token'){
      box(20,23+lower,3,3,'wood');box(21,24+lower,1,1,'ink');
    }else if(person.prop==='harness'){
      box(16,17+lower,2,11,'ink');box(17,22+lower,4,3,'wood');box(18,23+lower,2,1,'ink');
    }else if(person.prop==='brick'){
      box(18,23+lower,7,4,'shade');box(18,23+lower,7,1,'cloth');
    }else if(person.prop==='rope'){
      box(18,18+lower,6,10,'accent');box(20,20+lower,2,6,'shade');
    }else if(person.prop==='mallet'){
      box(22,21+lower,1,9,'wood');box(19,20+lower,6,3,'ink');
    }else if(person.prop==='reeds'){
      box(20,17+lower,1,13,'wood');box(23,19+lower,1,11,'wood');box(19,24+lower,6,2,'shade');
    }else if(person.prop==='feather'){
      box(22,19+lower,1,11,'wood');box(21,17+lower,3,7,'accent');
    }
  }
  fs.writeFileSync(out, encodePng(width,40,pixels));
}
module.exports={buildTwinPerson};
if(require.main===module)for(const id of process.argv.slice(2).length?process.argv.slice(2):Object.keys(PEOPLE)){
  const out=path.join(__dirname,`../assets/${id}-overworld.png`);
  buildTwinPerson(id,out);console.log(`Built ${id}: 20 NES frames`);
}
