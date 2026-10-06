import * as T from 'three';
import type {Building} from '../entities/Building';
import {WIND,WEATHER,type WindState} from '../data/wind';
import {clamp,seeded} from '../utils/math';

/** One fixed-step wind field drives both rigid bodies and visible streaks. */
export class WindSystem{
 time=0;strength=0;direction=new T.Vector3(1,0,.2).normalize();
 state:WindState='CALM';remaining=20;private random=seeded(920);private angle=.35;private targetAngle=.35;private stateStartStrength=0;private transition=0;
 onChange:(state:WindState)=>void=()=>{};
 readonly lines:T.LineSegments;
 private positions=new Float32Array(WIND.lineCount*6);
 private streaks:{x:number;y:number;z:number;phase:number;length:number}[]=[];
 readonly rain:T.LineSegments;private rainCount:number;private rainPositions:Float32Array;private drops:{x:number;y:number;z:number;speed:number;len:number}[]=[];private rainAmount=0;
 private rotation=new T.Quaternion();private point=new T.Vector3();private impulse=new T.Vector3();
 constructor(scene:T.Scene){
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));
  this.lines=new T.LineSegments(geometry,new T.LineBasicMaterial({color:0xe5fff4,transparent:true,opacity:.45,depthWrite:false}));
  this.lines.frustumCulled=false;scene.add(this.lines);
  this.rainCount=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches?200:WIND.rainCount;
  this.rainPositions=new Float32Array(this.rainCount*6);
  const rainGeometry=new T.BufferGeometry();rainGeometry.setAttribute('position',new T.BufferAttribute(this.rainPositions,3).setUsage(T.DynamicDrawUsage));
  this.rain=new T.LineSegments(rainGeometry,new T.LineBasicMaterial({color:0xa9c6d4,transparent:true,opacity:0,depthWrite:false}));
  this.rain.frustumCulled=false;this.rain.visible=false;scene.add(this.rain);
  this.reset();
 }
 exposure(height:number){return Math.pow(clamp((height-WIND.startHeight)/(WIND.fullHeight-WIND.startHeight),0,1),2);}
 step(dt:number,buildings:Building[],night=0){
  this.time+=dt;this.remaining-=dt;
  if(this.remaining<=0){
   const choices=(Object.keys(WEATHER) as WindState[]).filter(s=>s!==this.state);
   const weights=choices.map(s=>s==='STRONG_WIND'?1+(WIND.nightStrongWeight-1)*clamp(night,0,1):s==='RAIN'?WIND.rainWeight:1);
   let roll=this.random()*weights.reduce((sum,w)=>sum+w,0),selected=choices[choices.length-1];
   for(let i=0;i<choices.length;i++){roll-=weights[i];if(roll<0){selected=choices[i];break;}}
   this.setWeather(selected);
  }
  this.transition=Math.min(1,this.transition+dt/WIND.transitionSeconds);
  const t=this.transition*this.transition*(3-2*this.transition),target=WEATHER[this.state].strength;
  const gust=this.state==='STRONG_WIND'?.92+.16*Math.sin(this.time*1.2)+.08*Math.sin(this.time*2.7):1;
  this.strength=this.stateStartStrength+(target*gust-this.stateStartStrength)*t;
  const delta=Math.atan2(Math.sin(this.targetAngle-this.angle),Math.cos(this.targetAngle-this.angle));this.angle+=delta*(1-Math.exp(-dt*.25));
  this.direction.set(Math.cos(this.angle),0,Math.sin(this.angle));
  for(const b of buildings){
   if(!b.windReady)continue;
   this.rotation.copy(b.body.rotation());
   // Force near the upper facade naturally produces torque about the center of mass.
   this.point.set(0,b.data.height*.42,0).applyQuaternion(this.rotation).add(b.body.translation());
   const q=this.rotation,upY=1-2*(q.x*q.x+q.z*q.z);
   const extentY=(Math.abs(2*(q.x*q.y+q.z*q.w))*b.data.width+Math.abs(upY)*b.data.height+Math.abs(2*(q.y*q.z-q.x*q.w))*b.data.depth)/2;
   const base=b.body.translation().y-extentY;
   if(b.windAnchor&&base<.35)continue;
   // Grounded towers retain playability; raising their foundation increases exposure.
   const elevation=.08+.92*clamp(base/12,0,1);
   const area=b.data.height*(Math.abs(this.direction.x)*b.data.depth+Math.abs(this.direction.z)*b.data.width);
   const force=WIND.pressure*this.strength*this.exposure(this.point.y)*elevation*area;
   if(force<.001)continue;
   // Pressure acts on facade area, not mass: heavier upgrades accelerate more slowly.
   this.impulse.copy(this.direction).multiplyScalar(force*dt);
   b.body.applyImpulseAtPoint(this.impulse,this.point,true);
  }
 }
 updateVisuals(dt:number){
  const velocity=4+this.strength*9;
  for(let i=0;i<this.streaks.length;i++){
   const s=this.streaks[i];s.x+=this.direction.x*velocity*dt;s.z+=this.direction.z*velocity*dt;
   if(s.x>22)s.x-=44;if(s.z>22)s.z-=44;if(s.x< -22)s.x+=44;if(s.z< -22)s.z+=44;
   const fade=Math.min(1,(22-Math.abs(s.x))/3,(22-Math.abs(s.z))/3);
   const length=s.length*(.5+this.strength)*Math.max(0,fade);
   const y=s.y+Math.sin(this.time*1.7+s.phase)*.12,at=i*6;
   this.positions[at]=s.x;this.positions[at+1]=y;this.positions[at+2]=s.z;
   this.positions[at+3]=s.x-this.direction.x*length;this.positions[at+4]=y+.04;this.positions[at+5]=s.z-this.direction.z*length;
  }
  this.lines.geometry.attributes.position.needsUpdate=true;
  (this.lines.material as T.LineBasicMaterial).opacity=Math.min(.65,this.strength*.55);
  this.lines.visible=this.strength>.008;
  // Rain streaks drift with the wind and fade with weather transitions.
  this.rainAmount+=((this.state==='RAIN'?1:0)-this.rainAmount)*(1-Math.exp(-Math.max(0,dt)*1.4));
  this.rain.visible=this.rainAmount>.02;
  if(this.rain.visible){
   const driftX=this.direction.x*.35,driftZ=this.direction.z*.35;
   for(let i=0;i<this.drops.length;i++){
    const d=this.drops[i];d.y-=d.speed*dt;d.x+=driftX*d.speed*dt;d.z+=driftZ*d.speed*dt;
    if(d.y<-.2){d.y=WIND.ceiling;d.x=Math.random()*44-22;d.z=Math.random()*44-22;}
    if(d.x>22)d.x-=44;if(d.x< -22)d.x+=44;if(d.z>22)d.z-=44;if(d.z< -22)d.z+=44;
    const at=i*6;
    this.rainPositions[at]=d.x;this.rainPositions[at+1]=d.y;this.rainPositions[at+2]=d.z;
    this.rainPositions[at+3]=d.x-driftX*d.len;this.rainPositions[at+4]=d.y+d.len;this.rainPositions[at+5]=d.z-driftZ*d.len;
   }
   this.rain.geometry.attributes.position.needsUpdate=true;
   (this.rain.material as T.LineBasicMaterial).opacity=.55*this.rainAmount;
  }
 }
 setWeather(state:WindState){this.state=state;this.stateStartStrength=this.strength;this.transition=0;const weather=WEATHER[state];this.remaining=weather.minDuration+this.random()*(weather.maxDuration-weather.minDuration);this.targetAngle=this.random()*Math.PI*2;this.onChange(state);}
 reset(seed=Math.floor(Math.random()*0xffffffff)){this.time=0;this.strength=0;this.random=seeded(seed);this.angle=.35;this.targetAngle=.35;this.stateStartStrength=0;this.transition=0;this.state='CALM';this.remaining=18+this.random()*15;this.direction.set(Math.cos(.35),0,Math.sin(.35));const random=this.random;this.streaks=Array.from({length:WIND.lineCount},()=>({x:random()*44-22,y:WIND.startHeight+1+random()*(WIND.ceiling-WIND.startHeight-1),z:random()*44-22,phase:random()*6.28,length:1+random()*2.7}));
 const rrandom=seeded(seed^0x9e3779);this.drops=Array.from({length:this.rainCount},()=>({x:rrandom()*44-22,y:rrandom()*WIND.ceiling,z:rrandom()*44-22,speed:8+rrandom()*4,len:.45+rrandom()*.5}));this.rainAmount=0;this.updateVisuals(0);}
 dispose(){this.lines.removeFromParent();this.lines.geometry.dispose();(this.lines.material as T.Material).dispose();this.rain.removeFromParent();this.rain.geometry.dispose();(this.rain.material as T.Material).dispose();}
}
