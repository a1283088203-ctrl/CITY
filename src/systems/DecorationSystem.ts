import * as T from 'three';
import {box,litBox} from '../utils/mesh';
import {RoadSystem} from './RoadSystem';
import {seeded} from '../utils/math';
import {treeGeometry,shrubGeometry,vegetationMaterial,setVegetationWind} from '../utils/tree';
import {key,toWorld,neighbors,fromKey} from '../utils/grid';
import type {Building} from '../entities/Building';
import {isFuture} from '../entities/BuildingFuture';
/** Adds a vegetation mesh at world (x,z); the caller's re-centring loop moves it back to local space. */
function vegetation(parent:T.Group,geometry:T.BufferGeometry,x:number,z:number){
 const mesh=new T.Mesh(geometry,vegetationMaterial);mesh.position.set(x,0,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.owned=true;parent.add(mesh);
}
/** Frees per-tree geometry; shared box geometry and materials are left alone. */
function release(group:T.Object3D){group.traverse(o=>{if(o instanceof T.Mesh&&o.userData.owned)o.geometry.dispose();});group.removeFromParent();}
export class DecorationSystem{
 group=new T.Group();private last='';private entries=new Map<string,{mesh:T.Group;kind:string;rank:number}>();
 lampPositions:T.Vector3[]=[];private links=new Map<string,T.Group>();
 constructor(scene:T.Scene){scene.add(this.group);}
 update(roads:RoadSystem,stage:number,green:number,dt=1/60){
 for(const [k,e] of this.entries){if(roads.blocked.has(k)||roads.roads.has(k)||roads.terrain?.blocked.has(k)){release(e.mesh);this.entries.delete(k);}else if((e.kind==='tree'&&e.rank>green*.46)||(e.kind==='bush'&&e.rank>green*.66)){e.mesh.scale.multiplyScalar(Math.exp(-dt*4));if(e.mesh.scale.y<.08){release(e.mesh);this.entries.delete(k);}}}
 // Quick shrink (~0.6s) when a lower greenery target clears a tree, so it reads as deliberate rather than a slow fade.
 const signature=`${roads.version}:${stage}`;if(signature===this.last)return;this.last=signature;
 for(let x=1;x<15;x++)for(let z=1;z<15;z++){const p={x,z};if(roads.blocked.has(key(p))||roads.roads.has(key(p)))continue;const w=toWorld(p),near=neighbors(p).some(n=>roads.roads.has(key(n)));
 const k=key(p);if(this.entries.has(k)||roads.terrain?.blocked.has(k))continue;
 const cellSeed=((roads.terrain?.seed??824)^Math.imul(x+1,73856093)^Math.imul(z+1,19349663))>>>0;
 // Rank and choice belong to the cell, not to the order cells are visited, so road changes never
 // reshuffle them: a tree cleared by urbanisation cannot pop back, and kept trees stay put.
 const cellRandom=seeded(cellSeed^0x2545f491),rank=cellRandom(),choice=cellRandom();
 const mesh=new T.Group();let kind='';
 // Trees and shrubs are a single vertex-coloured mesh in local space; about half the trees get undergrowth.
 if(rank<green*.46){kind='tree';vegetation(mesh,treeGeometry(cellSeed,choice<.5?1+Math.floor(choice*4):0),w.x,w.z);}
 // Free-standing shrub patches on green cells away from roads.
 else if(!near&&rank<green*.66){kind='bush';vegetation(mesh,shrubGeometry(cellSeed^0x85ebca6b,2+Math.floor(choice*3)),w.x,w.z);}
 else if(near&&choice<(stage===0?.12:.32)){kind='lamp';box(mesh,.07,1.1,.07,w.x,.55,w.z,0x426269);litBox(mesh,.32,.1,.21,w.x,1.12,w.z,0xffdc98,0xffd38b,2.8);}
 // Later eras: clean white info kiosks and planted light boxes along the streets (no neon signage).
 else if(near&&stage>=3&&choice<.65){kind='kiosk';box(mesh,.1,1.2,.1,w.x,.6,w.z,0xe6ebea);box(mesh,.72,.52,.1,w.x,1.14,w.z,0xf4f4f0);litBox(mesh,.6,.4,.02,w.x,1.14,w.z+.06,0xdfe8ea,0xfff1d8,1.5);}
 else if(near&&stage>=4&&choice<.8){kind='planter';box(mesh,.75,.3,.7,w.x,.15,w.z,0xeeeeea);box(mesh,.65,.22,.6,w.x,.41,w.z,0x86b366);litBox(mesh,.62,.03,.04,w.x,.24,w.z+.36,0xf3eadb,0xffe4bf,1.4);}
 else if(near&&choice<.22){kind='bench';box(mesh,.65,.12,.25,w.x,.24,w.z,0xb9956b);box(mesh,.65,.22,.06,w.x,.4,w.z-.13,0xb9956b);}
 if(kind){for(const child of mesh.children){child.position.x-=w.x;child.position.z-=w.z;}mesh.position.set(w.x,0,w.z);this.entries.set(k,{mesh,kind,rank});this.group.add(mesh);}
 }
 // The backrest is at local -Z, so the open seat faces local +Z.
 // Re-evaluate only when roads change, retaining the current side at junctions.
 for(const [k,e] of this.entries){if(e.kind!=='bench')continue;
  const cell=fromKey(k),adjacent=neighbors(cell).filter(n=>roads.roads.has(key(n)));
  if(!adjacent.length){e.mesh.removeFromParent();this.entries.delete(k);continue;}
  const target=adjacent.find(n=>key(n)===e.mesh.userData.facingRoad)??adjacent[(cell.x*7+cell.z*13)%adjacent.length];
  e.mesh.rotation.y=Math.atan2(target.x-cell.x,target.z-cell.z);e.mesh.userData.facingRoad=key(target);
 }
 this.lampPositions=[...this.entries.values()].filter(e=>e.kind==='lamp').slice(0,2).map(e=>e.mesh.children[1].getWorldPosition(new T.Vector3()));
 }
 /** Crown sway runs in the shared vegetation shader; only three uniforms change per frame. */
 updateWind(time:number,wind:{strength:number;direction:T.Vector3}){setVegetationWind(time,wind.strength,wind.direction);}
 /** Glass skybridges between neighbouring future towers (levels 8–10): white deck and roof, frosted glass sides and a
  * soft warm light under the deck. Built at unit length along x and stretched to the gap; visual only, no collision. */
 updateArchitecture(buildings:Building[],_stage:number){
  const used=new Set<string>(),tall=buildings.filter(b=>isFuture(b.level)&&b.stable>1);
  for(let i=0;i<tall.length;i++)for(let j=i+1;j<tall.length;j++){
   const a=tall[i],b=tall[j],p=a.mesh.position,q=b.mesh.position,distance=Math.hypot(p.x-q.x,p.z-q.z);
   if(distance<3||distance>9||used.size>=7)continue;const id=`${a.id}:${b.id}`;used.add(id);
   let link=this.links.get(id);
   if(!link){
    link=new T.Group();
    box(link,1,.07,.64,0,-.14,0,0xf4f4f0);box(link,1,.05,.64,0,.18,0,0xf4f4f0);
    for(const s of [-1,1]){box(link,1,.27,.03,0,.02,s*.3,0xb3d6df);box(link,1,.03,.05,0,.17,s*.3,0xe2e8e7);}
    litBox(link,1,.02,.05,0,-.185,0,0xf3eadb,0xffe4bf,1.4);
    this.links.set(id,link);this.group.add(link);
   }
   link.position.set((p.x+q.x)/2,Math.min(p.y+a.data.height*.18,q.y+b.data.height*.18),(p.z+q.z)/2);link.rotation.y=-Math.atan2(q.z-p.z,q.x-p.x);link.scale.x=distance;
  }
  for(const [id,link] of this.links)if(!used.has(id)){link.removeFromParent();this.links.delete(id);}
 }
 reset(){this.last='';for(const e of this.entries.values())release(e.mesh);this.group.clear();this.entries.clear();this.links.clear();this.lampPositions=[];}
}
