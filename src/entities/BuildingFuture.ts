import * as T from 'three';
import type {BuildingData} from '../data/buildings';
import {box,litBox,windowBox} from '../utils/mesh';
import {facesOf,onFace,type Face} from './BuildingModern';

/* Future residences for levels 8–10: clean and bright rather than gritty. Pearl-white towers with tall vertical
 * glazing between slim white fins (the modern tiers use horizontal slabs and ribbon windows instead), floating
 * "halo" rings with soft warm light strips, cantilevered frosted-glass pods, planted rings and roofs, and set-back
 * glass crowns with a slender spire. 8 Skyline Residence · 9 Halo Arcology · 10 Utopia Tower.
 * Glass skybridges between these towers are drawn by DecorationSystem. */
export const isFuture=(level:number)=>level>=8;

const TRIM=0xf8f8f4,FIN=0xe2e8e7,PLINTH=0xc9d2d3,FRAME=0xd9e1e2,GLASS=0x6f97ab,FROST=0xb3d6df,DOOR_GLASS=0x9fc7d3;
const RAIL=0xbfe0e8,LAWN=0x95c27a,GREEN=[0x7fb069,0x95c27a,0x6aa060],TRUNK=0x8a6c52,STRIP=0xf3eadb,GLOW=0xffe4bf;
const BEACON=0xf6efe2,BEACON_GLOW=0xfff2d8;

/** One glass pane on a face; warm and cool interiors alternate so the lit towers read soft, not neon. */
function pane(g:T.Object3D,f:Face,pw:number,ph:number,u:number,y:number,cool:boolean){
 const t=f.sign*(f.half+.012),emission=cool?0xdff0ff:0xffdcae;
 return f.side?windowBox(g,.02,ph,pw,t,y,u,GLASS,emission,2.2,.7):windowBox(g,pw,ph,.02,u,y,t,GLASS,emission,2.2,.7);
}
/** Column layout across a face: `cols` bays of width `pw`, inset from the corners. */
function bays(f:Face,inset=.3,target=.46){const span=f.span-inset,cols=Math.max(3,Math.round(span/target));return {span,cols,pw:span/cols};}

/** Floating ring around a box of w×d: four white slabs `out` deep, with a soft light strip under the outer edge. */
function halo(g:T.Object3D,w:number,d:number,y:number,out:number,glow=true){
 const t=.07;
 for(const s of [-1,1]){
  box(g,w+out*2,t,out,0,y,s*(d/2+out/2),TRIM);
  box(g,out,t,d,s*(w/2+out/2),y,0,TRIM);
  if(!glow)continue;
  litBox(g,w+out*2-.04,.018,.03,0,y-t/2-.01,s*(d/2+out-.02),STRIP,GLOW,1.3);
  litBox(g,.03,.018,d,s*(w/2+out-.02),y-t/2-.01,0,STRIP,GLOW,1.3);
 }
}
/** Hedges along a halo ring, plus a few small trees on wide rings. */
function ringGarden(g:T.Object3D,w:number,d:number,y:number,out:number,trees:boolean){
 for(const s of [-1,1]){
  box(g,w*.62,.1,out*.5,0,y+.085,s*(d/2+out/2),GREEN[1]);
  box(g,out*.5,.1,d*.55,s*(w/2+out/2),y+.085,0,GREEN[2]);
  if(trees)for(const k of [-1,1])tree(g,k*w*.42,y+.035,s*(d/2+out/2),.8,s+k+2);
 }
}
function tree(g:T.Object3D,x:number,y:number,z:number,size:number,k:number){
 box(g,.06*size,.28*size,.06*size,x,y+.14*size,z,TRUNK);
 box(g,.34*size,.28*size,.32*size,x,y+.4*size,z,GREEN[k%3]);
 box(g,.2*size,.14*size,.18*size,x+.04*size,y+.6*size,z,GREEN[(k+1)%3]);
}
/** Cantilevered frosted-glass pod with white floor and roof slabs and a little planting on top. */
function pod(g:T.Object3D,f:Face,u:number,y:number,pw:number,ph:number,depth:number){
 onFace(g,f,pw+.06,.05,depth,u,y-ph/2-.025,depth/2,TRIM);
 onFace(g,f,pw+.06,.05,depth,u,y+ph/2+.025,depth/2,TRIM);
 onFace(g,f,pw,ph,depth-.04,u,y,(depth-.04)/2,FROST);
 onFace(g,f,pw*.5,.08,depth*.5,u-pw*.15,y+ph/2+.09,depth*.5,GREEN[0]);
}
/** A set-back crown block with its own glass band and a white cap; returns the height of its top. */
function crown(g:T.Object3D,cw:number,ch:number,cd:number,y0:number,color:number){
 box(g,cw,ch,cd,0,y0+ch/2,0,color);
 for(const f of facesOf(cw,cd)){const {span,cols,pw}=bays(f,.2,.4);for(let c=0;c<cols;c++)pane(g,f,pw-.1,ch*.62,-span/2+pw*(c+.5),y0+ch*.52,c%2===1);}
 box(g,cw+.1,.06,cd+.1,0,y0+ch+.03,0,TRIM);
 return y0+ch+.06;
}

