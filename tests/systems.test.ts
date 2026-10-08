import assert from 'node:assert/strict';
import * as T from 'three';
import {PhysicsSystem} from '../src/systems/PhysicsSystem';
import {BuildingSystem} from '../src/systems/BuildingSystem';
import {MergeSystem} from '../src/systems/MergeSystem';
import {PathfindingSystem} from '../src/systems/PathfindingSystem';
import {RoadSystem} from '../src/systems/RoadSystem';
import {PopulationSystem} from '../src/systems/PopulationSystem';
import {buildingData} from '../src/data/buildings';
import {buildingModel} from '../src/entities/Building';
import {EffectsSystem} from '../src/systems/EffectsSystem';
import {key,neighbors,fromKey} from '../src/utils/grid';
const physics=new PhysicsSystem();await physics.init();const buildings=new BuildingSystem(new T.Scene(),physics);let events=0;const merge=new MergeSystem(buildings,()=>events++);
function step(seconds:number,merging=true){for(let i=0;i<seconds*60;i++){physics.step();buildings.update(1/60);if(merging)merge.update(1/60);}}
// Real Rapier: low-speed contact on the ground must merge exactly once.
buildings.spawn(1,-.825,3,0);buildings.spawn(1,.825,3,0);step(7);
assert.equal(events,1,'two touching houses merge once');assert.equal(buildings.buildings.length,1);assert.equal(buildings.buildings[0].level,2);
buildings.clear();merge.reset();events=0;
buildings.spawn(1,-4,2,0);buildings.spawn(1,4,2,0);step(5);assert.equal(events,0,'separated houses never merge');
// Different levels stack and retain dynamic rigid bodies.
buildings.clear();buildings.spawn(3,0,1.35,0);buildings.spawn(1,0,6,0);step(6);
assert.equal(buildings.buildings.length,2);assert.ok(buildings.buildings[1].body.translation().y>2.9);assert.ok(buildings.buildings[0].body.isDynamic());
const paths=new PathfindingSystem(),roads=new RoadSystem(new T.Scene(),paths);roads.rebuild(buildings.buildings,true);
for(const road of roads.roads)assert.ok(!roads.blocked.has(road),'roads avoid occupied cells');
for(const entrance of roads.entrances)assert.ok(paths.find(entrance,p=>p.x===0||p.x===15||p.z===0||p.z===15,roads.blocked,roads.roads).length>0,'every connected entrance reaches main road');
const path=paths.find({x:1,z:1},p=>p.x===3&&p.z===1,new Set(['2,1']));assert.equal(path.length,5,'shortest route goes around obstacle');
const pop=new PopulationSystem();pop.update(buildings.buildings);assert.equal(pop.population,40);assert.ok(pop.space<48);
// Each adjacent pair in the complete upgrade chain must merge using real contact manifolds.
for(let level=2;level<=9;level++){buildings.clear();merge.reset();events=0;const d=buildingData(level);buildings.spawn(level,-d.width/2,d.height/2+.02,0);buildings.spawn(level,d.width/2,d.height/2+.02,0);step(8);assert.equal(events,1,`level ${level} merge`);assert.equal(buildings.buildings[0].level,level+1);}
buildings.clear();merge.reset();const final=buildingData(10);buildings.spawn(10,-2,final.height/2,0);buildings.spawn(10,2,final.height/2,0);step(3);assert.equal(buildings.buildings.length,2,'maximum level does not merge');
buildings.clear();
const effects=new EffectsSystem(buildings.scene);let collapses=0;
buildings.onCollapse=b=>{collapses++;effects.collapse(b);};
// Boundary cases, arbitrary yaw, and compounded pitch/roll measured against world up.
for(const [pitch,yaw,roll,expected] of [[0,170,0,false],[44.9,80,0,false],[45,120,0,false],[45.1,-70,0,true],[0,30,-46,true],[35,0,35,true],[180,0,0,true]] as const){
 const before=collapses,b=buildings.spawn(6,0,12,0),handle=b.body.handle;
 b.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(pitch*Math.PI/180,yaw*Math.PI/180,roll*Math.PI/180,'YXZ')),true);
 buildings.update(1/60);
 assert.equal(collapses-before,expected?1:0,`collapse boundary ${pitch}/${yaw}/${roll}`);
 if(expected){assert.equal(buildings.buildings.length,0);assert.equal(physics.world.getRigidBody(handle),null);assert.ok(effects.particles.length>0);buildings.update(1/60);assert.equal(collapses-before,1,'collapse fires once');pop.update(buildings.buildings);assert.equal(pop.population,0);}
 buildings.clear();effects.clear();assert.equal(effects.particles.length,0);
}
const debrisBuilding=buildings.spawn(10,0,15,0);effects.collapse(debrisBuilding);assert.ok(effects.particles.length<=280);effects.update(3);assert.equal(effects.particles.length,0,'debris expires');
for(let level=3;level<=10;level++){const model=buildingModel(buildingData(level)),body=model.children[0] as T.Mesh,roof=model.children[2] as T.Mesh;assert.ok(roof.position.y+roof.scale.y/2>body.position.y+body.scale.y/2+.1,'roof top is separated from body top');}
buildings.clear();physics.reset();assert.equal(buildings.buildings.length,0);physics.world.free();
console.log('PASS: roof separation, 45-degree boundaries, yaw independence, combined tilt, single collapse, collider removal, population removal, debris lifetime/reset.');
console.log('PASS: gravity, contacts, all 9 upgrades, no remote merge, stack, dynamic bodies, road avoidance/connectivity, pathfinding, population, reset.');
