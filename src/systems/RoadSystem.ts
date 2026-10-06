import * as T from 'three';
import {Building} from '../entities/Building';
import {CITY} from '../data/cityConfig';
import {type Cell,key,toCell,toWorld,inside,neighbors,fromKey} from '../utils/grid';
import {batchStatic,disposeBatches} from '../utils/batch';
import {box} from '../utils/mesh';
import {seeded} from '../utils/math';
import {PathfindingSystem} from './PathfindingSystem';
import type {TerrainSystem} from './TerrainSystem';
export class RoadSystem{
 group=new T.Group();roads=new Set<string>();blocked=new Set<string>();entrances:Cell[]=[];version=0;private signature='';
 terrain?:TerrainSystem;mainRoads=new Set<string>();entranceByBuilding=new Map<number,Cell>();private entranceKeys=new Set<string>();private styles=new Map<string,number>();
 constructor(scene:T.Scene,private paths:PathfindingSystem){scene.add(this.group);}
 rebuild(buildings:Building[],force=false,stage=0){
 const blocked=new Set(this.terrain?.blocked??[]),bounds:{b:Building;box:T.Box3}[]=[];
 for(const k of this.terrain?.bridges??[])blocked.delete(k);
 for(const b of buildings){if(b.age<.6)continue;const bb=b.structuralBounds;bounds.push({b,box:bb});for(let x=0;x<CITY.size;x++)for(let z=0;z<CITY.size;z++){const p=toWorld({x,z});const margin=z===(this.terrain?.bridgeRow??8)?.54:.36;if(p.x+margin>bb.min.x&&p.x-margin<bb.max.x&&p.z+margin>bb.min.z&&p.z-margin<bb.max.z)blocked.add(key({x,z}));}}
 const signature=`${this.terrain?.version??0}:${bounds.map(({b})=>b.id).join(',')}:`+[...blocked].sort().join(';');if(!force&&signature===this.signature)return;this.signature=signature;this.blocked=blocked;this.roads.clear();this.mainRoads.clear();this.entrances=[];this.entranceKeys.clear();this.entranceByBuilding.clear();
 // One narrow cross-village avenue; river crossings only use reserved bridge cells.
 const row=this.terrain?.bridgeRow??8;
 for(let i=0;i<CITY.size;i++){const p={x:i,z:row};if(!blocked.has(key(p))){this.roads.add(key(p));this.mainRoads.add(key(p));}}
 for(const {b,box:bb} of bounds){const center=b.mesh.position,front=new T.Vector3(0,0,1).applyQuaternion(b.mesh.quaternion);const entrance=toCell(center.x+front.x*(b.data.depth/2+1),center.z+front.z*(b.data.depth/2+1));
 const candidates:Cell[]=[];for(let x=0;x<16;x++)for(let z=0;z<16;z++){const p={x,z},w=toWorld(p);if(blocked.has(key(p)))continue;if(w.x>=bb.min.x-2&&w.x<=bb.max.x+2&&w.z>=bb.min.z-2&&w.z<=bb.max.z+2)candidates.push(p);}
 candidates.sort((a,c)=>Math.abs(a.x-entrance.x)+Math.abs(a.z-entrance.z)-Math.abs(c.x-entrance.x)-Math.abs(c.z-entrance.z));
 for(const start of candidates){const path=this.paths.find(start,p=>this.roads.has(key(p)),blocked);if(path.length){path.forEach(p=>this.roads.add(key(p)));this.entrances.push(start);this.entranceKeys.add(key(start));this.entranceByBuilding.set(b.id,start);break;}}
 }
 disposeBatches(this.group);this.group.clear();for(const k of this.roads){const p=fromKey(k),w=toWorld(p),width=this.width(p),curb=width+.18;
 if(!this.styles.has(k))this.styles.set(k,stage);const style=this.styles.get(k)!;
 const surface=style<2?0xa29472:0x627675,sidewalk=style<2?0xc6b88f:0xa9b3a4;
 box(this.group,curb,.09,curb,w.x,.035,w.z,sidewalk);box(this.group,width,.025,width,w.x,.09,w.z,surface);
 for(const n of neighbors(p))if(this.roads.has(key(n))){const q=toWorld(n),edgeWidth=Math.min(width,this.width(n));box(this.group,n.x!==p.x?.76:edgeWidth+.18,.09,n.z!==p.z?.76:edgeWidth+.18,(w.x*3+q.x)/4,.035,(w.z*3+q.z)/4,sidewalk);box(this.group,n.x!==p.x?.76:edgeWidth,.027,n.z!==p.z?.76:edgeWidth,(w.x*3+q.x)/4,.092,(w.z*3+q.z)/4,surface);}
 if(this.terrain?.bridges.has(k)){box(this.group,1.5,.12,1.06,w.x,.02,w.z,0x947c5c);for(let i=-3;i<=3;i++)box(this.group,.12,.015,1.04,w.x+i*.2,.092,w.z,0xc2ab7b);for(const s of [-1,1]){box(this.group,1.5,.06,.06,w.x,.36,w.z+s*.49,0x715e48);for(const i of [-.6,0,.6])box(this.group,.07,.3,.07,w.x+i,.22,w.z+s*.49,0x715e48);}}
 this.detail(p,w,width,curb,style,k);
 if(style>=2&&this.mainRoads.has(k)&&(p.x+p.z)%2===0)box(this.group,.22,.015,.04,w.x,.112,w.z,0xe6d8a1);
 if(style>=2&&neighbors(p).filter(n=>this.roads.has(key(n))).length>2)for(let i=-1;i<=1;i++)box(this.group,.07,.016,.38,w.x+i*.14,.118,w.z,0xe4e0c8);
 }batchStatic(this.group);this.version++;
 }
 /** Small surface details, seeded per cell so road rebuilds never reshuffle them. */
 private detail(p:Cell,w:{x:number;z:number},width:number,curb:number,style:number,k:string){
  if(this.terrain?.bridges.has(k))return;
  const r=seeded((Math.imul(p.x+31,73856093)^Math.imul(p.z+17,19349663))>>>0),main=this.mainRoads.has(k),road=(dx:number,dz:number)=>this.roads.has(key({x:p.x+dx,z:p.z+dz}));
  const open=([[1,0],[-1,0],[0,1],[0,-1]] as const).filter(([dx,dz])=>!road(dx,dz));
  // Avenue markings run along x and stop where the road ends instead of overhanging it.
  const west=road(-1,0)?.75:width/2,east=road(1,0)?.75:width/2,length=west+east,mid=w.x+(east-west)/2;
  if(style<2){
   // Village path: worn wheel ruts on the avenue, scattered pebbles, grass tufts along the open verges.
   if(main)for(const s of [-1,1])box(this.group,length,.006,.09,mid,.104,w.z+s*.2,0x93855f);
   for(let i=0,n=1+Math.floor(r()*3);i<n;i++)box(this.group,.05+r()*.05,.01,.04+r()*.04,w.x+(r()-.5)*width*.8,.105,w.z+(r()-.5)*width*.8,r()<.5?0x8a7c5c:0xbcae88);
   for(const [dx,dz] of open)if(r()<.55){const along=(r()-.5)*curb*.8;box(this.group,.08,.07+r()*.05,.06,w.x+dx*(curb/2+.02)+(dz?along:0),.04,w.z+dz*(curb/2+.02)+(dx?along:0),r()<.5?0x86a862:0x9cba6e);}
  }else{
   // Paved street: raised kerbs on open sides, lane edge lines on the avenue, asphalt patches and the odd manhole.
   for(const [dx,dz] of open)box(this.group,dx?.06:curb,.11,dz?.06:curb,w.x+dx*(curb/2-.03),.045,w.z+dz*(curb/2-.03),0x8d978e);
   if(main)for(const s of [-1,1])if(!road(0,s))box(this.group,length,.012,.03,mid,.108,w.z+s*(width/2-.06),0xe4e0c8);
   if(r()<.3)box(this.group,.18+r()*.2,.006,.12+r()*.15,w.x+(r()-.5)*width*.4,.104,w.z+(r()-.5)*width*.4,0x57696a);
   if(r()<.12){const mx=w.x+(r()-.5)*width*.3,mz=w.z+(r()-.5)*width*.3;box(this.group,.2,.008,.2,mx,.105,mz,0x4b5a5b);box(this.group,.13,.01,.13,mx,.106,mz,0x6f807f);}
  }
 }
 width(p:Cell){const k=key(p);return this.mainRoads.has(k)?.82:this.entranceKeys.has(k)?.34:.5;}
 sidewalkOffset(p:Cell){return this.width(p)/2+.085;}
 nodes(){return [...this.roads].map(fromKey).filter(inside);}
 reset(){this.signature='';this.group.clear();this.roads.clear();this.blocked.clear();this.mainRoads.clear();this.entranceKeys.clear();this.entranceByBuilding.clear();this.styles.clear();this.entrances=[];this.version++;}
}


