import * as T from 'three';
import type {Object3D} from 'three';
import {box} from './mesh';
import {seeded} from './math';
import {batchStatic} from './batch';

/** Shade, base and sunlit leaf tones; three tones give the voxel crowns visible volume. */
type Leaves=[number,number,number];
const broadleaf:Leaves[]=[[0x587d5e,0x719b71,0x97b97d],[0x4f7562,0x648e70,0x85aa78],[0x61805a,0x77976a,0xa0b880],[0x4b7262,0x5f8870,0x80a481]];
const needle:Leaves[]=[[0x42665a,0x547c68,0x6f9a78],[0x4a6956,0x5d8165,0x7ca27c]];
const accents=[0xe8a6a6,0xf1e2c8,0xd9764e];
const BARK=0x806850,BARK_DARK=0x6a5442;

/** One leaf clump: shaded underside, main mass, sunlit cap and one stepped side bump. */
function clump(g:Object3D,r:()=>number,x:number,y:number,z:number,w:number,h:number,d:number,[shade,leaf,light]:Leaves){
 box(g,w*.84,h*.36,d*.84,x,y-h*.36,z,shade);
 box(g,w,h*.6,d,x,y,z,leaf);
 box(g,w*.64,h*.3,d*.64,x+(r()-.5)*w*.16,y+h*.4,z+(r()-.5)*d*.16,light);
 const side=Math.floor(r()*4),sign=side%2?1:-1,along=(r()-.5)*.5;
 const ox=side<2?sign*w*.5:along*w,oz=side<2?along*d:sign*d*.5;
 box(g,w*.36,h*.34,d*.36,x+ox,y+(r()-.35)*h*.3,z+oz,leaf);
}

/** A short angled limb from the crown pivot towards a clump. */
function limb(g:Object3D,x:number,y:number,z:number,thickness:number){
 const length=Math.hypot(x,y,z),m=box(g,thickness,length,thickness,x/2,y/2,z/2,BARK);
 m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(x,y,z).normalize());
}

/** Low shrubs scattered around (x,z); `spread` keeps them inside the cell, `avoid` keeps a trunk clear. */
export function voxelBushes(parent:Object3D,x:number,z:number,seed:number,count:number,spread=.5,avoid=0){
 const random=seeded(seed),group=new T.Group();
 for(let i=0;i<count;i++){
  const tones=broadleaf[Math.floor(random()*broadleaf.length)];
  let ox=0,oz=0;
  for(let tries=0;tries<6;tries++){ox=(random()*2-1)*spread;oz=(random()*2-1)*spread;if(Math.hypot(ox,oz)>=avoid)break;}
  const w=.26+random()*.2,h=.18+random()*.14,d=w*(.8+random()*.35);
  // Shaded skirt, main mound, sunlit top, then one or two lobes for an uneven outline.
  box(group,w*1.06,h*.34,d*1.06,x+ox,h*.17,z+oz,tones[0]);
  box(group,w,h*.62,d,x+ox,h*.5,z+oz,tones[1]);
  box(group,w*.6,h*.26,d*.6,x+ox+(random()-.5)*w*.2,h*.92,z+oz+(random()-.5)*d*.2,tones[2]);
  for(let j=0,lobes=1+Math.floor(random()*2);j<lobes;j++){
   const a=random()*Math.PI*2,s=.45+random()*.2;
   box(group,w*s,h*s*1.1,d*s,x+ox+Math.cos(a)*w*.5,h*s*.55,z+oz+Math.sin(a)*d*.5,random()<.5?tones[1]:tones[0]);
  }
  if(random()<.3){const accent=accents[Math.floor(random()*accents.length)];
   for(let j=0;j<3;j++)box(group,.05,.05,.05,x+ox+(random()-.5)*w*.8,h*(.75+random()*.25),z+oz+(random()-.5)*d*.8,accent);}
 }
 batchStatic(group);
 // Re-parent the merged meshes so callers see plain children, like the tree trunk boxes.
 for(const child of [...group.children])parent.add(child);
}

