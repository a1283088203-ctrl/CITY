import * as T from 'three';
import type {BuildingData} from '../data/buildings';
import {box,litBox,windowBox} from '../utils/mesh';

/* Modern residence for level 6, between the high-rise and the mega tower: white concrete,
 * full-width glazing between thin floor slabs, accent spandrels and wrap-around glass balconies.
 * Built from the same shared boxes and cached materials as the classic models, then batched by Building. */
export const isModern=(level:number)=>level===6;

const SLAB=0xf4f2ec,PLINTH=0x5d6668,METAL=0x3f4a4f,RAIL=0xa9d0d8,RAIL_TOP=0x56646a,GLASS=0x446875;
const GREEN=[0x6f9e58,0x86b366,0x5b8a4b],SOLAR=0x37557a,POT=0xb7b2a8,PLANT_ROOM=0xc9ccc8;
const ACCENTS=[0xb98a5c,0xc9785a,0x8fae9c];

/** A wall face: front/back run along x, the sides along z. */
type Face={side:boolean;sign:number;half:number;span:number};
const facesOf=(w:number,d:number):Face[]=>[
 {side:false,sign:1,half:d/2,span:w},{side:false,sign:-1,half:d/2,span:w},
 {side:true,sign:1,half:w/2,span:d},{side:true,sign:-1,half:w/2,span:d}];
/** A box on a face: `u` runs along it, `out` is the distance in front of the wall. */
function onFace(g:T.Object3D,f:Face,pw:number,ph:number,depth:number,u:number,y:number,out:number,hex:number){
 const t=f.sign*(f.half+out);
 return f.side?box(g,depth,ph,pw,t,y,u,hex):box(g,pw,ph,depth,u,y,t,hex);
}
function pane(g:T.Object3D,f:Face,pw:number,ph:number,u:number,y:number){
 const t=f.sign*(f.half+.012);
 return f.side?windowBox(g,.02,ph,pw,t,y,u,GLASS,0xffc780,2.5,.6):windowBox(g,pw,ph,.02,u,y,t,GLASS,0xffc780,2.5,.6);
}
/** Glazing across a face, inset from the corners and split by white piers. */
function ribbon(g:T.Object3D,f:Face,y:number,ph:number,skip?:(u:number)=>boolean){
 const span=f.span-.3,cols=Math.max(2,Math.round(span/.52)),pw=span/cols;
 for(let c=0;c<cols;c++){const u=-span/2+pw*(c+.5);if(!skip?.(u))pane(g,f,pw-.14,ph,u,y);}
}
/** Cantilevered balcony: slab, glass balustrade with a dark handrail, optional potted plant. */
function balcony(g:T.Object3D,f:Face,u:number,y:number,width:number,depth:number,plant:boolean){
 onFace(g,f,width,.05,depth,u,y,depth/2,SLAB);
 onFace(g,f,width,.17,.015,u,y+.11,depth-.01,RAIL);
 for(const s of [-1,1])onFace(g,f,.015,.17,depth,u+s*width/2,y+.11,depth/2,RAIL);
 onFace(g,f,width,.025,.03,u,y+.2,depth-.01,RAIL_TOP);
 if(plant){onFace(g,f,.16,.1,.1,u-width*.32,y+.075,depth*.45,POT);onFace(g,f,.18,.14,.12,u-width*.32,y+.18,depth*.45,GREEN[1]);}
}

export function modernBuilding(g:T.Group,data:BuildingData,variant:number){
 const {width:w,depth:d,height:h}=data,F=facesOf(w,d),[front,back]=F;
 const detail=new T.Group();detail.name='facade-detail';
 const decor=new T.Group();decor.name='residential-decoration';
 const accent=ACCENTS[((variant%3)+3)%3],floors=Math.max(2,Math.floor(h/.65)),step=h/floors;
 const base=(f:number)=>-h/2+f*step,mid=(f:number)=>base(f)+step*.52,ph=step*.5,top=h/2+.18;

 // Structure first: body, plinth, roof slab. Tests and the placement outline rely on this child order.
 box(g,w,h,d,0,0,0,data.color);
 box(g,w+.08,.14,d+.08,0,-h/2+.07,0,PLINTH);
 box(g,w+.12,.18,d+.12,0,h/2+.09,0,data.roof);

 // White floor slabs and corner columns, with glazing between them.
 for(let f=1;f<floors;f++)box(detail,w+.1,.08,d+.1,0,base(f),0,SLAB);
 for(const sx of [-1,1])for(const sz of [-1,1])box(detail,.14,h-.1,.14,sx*(w/2-.04),.02,sz*(d/2-.04),SLAB);
 for(const f of F)for(let fl=1;fl<floors;fl++)ribbon(g,f,mid(fl),ph);

 // Glazed lobby with a centred double door and a lit canopy.
 const lobbyH=step*.72,lobbyY=-h/2+.14+lobbyH/2,doorW=.5;
 ribbon(g,front,lobbyY,lobbyH,u=>Math.abs(u)<doorW/2+.12);
 for(const f of F.slice(1))ribbon(g,f,lobbyY,lobbyH*.8);
 onFace(g,front,doorW+.06,lobbyH+.04,.02,0,lobbyY,.014,METAL);
 for(const s of [-1,1])onFace(g,front,doorW*.44,lobbyH-.05,.01,s*doorW*.24,lobbyY-.01,.026,0x5f8c97);
 onFace(detail,front,w*.5,.05,.4,0,lobbyY+lobbyH/2+.08,.2,SLAB);
 litBox(detail,w*.44,.02,.3,0,lobbyY+lobbyH/2+.045,d/2+.2,0xf2e6c8,0xffd9a0,1.6);

 // Glass parapet around the roof edge.
 for(const s of [-1,1]){
  box(detail,w+.08,.16,.02,0,h/2+.26,s*(d/2+.05),RAIL);box(detail,w+.1,.025,.04,0,h/2+.35,s*(d/2+.05),RAIL_TOP);
  box(detail,.02,.16,d+.08,s*(w/2+.05),h/2+.26,0,RAIL);box(detail,.04,.025,d+.1,s*(w/2+.05),h/2+.35,0,RAIL_TOP);
 }

 // Accent spandrel panels, then balconies that alternate sides floor by floor and wrap the corner.
 for(const f of [front,back])for(let fl=1;fl<floors;fl++)onFace(detail,f,f.span-.06,step*.16,.012,0,base(fl)+step*.13,.006,accent);
 for(let fl=2;fl<floors;fl++){
  const s=fl%2?1:-1,side=F[s>0?2:3];
  balcony(decor,front,s*w*.2,base(fl),w*.56,.3,fl%4===1);
  balcony(decor,back,-s*w*.2,base(fl),w*.56,.3,false);
  balcony(decor,side,d*.3,base(fl),d*.42,.26,false);
 }

 // Roof: plant room and solar panels.
 box(detail,w*.36,.42,d*.32,w*.18,top+.21,-d*.2,PLANT_ROOM);
 box(detail,w*.38,.04,d*.34,w*.18,top+.44,-d*.2,METAL);
 for(let i=0;i<3;i++){const x=-w*.3+i*w*.17;box(detail,w*.14,.05,d*.26,x,top+.08,d*.12,METAL);box(detail,w*.12,.02,d*.24,x,top+.115,d*.12,SOLAR);}

 g.add(detail,decor);g.userData.variant=variant;
}
