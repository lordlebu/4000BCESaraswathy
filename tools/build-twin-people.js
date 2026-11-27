// NES figures for the twin-city cast. Reviewed JRPG sheets supersede code-authored fallbacks.
// Same 26x40 cells and 20-frame contract as the other character sheets.
const fs = require('node:fs');
const path = require('node:path');
const { encodePng, decodePng } = require('./sprite-png');
const PEOPLE = {
  'priest-kang': { skin:'#b08b66', light:'#d9b991', cloth:'#d2c3a0', shade:'#a89778', accent:'#a66855', hair:'priest', prop:'token' },
  'mirlepa': { skin:'#d6b091', light:'#f2d5b3', cloth:'#75825b', shade:'#4b5942', accent:'#c99b66', hair:'braid', prop:'none' },
  'yamantaka': { width:34, skin:'#d6b091', light:'#f2d5b3', cloth:'#708795', shade:'#465665', accent:'#c99b66', hair:'three', prop:'none' },
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
  const entry=JSON.parse(fs.readFileSync(path.join(__dirname,'characters.json'),'utf8')).characters.find(c=>c.id===id);
  const source=entry?.jrpgSource?path.join(__dirname,'..',entry.jrpgSource):null;
  if(source){
    const image=decodePng(source),cell=entry.cell?.width??person?.width??26;
    if(image.width!==cell*4||image.height!==200)throw new Error(`${id}: expected four columns and five rows`);
    const pixels=Buffer.alloc(cell*20*40*4);
    for(let frame=0;frame<20;frame++)for(let y=0;y<40;y++){
      const from=(((Math.floor(frame/4)*40+y)*image.width)+(frame%4)*cell)*4;
      image.data.copy(pixels,(y*cell*20+frame*cell)*4,from,from+cell*4);
    }
    fs.writeFileSync(out,encodePng(cell*20,40,pixels));
    return;
  }
  if (!person) throw new Error(`Unknown twin-city figure: ${id}`);
  const cell=person.width??26, width = cell * 20, pixels = Buffer.alloc(width * 40 * 4);
  const { skin, light, cloth, shade, accent } = person;
  const palette = { ink:'#30231e', hair:person.hair.startsWith('grey')?'#938a7b':'#514237', wood:'#c6a271', skin, light, cloth, shade, accent };
  const colour = name => {
    const hex = palette[name] ?? name;
    return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).concat(255);
  };
  for (let frame = 0; frame < 20; frame++) {
    const seated=frame>=16, facing=seated?frame-16:Math.floor(frame/4), pose=seated?0:frame%4;
    const back=facing===1, profile=facing>=2, bob=pose===2?1:0, low=seated?7:0;
    const box=(x,y,w,h,c)=>{
      const rgba=colour(c);
      for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){
        const local=x+dx, px=facing===3?cell-1-local:local, py=y+dy;
        if(px>=0&&px<cell&&py>=0&&py<40)pixels.set(rgba,(py*width+frame*cell+px)*4);
      }
    };
    const round=(x,y,w,h,c)=>{
      box(x+1,y,w-2,h,c);box(x,y+1,w,h-2,c);
    };
    const cx=cell/2, body=person.hair==='three'?16:11, bx=Math.round(cx-body/2);
    // Carrier proportions: a round, expressive head, compact body and short boots.
    if(!seated){
      const step=pose===2?-1:pose===3?1:0;
      round(cx-5,31,4,6-step,'ink');round(cx+1,31,4,6+step,'ink');
      box(cx-4,31,2,3,'shade');box(cx+2,31,2,3,'cloth');
    }
    round(bx-1,21+low,body+2,seated?7:11,'ink');
    round(bx,21+low,body,seated?6:10,'shade');
    box(bx+1,22+low,body-3,seated?4:7,'cloth');
    box(bx+1,22+low,3,seated?3:6,'accent');
    round(bx-3,23+low,4,7,'ink');round(bx+body-1,23+low,4,7,'ink');
    box(bx-2,24+low,2,3,'cloth');box(bx+body,24+low,2,3,'cloth');
    round(bx-2,27+low,3,3,'light');round(bx+body,27+low,3,3,'skin');
    if(seated){
      round(cx-8,34,16,5,'ink');round(cx-7,34,14,4,'cloth');
      box(cx-5,35,4,2,'accent');box(cx+2,35,4,2,'shade');
      // Folded knees and hands read as sitting cross-legged rather than shortened legs.
      box(cx-3,32,6,2,'light');box(cx-1,34,2,2,'shade');
    }
    const oval=(x,y,w,h,c)=>{
      for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)
        if(((xx+.5-w/2)/(w/2))**2+((yy+.5-h/2)/(h/2))**2<=1)box(x+xx,y+yy,1,1,c);
    };
    // A visible neck joins the oversized head to the tunic in every bob/sitting pose.
    box(cx-2,19+low+bob,4,3,'skin');
    function head(x,y,w,h=13){
      oval(x,y,w,h,'ink');oval(x+1,y+1,w-2,h-2,'skin');
      oval(x+1,y+1,w-2,7,'hair');
      round(x-1,y+6,3,4,'skin');round(x+w-2,y+6,3,4,'skin');
      if(back){round(x+1,y+3,w-2,h-4,'hair');box(x+2,y+2,3,1,'accent');return;}
      oval(x+2,y+4,w-4,h-5,'light');
      if(profile){
        box(x+w-4,y+6,2,2,'ink');
        box(x+w-1,y+7,1,2,'skin');box(x+w-4,y+10,2,1,'skin');
      }else{
        for(const eye of [x+3,x+w-5]){
          box(eye,y+6,2,2,'ink');
        }
        box(x+2,y+9,2,1,'skin');box(x+w-4,y+9,2,1,'skin');
        box(x+Math.floor(w/2)-1,y+10,2,1,'skin');
      }
    }
    if(person.hair==='three'){
      // Three round heads share one broad little coat. Side heads sit a pixel lower.
      for(const [x,y] of [[2,11],[cell-11,11],[Math.floor(cx)-5,8]])head(x,y+low+bob,10,12);
      box(bx,29+low,body,2,'accent');
    }else{
      const x=Math.floor(cx)-8+(profile?1:0),y=5+low+bob,w=profile?14:16;
      head(x,y,w,15);
      if(person.hair.endsWith('beard')&&!back){box(x+3,y+10,w-6,2,'hair');box(x+4,y+12,w-8,1,'hair');}
      if(person.hair==='moustache'&&!back)box(x+4,y+9,w-8,1,'hair');
      if(person.hair==='wrap'){
        round(x-1,y-1,w+2,5,'ink');round(x,y-1,w,4,'accent');box(x+1,y,6,1,'light');
      }
      if(person.hair==='curls'){round(x+1,y-2,5,4,'hair');round(x+6,y-2,5,4,'hair');}
      if(person.hair==='bun'){round(x+w-5,y-4,5,5,'ink');round(x+w-4,y-3,3,3,'hair');}
      if(person.hair.includes('braid')){
        for(const side of person.hair==='braids'?[x,x+w-2]:[back?x+w-3:x]){
          round(side,y+8,3,9,'hair');box(side+1,y+14,2,1,'accent');
        }
      }
      if(person.hair==='priest'){
        box(x+1,y+3,w-2,2,'accent');box(x+6,y+3,2,2,'light');
        if(!back){box(x+2,y+10,w-4,2,'hair');box(x+4,y+12,w-8,1,'hair');}
      }
      if(id==='mirlepa'){
        round(x,y-1,w,4,'accent');box(x+2,y,2,1,'cloth');box(x+6,y,2,1,'cloth');box(x+10,y,2,1,'cloth');
        if(!back){box(x+2,y+10,w-4,2,'hair');box(x+4,y+12,w-8,1,'hair');
          // Restful closed eyes, not a blank square face.
          box(x+3,y+6,2,3,'light');box(x+w-5,y+6,2,3,'light');
          box(x+3,y+7,2,1,'ink');if(!profile)box(x+w-5,y+7,2,1,'ink');}
      }
      if(['reedwright-irekha','cove-watcher-ulenna'].includes(id)){
        box(x+1,y+3,2,2,'#efe1b2');box(x+1,y+4,1,1,'accent');
        box(bx+3,22+low,4,2,'skin');
      }
    }
    // A single small occupational cue, kept below the face.
    const px=bx+body+1,py=26+low;
    if(person.prop==='jar'){round(px-2,py-2,5,6,'ink');round(px-1,py-2,3,5,'accent');box(px,py-3,2,1,'light');}
    if(person.prop==='pouch'){round(px-1,py,4,5,'accent');box(px,py+1,2,1,'light');}
    if(['reeds','feather'].includes(person.prop)){box(px+1,py-6,1,11,'wood');box(px,py-6,2,3,'accent');}
    if(person.prop==='brick'){box(px-2,py,6,4,'ink');box(px-1,py,4,2,'accent');}
    if(['float','mallet'].includes(person.prop)){box(px+1,py-3,1,8,'wood');box(px-1,py-3,5,2,'ink');}
    if(person.prop==='token'){round(px-1,py,3,3,'wood');}
    if(person.prop==='rope'){round(px-2,py-4,5,7,'accent');box(px,py-2,1,3,'shade');}
    if(person.prop==='harness'){box(bx+body-3,23+low,2,7,'ink');box(bx+body-4,26+low,4,2,'wood');}
  }
  fs.writeFileSync(out, encodePng(width,40,pixels));
}
module.exports={buildTwinPerson};
if(require.main===module)for(const id of process.argv.slice(2).length?process.argv.slice(2):Object.keys(PEOPLE)){
  const out=path.join(__dirname,`../assets/${id}-overworld.png`);
  buildTwinPerson(id,out);console.log(`Built ${id}: 20 NES frames`);
}
