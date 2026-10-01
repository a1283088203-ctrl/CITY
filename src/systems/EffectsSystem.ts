import * as T from 'three';
import {box} from '../utils/mesh';
import type {Building} from '../entities/Building';
interface Particle {mesh:T.Mesh;v:T.Vector3;spin:T.Vector3;life:number;duration:number;size:number;debris:boolean}
export class EffectsSystem{
 particles:Particle[]=[];
 constructor(private scene:T.Scene){}
 private add(p:Particle){if(this.particles.length>=1600)this.particles.shift()!.mesh.removeFromParent();this.particles.push(p);}
 burst(p:T.Vector3){for(let i=0;i<22;i++){
  const mesh=box(this.scene,.14,.14,.14,p.x,p.y,p.z,[0xffd786,0x9af3d4,0xf49889][i%3]);
  this.add({mesh,v:new T.Vector3((Math.random()-.5)*5,Math.random()*4+1,(Math.random()-.5)*5),spin:new T.Vector3(3,1,2),life:1,duration:1,size:.14,debris:false});
 }}
 collapse(building:Building){
  const {width:w,height:h,depth:d,color,roof}=building.data;
  // Sample the rotated volume with bounded visual debris, without extra rigid bodies.
  const cell=Math.max(.36,Math.cbrt(w*h*d/280));
  const nx=Math.max(1,Math.floor(w/cell)),ny=Math.max(1,Math.floor(h/cell)),nz=Math.max(1,Math.floor(d/cell));
  const size=Math.min(w/nx,h/ny,d/nz)*.78,center=building.mesh.position,rotation=building.mesh.quaternion;
  const linear=new T.Vector3().copy(building.body.linvel()),angular=new T.Vector3().copy(building.body.angvel());
  for(let x=0;x<nx;x++)for(let y=0;y<ny;y++)for(let z=0;z<nz;z++){
   const offset=new T.Vector3((x+.5)*w/nx-w/2,(y+.5)*h/ny-h/2,(z+.5)*d/nz-d/2).applyQuaternion(rotation);
   const p=offset.clone().add(center),mesh=box(this.scene,size,size,size,p.x,p.y,p.z,y===ny-1?roof:color);
   mesh.quaternion.copy(rotation);
   const v=new T.Vector3().crossVectors(angular,offset).add(linear).addScaledVector(offset.clone().normalize(),1.7);
   v.add(new T.Vector3((Math.random()-.5)*2,1+Math.random()*2,(Math.random()-.5)*2));
   const duration=1.3+Math.random()*.8;
   this.add({mesh,v,spin:new T.Vector3(Math.random()*5-2.5,Math.random()*5-2.5,Math.random()*5-2.5),life:duration,duration,size,debris:true});
  }
 }
 update(dt:number){for(const p of this.particles){
  p.life-=dt;p.v.y-=dt*(p.debris?14:5);p.mesh.position.addScaledVector(p.v,dt);
  if(p.debris&&p.mesh.position.y<p.size/2){p.mesh.position.y=p.size/2;p.v.y=Math.abs(p.v.y)*.22;p.v.x*=.8;p.v.z*=.8;}
  p.mesh.rotation.x+=dt*p.spin.x;p.mesh.rotation.y+=dt*p.spin.y;p.mesh.rotation.z+=dt*p.spin.z;
  p.mesh.scale.setScalar(p.size*Math.max(0,Math.min(1,p.life/(p.debris?.65:p.duration))));
  if(p.life<=0)p.mesh.removeFromParent();
 }this.particles=this.particles.filter(p=>p.life>0);}
 clear(){for(const p of this.particles)p.mesh.removeFromParent();this.particles=[];}
}
