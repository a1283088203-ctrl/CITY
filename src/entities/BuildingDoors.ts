import type {Group} from 'three';
import type {BuildingData} from '../data/buildings';
import {box,litBox} from '../utils/mesh';

export function doorLayout(data:BuildingData,variant:number){
 const tier=data.level<=2?0:data.level<=5?1:2;
 return {style:tier*3+((variant%3)+3)%3,width:[.4,.58,.72][tier],height:[.58,.68,.76][tier]};
}

/** Nine pixel entrances, stable across preview and placement; no extra lights. */
export function buildingDoor(g:Group,data:BuildingData,variant:number){
 const {style,width:w,height:h}=doorLayout(data,variant),bottom=-data.height/2,z=data.depth/2;
 const frame=style<3?0x9c8463:0x52696b,glass=0x5b9ca8,wood=0x8e694e,ink=0x304b51,trim=0xd6c397;
 const part=(pw:number,ph:number,x:number,y:number,color:number,layer=0)=>box(g,pw,ph,.008,x,bottom+y,z+.052+layer*.012,color);
 part(w+.08,h+.035,0,h/2,frame);
 part(w,h,0,h/2,style===0||style===2?wood:glass,1);
 part(w+.08,.035,0,.018,trim,2);
 if(style===0){ // Plank door with a little brass handle.
  for(const x of [-w*.24,w*.24])part(.018,h-.07,x,h/2,0xa5825e,2);
  part(.035,.045,w*.28,h*.48,trim,2);
 }else if(style===1){ // Half-glazed cottage door.
  part(w-.07,h*.38,0,h*.72,glass,2);part(w-.07,h*.36,0,h*.25,0x648178,2);
  part(.022,h*.38,0,h*.72,trim,3);part(.035,.035,w*.29,h*.46,trim,3);
 }else if(style===2){ // Stepped arch, built from pixels rather than curves.
  part(w+.06,.055,0,h-.025,trim,2);part(w*.72,.045,0,h+.022,trim,2);
  part(w*.42,.038,0,h+.061,trim,2);part(w*.35,.13,0,h*.7,glass,2);
  part(.035,.035,w*.28,h*.43,trim,2);
 }else if(style===3||style===6){ // Apartment double door / tower sliding glass.
  part(.025,h,0,h/2,ink,2);
  for(const side of [-1,1])part(.025,.16,side*.065,h*.46,trim,3);
  if(style===6){part(w,.05,0,h-.04,trim,2);part(w*.75,.018,0,h*.32,0x94b7b4,2);}
 }else if(style===4){ // Deep framed lobby entrance.
  part(.07,h,-w*.43,h/2,trim,2);part(.07,h,w*.43,h/2,trim,2);
  part(w+.1,.07,0,h+.035,frame,2);part(.04,.14,w*.2,h*.43,trim,3);
 }else if(style===5){ // Door with divided transom.
  part(w,.035,0,h*.72,trim,2);part(.025,h*.25,0,h*.86,trim,2);
  part(w*.35,h*.58,-w*.22,h*.34,ink,2);part(.025,.12,w*.13,h*.38,trim,3);
 }else if(style===7){ // Industrial panels and an amber access terminal.
  part(w-.08,h-.08,0,h/2,0x73878a,2);
  for(let i=1;i<=3;i++)part(w-.12,.02,0,h*i/4,ink,3);
  part(.045,.09,w*.34,h*.53,0xe1b66b,3);
 }else{ // Cyan-edged megacity portal; follows the existing night cycle.
  part(w-.1,h-.06,0,h/2,ink,2);part(.025,h-.08,0,h/2,glass,3);
  for(const side of [-1,1])litBox(g,.024,h*.8,.008,side*(w/2-.035),bottom+h*.5,z+.088,0xdfe8ea,0xfff1d8,1.5);
  part(w*.65,.04,0,h-.03,trim,3);
 }
 g.userData.doorStyle=style;
}
