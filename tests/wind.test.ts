import assert from 'node:assert/strict';
import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {PhysicsSystem} from '../src/systems/PhysicsSystem';
import {BuildingSystem} from '../src/systems/BuildingSystem';
import {WindSystem} from '../src/systems/WindSystem';
import {buildingData} from '../src/data/buildings';

const physics=new PhysicsSystem();await physics.init();
const scene=new T.Scene(),wind=new WindSystem(scene);
assert.equal(wind.exposure(7),0);assert.ok(wind.exposure(24)>wind.exposure(12));
function simulate(level:number,base:number,windEnabled:boolean){
 physics.reset();wind.reset(923);wind.setWeather('STRONG_WIND');wind.remaining=1000;let collapsed=false;
 const buildings=new BuildingSystem(scene,physics,()=>collapsed=true);
 if(base)physics.world.createCollider(RAPIER.ColliderDesc.cuboid(5,.5,5).setTranslation(0,base-.5,0));
 const d=buildingData(level),b=buildings.spawn(level,0,base+d.height/2+.015,0);
 b.windAnchor=false;let maxTilt=0;
 for(let i=0;i<60*36&&buildings.buildings.length;i++){
  if(windEnabled)wind.step(1/60,buildings.buildings);
  physics.step();const q=b.body.rotation();maxTilt=Math.max(maxTilt,Math.acos(Math.min(1,Math.max(-1,1-2*(q.x*q.x+q.z*q.z))))*180/Math.PI);buildings.update(1/60);
 }
 buildings.clear();return {collapsed,maxTilt};
}
const low=simulate(1,0,true),tower=simulate(10,0,true),raisedCalm=simulate(5,17,false),raisedWind=simulate(5,17,true);
console.log({low,tower,raisedCalm,raisedWind});
assert.equal(low.collapsed,false,'ground-level housing survives');
assert.equal(tower.collapsed,false,'standalone final tower remains viable');
assert.equal(raisedCalm.collapsed,false,'elevated test building is stable without wind');
assert.equal(raisedWind.collapsed,true,'wind physically tips elevated building past 45 degrees');
function stackTrial(enabled:boolean){
 physics.reset();wind.reset(923);wind.setWeather('STRONG_WIND');wind.remaining=1000;const fallen:number[]=[];
 const stack=new BuildingSystem(scene,physics,b=>fallen.push(b.level));
 stack.spawn(9,0,7.515,0);stack.spawn(5,0,18.28,0);
 for(let i=0;i<60*36;i++){if(enabled)wind.step(1/60,stack.buildings);physics.step();stack.update(1/60);}
 stack.clear();return fallen;
}
assert.deepEqual(stackTrial(false),[],'two-building stack remains stable in calm air');
assert.ok(stackTrial(true).includes(5),'wind topples upper building in a real dynamic stack');
// A fresh drop in fully developed strong wind stays protected until a supported settle.
physics.reset();wind.reset(923);wind.setWeather('STRONG_WIND');wind.remaining=1000;wind.step(5,[]);
physics.world.createCollider(RAPIER.ColliderDesc.cuboid(5,.5,5).setTranslation(0,16.5,0));
const landing=new BuildingSystem(scene,physics),falling=landing.spawn(5,0,26,0);falling.windAnchor=false;
let armedAt=0;
for(let i=0;i<600;i++){
 const before=falling.body.linvel();wind.step(1/60,landing.buildings);
 if(!falling.windReady){const after=falling.body.linvel();assert.equal(after.x,before.x,'wind cannot change a falling body');assert.equal(after.z,before.z);}
 physics.step();landing.update(1/60);
 if(falling.windReady){armedAt=(i+1)/60;break;}
}
assert.ok(armedAt>1.5&&armedAt<10,'wind arms after descent and .8 seconds supported stability');
const beforeWind=falling.body.linvel();wind.step(1/60,[falling]);assert.ok(Math.hypot(falling.body.linvel().x-beforeWind.x,falling.body.linvel().z-beforeWind.z)>0,'settled building receives wind');
falling.body.setAngvel({x:.25,y:0,z:0},true);landing.update(1/60);assert.equal(falling.windReady,true,'subsequent sway does not restore immunity');
landing.clear();
const airborne=landing.spawn(2,0,40,0);for(let i=0;i<90;i++)landing.update(1/60);assert.equal(airborne.windReady,false,'zero velocity without a supporting contact cannot arm wind');landing.clear();
wind.step(5,[]);wind.reset();assert.equal(wind.time,0);assert.equal(wind.strength,0);
const positions=wind.lines.geometry.attributes.position;
for(let i=0;i<positions.count;i++)assert.ok(positions.getY(i)>7.5,'wind lines stay above low-rise district');
wind.dispose();physics.world.free();
console.log('PASS: altitude scaling, low-rise shelter, viable grounded tower, wind-driven collapse, high-altitude visuals, reset.');