export function futureBuilding(g:T.Group,data:BuildingData,variant:number){
 const {width:w,depth:d,height:h,level:l}=data,F=facesOf(w,d),[front,back]=F;
 const detail=new T.Group();detail.name='facade-detail';
 const decor=new T.Group();decor.name='residential-decoration';
 const floors=Math.max(2,Math.floor(h/.65)),step=h/floors,base=(f:number)=>-h/2+f*step,top=h/2+.18;

 // Structure first: body, plinth, roof slab. Tests and the placement outline rely on this child order.
 box(g,w,h,d,0,0,0,data.color);
 box(g,w+.08,.14,d+.08,0,-h/2+.07,0,PLINTH);
 box(g,w+.12,.18,d+.12,0,h/2+.09,0,data.roof);

 // Glass lobby with a centred double door and a lit canopy.
 const lobbyH=step*.8,lobbyY=-h/2+.14+lobbyH/2,doorW=.56;
 F.forEach((f,fi)=>{const {span,cols,pw}=bays(f);for(let c=0;c<cols;c++){const u=-span/2+pw*(c+.5);if(fi===0&&Math.abs(u)<doorW/2+.15)continue;pane(g,f,pw-.1,fi===0?lobbyH:lobbyH*.8,u,lobbyY,c%2===1);}});
 onFace(g,front,doorW+.08,lobbyH+.05,.02,0,lobbyY,.014,FRAME);
 for(const s of [-1,1])onFace(g,front,doorW*.45,lobbyH-.06,.01,s*doorW*.24,lobbyY-.01,.026,DOOR_GLASS);
 onFace(detail,front,w*.55,.05,.45,0,lobbyY+lobbyH/2+.08,.22,TRIM);
 litBox(detail,w*.5,.02,.34,0,lobbyY+lobbyH/2+.045,d/2+.22,STRIP,GLOW,1.6);

 // Tall vertical glazing on every upper floor, with slim white fins on the bay lines and rounded white corners.
 for(const f of F){
  const {span,cols,pw}=bays(f);
  for(let fl=1;fl<floors;fl++)for(let c=0;c<cols;c++)pane(g,f,pw-.13,step*.78,-span/2+pw*(c+.5),base(fl)+step*.5,(c+fl)%2===1);
  for(let k=1;k<cols;k++)onFace(detail,f,.05,h-step,.06,-span/2+pw*k,step/2,.03,FIN);
 }
 for(const sx of [-1,1])for(const sz of [-1,1]){
  box(detail,.2,h-.1,.2,sx*(w/2-.05),.02,sz*(d/2-.05),TRIM);
  box(detail,.12,h-.1,.12,sx*(w/2+.02),.02,sz*(d/2+.02),FIN);
 }

 // Glass parapet and a planted roof.
 for(const s of [-1,1]){
  box(detail,w+.08,.14,.02,0,h/2+.25,s*(d/2+.05),RAIL);box(detail,.02,.14,d+.08,s*(w/2+.05),h/2+.25,0,RAIL);
 }
 box(detail,w*.9,.04,d*.9,0,top+.02,0,LAWN);

 // Each tier: halo floors (ring storeys), pods and a crown.
 const halos=l===8?[4,8,12].filter(f=>f<floors-1):l===9?[Math.round(floors/3),Math.round(floors*2/3)]:[Math.round(floors/4),Math.round(floors/2),Math.round(floors*3/4)];
 const ringOut=l===8?.24:.46;
 for(const f of halos){halo(detail,w,d,base(f),ringOut);if(l>8)ringGarden(decor,w,d,base(f),ringOut,true);}

 // Frosted pods on the front (and back on the top tier), alternating sides, away from the halo floors.
 for(let fl=2;fl<floors-1;fl+=l===8?3:4){
  if(halos.some(f=>Math.abs(f-fl)<1))continue;
  const s=(Math.floor(fl/(l===8?3:4))%2?1:-1)*(variant%2?-1:1);
  pod(decor,front,s*w*.22,base(fl)+step*.5,w*.28,step*.78,.34);
  if(l===10)pod(decor,back,-s*w*.22,base(fl)+step*.5,w*.28,step*.78,.34);
 }

 let y=top+.04;
 if(l===8){
  y=crown(detail,w*.62,.55,d*.62,y,data.color);
  halo(detail,w*.62,d*.62,y-.3,.14);
  [[-w*.36,-d*.32],[w*.36,d*.32]].forEach(([x,z],k)=>tree(detail,x,top+.04,z,.9,k));
 }else if(l===9){
  // Slim white buttress fins at the base corners lift the arcology visually.
  for(const sx of [-1,1])for(const sz of [-1,1])box(detail,.16,h*.18,.42,sx*(w/2+.06),-h/2+h*.09,sz*(d/2-.12),FIN);
  y=crown(detail,w*.66,.9,d*.66,y,data.color);
  y=crown(detail,w*.42,.6,d*.42,y,data.color);
  halo(detail,w*.66,d*.66,top+.5,.18);
  [[-w*.38,-d*.34],[w*.38,-d*.3],[-w*.34,d*.34],[w*.36,d*.36]].forEach(([x,z],k)=>tree(detail,x,top+.04,z,1,k));
 }else{
  y=crown(detail,w*.78,2,d*.78,y,data.color);
  halo(detail,w*.78,d*.78,top+1.1,.22);
  y=crown(detail,w*.55,1.5,d*.55,y,data.color);
  halo(detail,w*.55,d*.55,y-.8,.16);
  [[-w*.42,-d*.38],[w*.42,d*.38]].forEach(([x,z],k)=>tree(detail,x,top+.04,z,1,k));
 }
 // Slender spire with a soft white beacon (kept below the old tower's height so the safety ceiling is unchanged).
 const spire=l===8?1.3:l===9?1.6:2.2;
 box(detail,.07,spire,.07,0,y+spire/2,0,FIN);
 litBox(detail,.14,.14,.14,0,y+spire+.07,0,BEACON,BEACON_GLOW,2.4);

 g.add(detail,decor);g.userData.variant=variant;
}
