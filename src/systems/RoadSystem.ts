import * as T from 'three';
import {Building} from '../entities/Building';
import {CITY} from '../data/cityConfig';
import {type Cell,key,toCell,toWorld,inside,neighbors,fromKey} from '../utils/grid';
import {box} from '../utils/mesh';
import {PathfindingSystem} from './PathfindingSystem';
import type {TerrainSystem} from './TerrainSystem';
export class RoadSystem{
 group=new T.Group();roads=new Set<string>();blocked=new Set<string>();entrances:Cell[]=[];version=0;private signature='';
 terrain?:TerrainSystem;mainRoads=new Set<string>();entranceByBuilding=new Map<number,Cell>();private entranceKeys=new Set<string>();private styles=new Map<string,number>();
 constructor(scene:T.Scene,private paths:PathfindingSystem){scene.add(this.group);}
 rebuild(buildings:Building[],force=false,stage=0){
 const blocked=new Set(this.terrain?.blocked??[]),bounds:{b:Building;box:T.Box3}[]=[];
 for(const k of this.terrain?.bridges??[])blocked.delete(k);
 for(const b of buildings){if(b.age<.6)continue;b.mesh.updateWorldMatrix(true,true);const bb=new T.Box3();for(const part of b.mesh.children)if(part.name!=='residential-decoration')bb.expandByObject(part);bounds.push({b,box:bb});for(let x=0;x<CITY.size;x++)for(let z=0;z<CITY.size;z++){const p=toWorld({x,z});const margin=z===(this.terrain?.bridgeRow??8)?.54:.36;if(p.x+margin>bb.min.x&&p.x-margin<bb.max.x&&p.z+margin>bb.min.z&&p.z-margin<bb.max.z)blocked.add(key({x,z}));}}
 const signature=`${this.terrain?.version??0}:${bounds.map(({b})=>b.id).join(',')}:`+[...blocked].sort().join(';');if(!force&&signature===this.signature)return;this.signature=signature;this.blocked=blocked;this.roads.clear();this.mainRoads.clear();this.entrances=[];this.entranceKeys.clear();this.entranceByBuilding.clear();
 // One narrow cross-village avenue; river crossings only use reserved bridge cells.
 const row=this.terrain?.bridgeRow??8;
 for(let i=0;i<CITY.size;i++){const p={x:i,z:row};if(!blocked.has(key(p))){this.roads.add(key(p));this.mainRoads.add(key(p));}}
 for(const {b,box:bb} of bounds){const center=b.mesh.position,front=new T.Vector3(0,0,1).applyQuaternion(b.mesh.quaternion);const entrance=toCell(center.x+front.x*(b.data.depth/2+1),center.z+front.z*(b.data.depth/2+1));
 const candidates:Cell[]=[];for(let x=0;x<16;x++)for(let z=0;z<16;z++){const p={x,z},w=toWorld(p);if(blocked.has(key(p)))continue;if(w.x>=bb.min.x-2&&w.x<=bb.max.x+2&&w.z>=bb.min.z-2&&w.z<=bb.max.z+2)candidates.push(p);}
 candidates.sort((a,c)=>Math.abs(a.x-entrance.x)+Math.abs(a.z-entrance.z)-Math.abs(c.x-entrance.x)-Math.abs(c.z-entrance.z));
 for(const start of candidates){const path=this.paths.find(start,p=>this.roads.has(key(p)),blocked);if(path.length){path.forEach(p=>this.roads.add(key(p)));this.entrances.push(start);this.entranceKeys.add(key(start));this.entranceByBuilding.set(b.id,start);break;}}
 }
 this.group.clear();for(const k of this.roads){const p=fromKey(k),w=toWorld(p),width=this.width(p),curb=width+.18;
 if(!this.styles.has(k))this.styles.set(k,stage);const style=this.styles.get(k)!;
 const surface=style<2?0xa29472:0x627675,sidewalk=style<2?0xc6b88f:0xa9b3a4;
 box(this.group,curb,.09,curb,w.x,.035,w.z,sidewalk);box(this.group,width,.025,width,w.x,.09,w.z,surface);
 for(const n of neighbors(p))if(this.roads.has(key(n))){const q=toWorld(n),edgeWidth=Math.min(width,this.width(n));box(this.group,n.x!==p.x?.76:edgeWidth+.18,.09,n.z!==p.z?.76:edgeWidth+.18,(w.x*3+q.x)/4,.035,(w.z*3+q.z)/4,sidewalk);box(this.group,n.x!==p.x?.76:edgeWidth,.027,n.z!==p.z?.76:edgeWidth,(w.x*3+q.x)/4,.092,(w.z*3+q.z)/4,surface);}
 if(this.terrain?.bridges.has(k)){box(this.group,1.5,.12,1.06,w.x,.02,w.z,0x947c5c);for(let i=-3;i<=3;i++)box(this.group,.12,.015,1.04,w.x+i*.2,.092,w.z,0xc2ab7b);for(const s of [-1,1]){box(this.group,1.5,.06,.06,w.x,.36,w.z+s*.49,0x715e48);}}
 if(style>=2&&this.mainRoads.has(k)&&(p.x+p.z)%2===0)box(this.group,.22,.015,.04,w.x,.112,w.z,0xe6d8a1);
 if(style>=2&&neighbors(p).filter(n=>this.roads.has(key(n))).length>2)for(let i=-1;i<=1;i++)box(this.group,.07,.016,.38,w.x+i*.14,.118,w.z,0xe4e0c8);
 }this.version++;
 }
 width(p:Cell){const k=key(p);return this.mainRoads.has(k)?.82:this.entranceKeys.has(k)?.34:.5;}
 sidewalkOffset(p:Cell){return this.width(p)/2+.085;}
 nodes(){return [...this.roads].map(fromKey).filter(inside);}
 reset(){this.signature='';this.group.clear();this.roads.clear();this.blocked.clear();this.mainRoads.clear();this.entranceKeys.clear();this.entranceByBuilding.clear();this.styles.clear();this.entrances=[];this.version++;}
}


