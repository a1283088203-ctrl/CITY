import * as T from 'three';
import {BuildingSystem} from './BuildingSystem';
import {buildingData,MAX_LEVEL} from '../data/buildings';
import {speed} from '../utils/math';
export class MergeSystem{
 count=0;private contacts=new Map<string,number>();
 constructor(private buildings:BuildingSystem,private onMerge:(level:number,position:T.Vector3)=>void){}
 update(dt:number){
 const list=this.buildings.buildings,byHandle=new Map(list.map(b=>[b.collider.handle,b])),seen=new Set<string>(),pairs: [typeof list[number],typeof list[number]][]=[];
 for(const a of list)this.buildings.physics.world.contactPairsWith(a.collider,c=>{const b=byHandle.get(c.handle);if(!b||a.id>=b.id||a.level!==b.level||a.level>=MAX_LEVEL||Math.min(a.age,b.age)<.6)return;
 let touching=false;this.buildings.physics.world.contactPair(a.collider,b.collider,m=>{for(let i=0;i<m.numContacts();i++)if(m.contactDist(i)<.035)touching=true;});
 if(!touching||speed(a.body.linvel())>1||speed(b.body.linvel())>1||speed(a.body.angvel())>.8||speed(b.body.angvel())>.8)return;
 const k=`${a.id}:${b.id}`;seen.add(k);const t=(this.contacts.get(k)??0)+dt;this.contacts.set(k,t);if(t>.22)pairs.push([a,b]);});
 const used=new Set<number>();for(const [a,b] of pairs){if(used.has(a.id)||used.has(b.id))continue;used.add(a.id);used.add(b.id);
 const p=new T.Vector3().copy(a.body.translation()).add(b.body.translation()).multiplyScalar(.5),level=a.level+1;
 const anchored=a.windAnchor||b.windAnchor;
 p.y=Math.max(p.y,buildingData(level).height/2+.2);this.buildings.remove(a);this.buildings.remove(b);
 const next=this.buildings.spawn(level,p.x,p.y+.25,p.z);next.windAnchor=anchored;next.body.setLinvel({x:0,y:2.2,z:0},true);this.count++;this.onMerge(level,p);}
 for(const k of this.contacts.keys())if(!seen.has(k))this.contacts.delete(k);
 }
 reset(){this.contacts.clear();this.count=0;}
}
