import * as T from 'three';
import {box} from '../utils/mesh';
import type {Building} from '../entities/Building';
import type {BuildingSystem} from './BuildingSystem';

function missileModel(){
 const g=new T.Group();
 box(g,.26,.8,.26,0,0,0,0xe5d8aa);
 box(g,.2,.2,.2,0,-.5,0,0xc96956);
 box(g,.1,.13,.1,0,-.665,0,0xd58d64);
 box(g,.55,.22,.08,0,.3,0,0x708e8b);
 box(g,.08,.22,.55,0,.3,0,0x708e8b);
 box(g,.12,.3,.12,0,.6,0,0xffb65f);
 return g;
}

/** One deliberate demolition, no area damage or change to building physics. */
export class DemolitionSystem{
 readonly preview=missileModel();cooldown=0;
 private flight:{mesh:T.Group;target:Building;start:T.Vector3;end:T.Vector3;elapsed:number}|null=null;
 constructor(private scene:T.Scene,private buildings:BuildingSystem,private onHit:(b:Building)=>void){
  this.preview.visible=false;scene.add(this.preview);
 }
 targetAt(x:number,z:number){
  let target:Building|undefined,top=-Infinity;
  for(const b of this.buildings.buildings){
   const bounds=new T.Box3().setFromObject(b.mesh);
   if(x>=bounds.min.x&&x<=bounds.max.x&&z>=bounds.min.z&&z<=bounds.max.z&&bounds.max.y>top){target=b;top=bounds.max.y;}
  }
  return target;
 }
 aim(x:number,z:number){
  const target=this.targetAt(x,z),top=target?new T.Box3().setFromObject(target.mesh).max.y:0;
  this.preview.position.set(x,top+5,z);return target;
 }
 launch(x:number,z:number){
  if(this.cooldown>0||this.flight)return false;
  const target=this.aim(x,z);if(!target)return false;
  const mesh=missileModel();mesh.position.copy(this.preview.position);this.scene.add(mesh);
  this.flight={mesh,target,start:mesh.position.clone(),end:new T.Vector3(x,new T.Box3().setFromObject(target.mesh).max.y,z),elapsed:0};
  this.cooldown=60;this.preview.visible=false;return true;
 }
 update(dt:number){
  this.cooldown=Math.max(0,this.cooldown-dt);
  const f=this.flight;if(!f)return;
  f.elapsed+=dt;const t=Math.min(1,f.elapsed/.6);f.mesh.position.lerpVectors(f.start,f.end,t*t);
  if(t===1){f.mesh.removeFromParent();this.flight=null;if(this.buildings.buildings.includes(f.target)){this.onHit(f.target);this.buildings.remove(f.target);}}
 }
 reset(){this.flight?.mesh.removeFromParent();this.flight=null;this.cooldown=0;this.preview.visible=false;}
}
