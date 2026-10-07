import * as T from 'three';
import type {BuildingData} from '../data/buildings';
import {box,litBox} from '../utils/mesh';
import {doorLayout} from './BuildingDoors';

/** Derived shades stay coherent with each building's palette; shared hexes keep materials cached. */
const shade=(hex:number,f:number)=>new T.Color(hex).multiplyScalar(f).getHex();
const tint=(hex:number,f:number)=>new T.Color(hex).lerp(new T.Color(0xffffff),f).getHex();

/**
 * Fine facade/roof detailing, kept out of the structural body:
 * the group is excluded from structuralBounds (roads, merges) like decorations.
 * Everything uses shared box geometry + cached materials and is batchStatic'd later.
 */
export function refineBuilding(parent:T.Group,data:BuildingData,variant:number){
 const g=new T.Group();g.name='facade-detail';parent.add(g);
 const {width:w,depth:d,height:h,level:l}=data,front=d/2,side=w/2;
 const trim=shade(data.color,.72),sill=tint(data.color,.28),stone=shade(data.color,.55);
 const floors=Math.max(1,Math.floor(h/.65)),cols=Math.max(2,Math.floor(w/.55));
 const step=(h-.65)/Math.max(1,floors-1),rowY=(f:number)=>-h/2+.5+f*step;
 const door=doorLayout(data,variant);

 // Two-tier base plinth grounding the body.
 box(g,w+.24,.1,d+.24,0,-h/2+.05,0,stone);

 // Entrance: steps, lintel and lamps.
 box(g,door.width+.5,.07,.3,0,-h/2+.035,front+.15,stone);
 box(g,door.width+.34,.07,.18,0,-h/2+.105,front+.09,shade(data.color,.65));
 box(g,door.width+.2,.08,.06,0,-h/2+door.height+.055,front+.045,tint(data.color,.3));
 if(l<=2)litBox(g,.06,.1,.06,0,-h/2+door.height+.12,front+.05,0x8a7a5c,0xffc780,1.5);
 else for(const s of [-1,1])litBox(g,.06,.1,.06,s*(door.width/2+.14),-h/2+door.height+.1,front+.05,0x8a7a5c,l>=7?0x77eee0:0xffc780,1.5);

 // Continuous sill ledges under every window row (front row 0 skipped: the door lives there).
 for(let f=0;f<floors;f++){
  const y=rowY(f)-.19;
  if(f>0)box(g,w*.82,.045,.07,0,y,front+.035,sill);
  box(g,w*.82,.045,.07,0,y,-front-.035,sill);
  box(g,.07,.045,d*.82,side+.035,y,0,sill);
  box(g,.07,.045,d*.82,-side-.035,y,0,sill);
 }

 if(l<=2){
  // Houses: window shutters on the front.
  for(let f=0;f<floors;f++)for(let c=0;c<cols;c++){
   const y=rowY(f),x=(c-(cols-1)/2)*w/(cols+1);
   if(Math.abs(x)<door.width/2+.17&&y-.16<-h/2+door.height+.1)continue;
   box(g,.055,.3,.03,x-.19,y,front+.02,data.roof);
   box(g,.055,.3,.03,x+.19,y,front+.02,data.roof);
  }
 }else{
  // Flat roofs: water tank, vent pipes, antenna.
  box(g,.4,.3,.4,w*.28,h/2+.33,-d*.25,0x9aa8a4);
  box(g,.44,.06,.44,w*.28,h/2+.5,-d*.25,0x7d8c88);
  box(g,.07,.34,.07,w*.05,h/2+.32,d*.3,0x8b9a94);
  box(g,.11,.04,.11,w*.05,h/2+.5,d*.3,0x6d7a74);
  if(l<=4){
   box(g,.05,.7,.05,-w*.38,h/2+.53,-d*.32,0x7d8c88);
   box(g,.09,.09,.09,-w*.38,h/2+.9,-d*.32,0x9aa8a4);
  }
 }

 if(l>=3&&l<=4){
  // Balconies on the front, AC units on the back.
  for(let f=1;f<floors;f+=2){
   const bx=(f%4<2?-1:1)*w*.22,y=rowY(f);
   box(g,.66,.07,.24,bx,y-.34,front+.12,trim);
   box(g,.66,.05,.035,bx,y-.12,front+.22,shade(data.color,.5));
   for(const s of [-1,1])box(g,.04,.2,.04,bx+s*.29,y-.22,front+.22,shade(data.color,.5));
  }
  box(g,.24,.2,.16,-w*.28,rowY(1)-.3,-front-.08,0xa9b3ac);
  box(g,.2,.14,.02,-w*.28,rowY(1)-.3,-front-.17,0x6d7a74);
 }

 if(l===5){
  // High-rise: second belt course and a setback penthouse.
  box(g,w+.26,.14,d+.26,0,-h*.08,0,data.roof);
  box(g,w*.5,.5,d*.5,0,h/2+.43,0,shade(data.color,.95));
  box(g,w*.54,.07,d*.54,0,h/2+.71,0,shade(data.roof,.85));
 }

 if(l===7){
  // Tower crown with a beacon on top.
  box(g,w*.7,.5,d*.7,0,h/2+.43,0,shade(data.color,.9));
  litBox(g,w*.72,.07,.1,0,h/2+.62,d*.36,0x488b85,0x63e9dc,3);
  litBox(g,w*.72,.07,.1,0,h/2+.62,-d*.36,0x488b85,0x63e9dc,3);
  litBox(g,.1,.3,.1,0,h/2+.83,0,0x488b85,0x63e9dc,3);
 }

 if(l===8){
  // Arcology: crown tier around the spire, base buttress fins, spire beacon.
  box(g,w*.6,1,d*.6,0,h/2+.68,0,shade(data.color,.92));
  box(g,w*.64,.1,d*.64,0,h/2+1.2,0,shade(data.roof,.8));
  for(const sx of [-1,1])for(const sz of [-1,1])box(g,.16,h*.2,.4,sx*side,-h/2+h*.1,sz*(front-.1),shade(data.color,.85));
  litBox(g,.14,.14,.14,0,h/2+1.88,0,0x8fe7df,0x77eee0,2.5);
 }

 if(l>=9){
  // Utopia Tower: twin setbacks with glowing rings, observation band, mast beacon.
  box(g,w*.78,2.2,d*.78,0,h/2+1.28,0,shade(data.color,.92));
  litBox(g,w*.8,.09,d*.8,0,h/2+.24,0,0x488b85,0x63e9dc,3);
  box(g,w*.55,1.6,d*.55,0,h/2+3.18,0,shade(data.color,.85));
  litBox(g,w*.57,.09,d*.57,0,h/2+2.44,0,0x488b85,0x63e9dc,3);
  for(const sz of [-1,1])litBox(g,w*.44,.3,.06,0,h/2+3.5,sz*d*.28,0x446875,0xffc780,2.5);
  box(g,.14,3,.14,0,h/2+5.4,0,shade(data.color,.7));
  litBox(g,.16,.16,.16,0,h/2+6.95,0,0x8fe7df,0x77eee0,2.5);
 }
}
