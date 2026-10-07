import * as T from 'three';
import {box,litBox} from '../utils/mesh';
import {RoadSystem} from './RoadSystem';
import {seeded} from '../utils/math';
import {treeGeometry,shrubGeometry,vegetationMaterial,setVegetationWind} from '../utils/tree';
import {key,toWorld,neighbors,fromKey} from '../utils/grid';
import type {Building} from '../entities/Building';
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
 else if(near&&stage>=3&&choice<.65){kind='screen';box(mesh,.1,1.45,.1,w.x,.72,w.z,0x496270);box(mesh,1,.72,.14,w.x,1.17,w.z,0x475064);litBox(mesh,.84,.5,.025,w.x,1.17,w.z+.085,0x769492,stage===4?0xfc70c4:0x75eadf,2.7);for(let i=0;i<3;i++)litBox(mesh,.5,.035,.03,w.x,1.02+i*.13,w.z+.11,0xe1d4a7,0xfff1b5,2.4);}
 else if(near&&stage>=4&&choice<.8){kind='industry';box(mesh,.75,.65,.7,w.x,.325,w.z,0x63717a);box(mesh,.15,1.1,.15,w.x+.25,.6,w.z,0x8796a3);litBox(mesh,.55,.06,.05,w.x,.52,w.z+.36,0xe0bb79,0xffbc65,2.4);}
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
 updateArchitecture(buildings:Building[],stage:number){
  const used=new Set<string>();if(stage>=3){const tall=buildings.filter(b=>b.level>=5&&b.stable>1);
   for(let i=0;i<tall.length;i++)for(let j=i+1;j<tall.length;j++){
    const a=tall[i],b=tall[j],p=a.mesh.position,q=b.mesh.position,distance=Math.hypot(p.x-q.x,p.z-q.z);
    if(distance<3||distance>9||used.size>=7)continue;const id=`${a.id}:${b.id}`;used.add(id);
    let link=this.links.get(id);if(!link){link=new T.Group();box(link,1,.18,.55,0,0,0,0x647685);litBox(link,1,.05,.04,0,.16,.28,0x7199a0,0x77f0e3,2.5);this.links.set(id,link);this.group.add(link);}
    link.position.set((p.x+q.x)/2,Math.min(p.y+a.data.height*.18,q.y+b.data.height*.18),(p.z+q.z)/2);link.rotation.y=-Math.atan2(q.z-p.z,q.x-p.x);link.scale.x=distance;
   }
  }for(const [id,link] of this.links)if(!used.has(id)){link.removeFromParent();this.links.delete(id);}
 }
 reset(){this.last='';for(const e of this.entries.values())release(e.mesh);this.group.clear();this.entries.clear();this.links.clear();this.lampPositions=[];}
}
