import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {Building} from '../entities/Building';
import {buildingData} from '../data/buildings';
import {PhysicsSystem} from './PhysicsSystem';
import {speed} from '../utils/math';
import {WIND} from '../data/wind';
export class BuildingSystem{
 buildings:Building[]=[];private serial=0;revision=0;era=0;onImpact:(building:Building,speed:number)=>void=()=>{};
 constructor(public scene:T.Scene,public physics:PhysicsSystem,public onCollapse:(building:Building)=>void=()=>{}){}
 spawn(level:number,x:number,y:number,z:number,yaw=0,tilt=false){
 const d=buildingData(level),q=new T.Quaternion().setFromEuler(new T.Euler(tilt?.018:0,yaw,tilt?-.015:0));
 const body=this.physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setRotation(q).setLinearDamping(.35).setAngularDamping(1.6).setCcdEnabled(true));
 const collider=this.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(d.width/2,d.height/2,d.depth/2).setFriction(.75).setRestitution(.06).setMass(d.mass),body);
 const b=new Building(++this.serial,level,body,collider,this.era);b.windAnchor=b.id===1;this.buildings.push(b);this.scene.add(b.mesh);this.revision++;return b;
 }
 remove(b:Building){b.mesh.removeFromParent();this.physics.world.removeRigidBody(b.body);this.buildings=this.buildings.filter(a=>a!==b);this.revision++;}
 update(dt:number){for(const b of [...this.buildings]){
  b.age+=dt;b.stable=speed(b.body.linvel())<.2?b.stable+dt:0;
  b.body.setAngularDamping(b.stable>2?3:1.6);b.sync();
  // Arm once, after sustained low linear/angular speed with physical support below.
  // A falling body's momentary zero speed is not a landing; later wind sway must not disarm it.
  if(!b.windReady){
   let supported=false;
   if(speed(b.body.linvel())<.2&&speed(b.body.angvel())<.15){
    this.physics.world.contactPairsWith(b.collider,other=>this.physics.world.contactPair(b.collider,other,m=>{
     if(Math.abs(m.normal().y)<.5)return;
     for(let i=0;i<m.numSolverContacts();i++)if(m.solverContactPoint(i).y<b.body.translation().y-.1)supported=true;
    }));
   }
   b.windSettleTime=supported?b.windSettleTime+dt:0;
   if(b.windSettleTime>=WIND.settleSeconds)b.windReady=true;
  }
  const vy=b.body.linvel().y;b.impactCooldown-=dt;
  if(b.previousVelocityY< -1.5&&vy-b.previousVelocityY>1.2&&b.impactCooldown<=0){let contact=false;this.physics.world.contactPairsWith(b.collider,()=>contact=true);if(contact){this.onImpact(b,-b.previousVelocityY);b.impactCooldown=.3;}}
  b.previousVelocityY=vy;
  // Dot(local up, world up), independent of yaw. Tolerance protects 45° exactly.
  const q=b.body.rotation(),upY=1-2*(q.x*q.x+q.z*q.z);
  if(upY<Math.SQRT1_2-1e-7){this.onCollapse(b);this.remove(b);continue;}
  if(b.body.translation().y<-15)this.remove(b);
 }}
 clear(){for(const b of [...this.buildings])this.remove(b);this.serial=0;}
}
