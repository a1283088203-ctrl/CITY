import * as T from 'three';
import type {BuildingData} from '../data/buildings';
import {box,litBox} from '../utils/mesh';

export const RESIDENTIAL_VARIANTS=['花草阳台','遮阳光伏','生活设备'] as const;
export const randomBuildingVariant=()=>Math.floor(Math.random()*RESIDENTIAL_VARIANTS.length);

/** Small cosmetic additions only: all variants share the same structural body. */
export function decorateResidence(parent:T.Group,data:BuildingData,variant:number){
 const g=new T.Group();g.name='residential-decoration';parent.add(g);
 const {width:w,depth:d,height:h,level:l}=data,front=d/2+.06;
 const planter=(x:number,y:number,z:number)=>{
  box(g,.32,.1,.13,x,y,z,0xa77860);
  box(g,.26,.13,.11,x,y+.1,z,l>=7?0x639b90:0x6e9957);
  if(l<=4)box(g,.06,.06,.06,x+.08,y+.19,z,0xe7b179);
 };
 if(variant===0){
  // Flower boxes become scattered balcony gardens on taller homes.
  const rows=l<=2?1:Math.min(4,Math.ceil(l/2));
  for(let i=0;i<rows;i++){
   const y=l<=2?-h/2+.32:-h/2+.8+i*(h-1.4)/rows;
   planter(-w*.25,y,front);planter(w*.25,y,front);
   if(l>=5)planter(w*.25,y,-front);
  }
  if(l>=3){planter(w*.24,h/2+.27,-d*.22);planter(w*.24,h/2+.27,d*.22);}
 }else if(variant===1){
  // A modest striped canopy below the windows; roof panels on flat-roof blocks.
  box(g,w*.46,.08,.22,0,-h/2+.72,front+.02,0xcdb58b);
  for(let i=0;i<3;i++)box(g,w*.075,.085,.225,(i-1)*w*.15,-h/2+.725,front+.02,data.roof);
  if(l>=3){
   for(let i=0;i<2;i++){
    box(g,w*.25,.08,d*.22,w*.23,h/2+.24,(i-.5)*d*.3,0x899eaa);
    box(g,w*.22,.025,d*.19,w*.23,h/2+.295,(i-.5)*d*.3,0x395e80);
   }
  }else{
   box(g,.25,.06,.25,-w*.3,-h/2+.04,-d*.29,0xab8265);
   box(g,.04,.62,.04,-w*.3,-h/2+.36,-d*.29,0x806f59);
  }
  if(l>=7)litBox(g,.32,.12,.04,-w*.28,h*.12,front,0x668b99,0x87d9e4,1.6);
 }else{
  // Utility details: small mailboxes/vents, then tanks and facade service pipes.
  box(g,.2,.22,.12,-w*.3,-h/2+.25,front,0x718c8a);
  box(g,.13,.025,.015,-w*.3,-h/2+.29,front+.07,0xd6c58b);
  if(l<=2){
   box(g,.2,.27,.15,w*.3,-h/2+.32,-front,0x8d9890);
   for(let i=0;i<3;i++)box(g,.13,.018,.015,w*.3,-h/2+.24+i*.06,-front-.085,0x536f70);
  }else{
   box(g,w*.2,.25,d*.22,w*.23,h/2+.305,-d*.18,0x94a4a0);
   box(g,w*.22,.035,d*.24,w*.23,h/2+.4475,-d*.18,0x637f83);
   box(g,.055,h*.6,.055,-w*.36,0,-front,0x93a5a0);
   if(l>=7)litBox(g,.055,h*.18,.06,-w*.36,h*.15,-front-.035,0x54899a,0xa5dadd,1.4);
  }
 }
 parent.userData.variant=variant;
}
