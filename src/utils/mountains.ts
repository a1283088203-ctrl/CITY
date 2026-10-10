import * as T from 'three';
import {CITY} from '../data/cityConfig';
import {seeded,clamp} from './math';
import {groundTexture} from './groundTexture';
import {treeGeometry,shrubGeometry} from './tree';

// Build-area palette (TerrainSystem): grass tiles, the soil tile and the two rock blocks.
const GRASS=[0x96ba8a,0xa0c496,0x92b58c],DIRT=0xb9ad82,ROCK=0x8d9c85,ROCK_TOP=0xa9b29a,SNOW=0xf2f1ea;

/**
 * One random mountain range per map: on the west, the north, or both (behind the city from the default camera).
 * The same height field drives the stepped foothills inside the playable grid and the snowy range in the scenery
 * ring, so the two join up at the city edge. `passZ` keeps the main road row open through a pass in the west range.
 */
export function mountainField(seed:number,passZ:number){
 const r=seeded(seed^0x2c1b9e),range=Math.floor(r()*3),ph1=r()*Math.PI*2,ph2=r()*Math.PI*2,ph3=r()*Math.PI*2;
 const crest=8+r()*4;
 const ridge=(p:number)=>crest+4.5*(Math.sin(p*.21+ph1)*.55+Math.sin(p*.47+ph2)*.3+Math.cos(p*.09+ph2)*.15);
 // How far the foothills reach into the city (world units), varying along the edge.
 const reach=(p:number)=>4.5+1.2*Math.sin(p*.33+ph3);
 const side=(t:number,p:number)=>T.MathUtils.smoothstep(t+reach(p),0,14)*ridge(p);
 const height=(x:number,z:number)=>{
  let west=range!==1?side(-x-CITY.half,z):0;
  // The pass is fully open inside the city and closes again further out.
  const pass=clamp((Math.abs(z-passZ)-1)/3,0,1),open=clamp((-x-CITY.half)/8,0,1);
  west*=pass+(1-pass)*open;
  return Math.max(west,range!==0?side(-z-CITY.half,x):0);
 };
 return {range,crest,height};
}
export type MountainField=ReturnType<typeof mountainField>;

type Add=(w:number,h:number,d:number,x:number,y:number,z:number,color:number)=>T.Mesh;
/** Places a build-area vegetation geometry (local space, origin at its base) at a world position. */
export type Plant=(geometry:T.BufferGeometry,x:number,y:number,z:number)=>void;

/**
 * One square mountain column (`size` wide), built only from the build area's own pieces: its grass and soil
 * tiles and ground texture, its trees and shrubs (utils/tree) and its two-block rocks. Low cells are plain grass
 * tiles; a few taller ones are left as bare soil so the tops blend grass <-> soil exactly like the city ground.
 * The highest cells keep a snow cap. Vegetation is sparse and scales with the top's area.
 */
export function mountainCell(add:Add,plant:Plant,x:number,z:number,bottom:number,top:number,crest:number,r:()=>number,size=1.5){
 const snow=top>=crest*.78,low=top<.6,bare=!snow&&!low&&r()<.2;
 const grass=()=>GRASS[Math.floor(r()*3)];
 // The whole column, sides included, is a grass tile; bare cells get a thin soil slab on top instead.
 const body=add(size,top-bottom,size,x,(top+bottom)/2,z,grass());
 groundTexture(body,'grass');
 if(bare){const soil=add(size,.06,size,x,top+.02,z,DIRT);groundTexture(soil,'dirt');}
 if(snow){
  // Overhanging snow slab with a few drips down the sides (more on wider columns).
  const cap=add(size+.04,.14,size+.04,x,top-.05,z,SNOW);groundTexture(cap,'dirt');
  const o=size/2+.02,drips=Math.max(1,Math.round(size*2));
  for(let i=0;i<drips;i++){const a=Math.floor(r()*4),u=(r()-.5)*size*.73,len=.15+r()*.3*Math.min(2,size/1.5);
   a<2?add(.18,len,.04,x+u,top-.12-len/2,z+(a?o:-o),SNOW):add(.04,len,.18,x+(a===2?o:-o),top-.12-len/2,z+u,SNOW);}
  return;
 }
 // Small columns get proportionally fewer plants; wide ones get a few tries spread over their top.
 const area=size*size/2.25,tries=Math.max(1,Math.round(area*.6)),chance=Math.min(1,area),ground=top+(bare?.05:0),stone=size>=3?1.5:1;
 for(let i=0;i<tries;i++){
  const k=r()/chance,px=x+(r()-.5)*size*.66,pz=z+(r()-.5)*size*.66,seed=Math.floor(r()*0x7fffffff);
  if(bare){if(k<.3)rock(add,px,ground,pz,stone);continue;}
  if(k<.14)plant(treeGeometry(seed,k<.06?1+Math.floor(r()*2):0),px,ground,pz);
  else if(k<.22)plant(shrubGeometry(seed,2+Math.floor(r()*2)),px,ground,pz);
  else if(k<.3)rock(add,px,ground,pz,stone);
 }
}
/**
 * Fills a square of the range with columns of mixed sizes instead of a uniform grid: flat stretches stay one big
 * block, steep or randomly chosen ones split into four smaller squares (down to 0.75). A big block that splits keeps a
 * chunky plinth at its lowest height, so the smaller blocks step up from a large mass rather than standing alone.
 * `height` is the continuous (unsnapped) range height.
 */
export function mountainBlock(add:Add,plant:Plant,x:number,z:number,size:number,bottom:number,height:(x:number,z:number)=>number,crest:number,r:()=>number){
 const q=size/4,samples=[height(x,z),height(x-q,z-q),height(x+q,z-q),height(x-q,z+q),height(x+q,z+q)];
 const min=Math.min(...samples),max=Math.max(...samples),mean=samples.reduce((a,b)=>a+b,0)/samples.length;
 const step=size>=3?.5:.25,snap=(h:number)=>Math.round(h/step)*step;
 // Steep blocks usually split, gentle ones rarely; small blocks split less often so tiny steps stay an accent.
 const steep=max-min>(size>=6?2.4:size>=3?1.5:1),split=size>.75&&r()<(steep?(size>=3?.9:.4):(size>=3?.2:.08));
 if(!split){
  const top=Math.max(bottom+.25,snap(mean+(r()-.5)*(size>=3?.3:.5)));
  mountainCell(add,plant,x,z,bottom,top,crest,r,size);return;
 }
 const base=snap(min*.9);
 if(size>=3&&base-bottom>=.5){groundTexture(add(size,base-bottom,size,x,(base+bottom)/2,z,GRASS[Math.floor(r()*3)]),'grass');bottom=base;}
 const h=size/4;
 for(const ox of [-h,h])for(const oz of [-h,h])mountainBlock(add,plant,x+ox,z+oz,size/2,bottom,height,crest,r);
}
/** The build area's rock: two stacked blocks. */
function rock(add:Add,x:number,y:number,z:number,s=1){
 add(.7*s,.4*s,.6*s,x,y+.2*s,z,ROCK);add(.44*s,.25*s,.4*s,x+.1*s,y+.48*s,z-.04*s,ROCK_TOP);
}
