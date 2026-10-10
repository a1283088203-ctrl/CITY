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
 * One 1.5-unit mountain column, built only from the build area's own pieces: its grass and soil tiles and
 * ground texture, its trees and shrubs (utils/tree) and its two-block rocks. Low cells are plain grass tiles;
 * taller ones are a soil-coloured cliff with a grass tile on top, a few left as bare soil so the tops blend
 * grass <-> soil exactly like the city ground. The highest cells keep a snow cap.
 */
export function mountainCell(add:Add,plant:Plant,x:number,z:number,bottom:number,top:number,crest:number,r:()=>number){
 const snow=top>=crest*.78,low=top<.6,bare=!snow&&!low&&r()<.2;
 const grass=()=>GRASS[Math.floor(r()*3)];
 // The whole column, sides included, is a grass tile; bare cells get a thin soil slab on top instead.
 const body=add(1.5,top-bottom,1.5,x,(top+bottom)/2,z,grass());
 groundTexture(body,'grass');
 if(bare){const soil=add(1.5,.06,1.5,x,top+.02,z,DIRT);groundTexture(soil,'dirt');}
 if(snow){
  // Overhanging snow slab with a few drips down the sides.
  const cap=add(1.54,.14,1.54,x,top-.05,z,SNOW);groundTexture(cap,'dirt');
  for(let i=0;i<3;i++){const a=Math.floor(r()*4),u=(r()-.5)*1.1,len=.15+r()*.3,o=.77;
   a<2?add(.18,len,.04,x+u,top-.12-len/2,z+(a?o:-o),SNOW):add(.04,len,.18,x+(a===2?o:-o),top-.12-len/2,z+u,SNOW);}
  return;
 }
 const ground=top+(bare?.05:0),k=r(),px=x+(r()-.5)*.5,pz=z+(r()-.5)*.5,seed=Math.floor(r()*0x7fffffff);
 if(bare){if(k<.5)rock(add,px,ground,pz);return;}
 if(k<.38)plant(treeGeometry(seed,k<.19?1+Math.floor(r()*3):0),px,ground,pz);
 else if(k<.54)plant(shrubGeometry(seed,2+Math.floor(r()*3)),px,ground,pz);
 else if(k<.64)rock(add,px,ground,pz);
}
/** The build area's rock: two stacked blocks. */
function rock(add:Add,x:number,y:number,z:number){
 add(.7,.4,.6,x,y+.2,z,ROCK);add(.44,.25,.4,x+.1,y+.48,z-.04,ROCK_TOP);
}