/** Stable per-cell trees: round, conifer, poplar and forked forms, all within their planting cell. */
export function voxelTree(parent:Object3D,x:number,z:number,seed:number){
 const random=seeded(seed),roll=random();
 const shape=roll<.4?0:roll<.65?1:roll<.8?2:3;
 const height=.8+random()*.45,width=.8+random()*.35;
 const leaves=(shape===1?needle:broadleaf)[Math.floor(random()*(shape===1?needle:broadleaf).length)];
 const trunk=(shape===1?.3:shape===2?.42:.48+random()*.2)*height,thickness=(shape===2?.09:.11)+random()*.05;
 // Trunk with a darker root flare.
 box(parent,thickness,trunk+.06,thickness,x,(trunk+.06)/2,z,BARK);
 box(parent,thickness*1.6,.06,thickness*1.6,x,.03,z,BARK_DARK);
 const dx=(random()-.5)*.14,dz=(random()-.5)*.14;
 // Crown boxes live in a pivot group at the trunk top so the wind can tilt them.
 const crown=new T.Group();crown.name='crown';crown.position.set(x,trunk,z);parent.add(crown);
 if(shape===0){
  const w=.62*width,h=.5*height;
  clump(crown,random,dx,h*.55,dz,w,h,w*.92,leaves);
  for(let i=0;i<2;i++){
   const angle=random()*Math.PI*2+i*Math.PI,s=.42+random()*.1,ox=Math.cos(angle)*w*.36,oz=Math.sin(angle)*w*.36;
   limb(crown,ox,h*.3,oz,thickness*.6);
   clump(crown,random,ox,h*.32,oz,w*s,h*.55,w*s,leaves);
  }
  clump(crown,random,dx*.5,h*1.12,dz*.5,w*.48,h*.42,w*.48,leaves);
  // Some round trees carry blossom or fruit specks on the sunlit side.
  if(random()<.22){const accent=accents[Math.floor(random()*accents.length)];
   for(let i=0;i<4;i++){const a=random()*Math.PI*2;box(crown,.06,.06,.06,dx+Math.cos(a)*w*.5,h*(.45+random()*.6),dz+Math.sin(a)*w*.5,accent);}}
 }else if(shape===1){
  // Stacked, narrowing tiers with a sunlit cap on each and a pointed tip.
  const tiers=3+Math.floor(random()*2),w=.78*width,step=.3*height;
  for(let i=0;i<tiers;i++){
   const s=w*(1-i/(tiers+.6)),y=.05+i*step*.72,ox=(random()-.5)*.05,oz=(random()-.5)*.05;
   box(crown,s*.88,step*.6,s*.88,ox,y+step*.2,oz,i===0?leaves[0]:leaves[1]);
   box(crown,s*.5,step*.22,s*.5,ox-s*.08,y+step*.6,oz-s*.08,leaves[2]);
  }
  const top=.05+tiers*step*.72;
  box(crown,.14*width,step*.6,.14*width,0,top+step*.2,0,leaves[1]);
  box(crown,.07,step*.4,.07,0,top+step*.6,0,leaves[2]);
 }else if(shape===2){
  // Poplar: a tall, narrow column of overlapping clumps.
  const w=.42*width,h=.38*height;
  for(let i=0;i<3;i++)clump(crown,random,dx*(1-i*.3),h*(.5+i*.75),dz*(1-i*.3),w*(1-i*.16),h,w*(1-i*.16),leaves);
  box(crown,w*.3,h*.4,w*.3,0,h*2.55,0,leaves[2]);
 }else{
  // Forked: two limbs carry separate clumps around a small centre tuft.
  const w=.44*width,h=.42*height,angle=random()*Math.PI;
  for(const sign of [1,-1]){
   const ox=Math.cos(angle)*.24*sign,oz=Math.sin(angle)*.24*sign,oy=h*(sign>0?.9:.62);
   limb(crown,ox,oy,oz,thickness*.7);
   clump(crown,random,ox,oy+h*.2,oz,w,h,w,leaves);
  }
  clump(crown,random,0,h*.5,0,w*.6,h*.6,w*.6,leaves);
 }
 // Merge per-material so the extra detail costs a handful of draw calls per tree.
 batchStatic(crown);
}
