import assert from 'node:assert/strict';
import * as T from 'three';
import {TerrainSystem} from '../src/systems/TerrainSystem';
import {RoadSystem} from '../src/systems/RoadSystem';
import {PathfindingSystem} from '../src/systems/PathfindingSystem';
import {PhysicsSystem} from '../src/systems/PhysicsSystem';
import {BuildingSystem} from '../src/systems/BuildingSystem';
import {TimeOfDaySystem} from '../src/systems/TimeOfDaySystem';
import {ProgressionSystem} from '../src/systems/ProgressionSystem';
import {WindSystem} from '../src/systems/WindSystem';
import {ScoreSystem} from '../src/systems/ScoreSystem';
import {buildingData,BUILDINGS} from '../src/data/buildings';
import {key,fromKey,toWorld,neighbors} from '../src/utils/grid';
const scene=new T.Scene(),terrain=new TerrainSystem(scene),paths=new PathfindingSystem(),roads=new RoadSystem(scene,paths);
roads.terrain=terrain;const physics=new PhysicsSystem();await physics.init();const buildings=new BuildingSystem(scene,physics);
const fingerprints=new Set<string>();
for(let seed=0;seed<40;seed++){
 terrain.generate(seed);fingerprints.add([...terrain.water].join(';'));assert.ok(terrain.water.size>=32);
 const reachable=new Set<string>(),queue=[fromKey([...terrain.water][0])];
 for(let i=0;i<queue.length;i++){const p=queue[i];if(reachable.has(key(p)))continue;reachable.add(key(p));queue.push(...neighbors(p).filter(n=>terrain.water.has(key(n))&&!reachable.has(key(n))));}
 assert.equal(reachable.size,terrain.water.size,'river is contiguous');
 for(const k of terrain.water){const p=toWorld(fromKey(k));assert.equal(terrain.canPlace(p.x,p.z,1.65,1.65),false);}
 const occupied:{x:number;z:number}[]=[];
 for(const level of [1,1,2]){const d=buildingData(level),p=terrain.findPlot(d.width,d.depth,occupied);assert.ok(p,'safe initial plot');occupied.push(p);const b=buildings.spawn(level,p.x,d.height/2,p.z);b.age=1;}
 roads.rebuild(buildings.buildings,true);assert.ok(roads.entrances.length>=3,'initial buildings connect to roads');
 for(const k of roads.roads)if(terrain.water.has(k))assert.ok(terrain.bridges.has(k),'water crossed only on bridge');
 for(const entrance of roads.entrances)assert.ok(paths.find(entrance,p=>p.x===0||p.x===15,roads.blocked,roads.roads).length,'entrance connects to an edge');
 buildings.clear();roads.reset();
}
assert.ok(fingerprints.size>30,'seeds generate varied rivers');
const time=new TimeOfDaySystem();assert.equal(time.hour,9);time.update(480);assert.equal(time.hour,9);assert.equal(time.day,2);
time.reset();time.update((23-9)/24*480);assert.equal(time.phase,'Night');assert.equal(time.night,1);assert.ok(time.activity(0)<.2);assert.ok(time.activity(4)>.9);
const old=time.sky.clone();time.update(.016);assert.ok(Math.abs(old.r-time.sky.r)+Math.abs(old.g-time.sky.g)+Math.abs(old.b-time.sky.b)<.01); // Colors interpolate continuously.
const progress=new ProgressionSystem();progress.update(8,299);assert.equal(progress.index,0,'building level alone cannot advance city');progress.update(2,300);assert.equal(progress.index,1);progress.update(6,1500);assert.equal(progress.index,2);progress.update(7,7000);assert.equal(progress.index,3);progress.update(8,30000);assert.equal(progress.index,4);progress.update(1,0);assert.equal(progress.index,4,'old era is retained after population loss');progress.reset();assert.equal(progress.index,0);
for(let i=1;i<BUILDINGS.length;i++)assert.ok(BUILDINGS[i].mass>BUILDINGS[i-1].mass);
const wind=new WindSystem(scene);wind.reset(87);assert.equal(wind.strength,0);wind.updateVisuals(0);assert.equal(wind.lines.visible,false);
wind.setWeather('STRONG_WIND');wind.step(1/60,[]);assert.ok(wind.strength<.01,'wind ramps up');
wind.step(5,[]);assert.ok(wind.strength>.6);wind.setWeather('CALM');wind.step(5,[]);assert.equal(wind.strength,0,'true calm after transition');
wind.reset(19);const states=new Set<string>();for(let i=0;i<600*60;i++){wind.step(1/60,[]);states.add(wind.state);}assert.equal(states.size,3,'random weather visits all states');
// First ground building is anchored; a comparable elevated building is not immune.
const anchor=buildings.spawn(8,0,11,0);anchor.windReady=true;wind.setWeather('STRONG_WIND');wind.remaining=100;wind.step(5,[anchor]);assert.equal(Math.hypot(anchor.body.linvel().x,anchor.body.linvel().y,anchor.body.linvel().z),0);
buildings.clear();const light=buildings.spawn(5,-4,50,0),heavy=buildings.spawn(6,4,50,0);light.windReady=heavy.windReady=true;wind.step(1/60,[light,heavy]);assert.ok(Math.hypot(heavy.body.linvel().x,heavy.body.linvel().z)<Math.hypot(light.body.linvel().x,light.body.linvel().z),'heavier tier accelerates less at equal exposure');
buildings.clear();roads.reset();roads.terrain=undefined;
const homeA=buildings.spawn(1,-5,1,0),homeB=buildings.spawn(1,5,1,0),score=new ScoreSystem();
for(let x=0;x<=6;x++)roads.roads.add(key({x,z:8}));
roads.entranceByBuilding.set(homeA.id,{x:2,z:8});roads.entranceByBuilding.set(homeB.id,{x:6,z:8});roads.version++;
score.update(buildings.buildings,roads);const connected=score.total;assert.equal(score.connectivity,1);assert.equal(score.served,2);assert.equal(score.populationPoints,8);assert.equal(score.buildingPoints,200);
roads.roads.delete('3,8');roads.version++;score.update(buildings.buildings,roads);assert.ok(score.total<connected);assert.equal(score.served,1,'disconnected main-road fragment earns no building access');
roads.roads.add('3,8');roads.version++;score.update(buildings.buildings,roads);assert.equal(score.total,connected);
buildings.remove(homeB);const apartment=buildings.spawn(3,5,2,0);roads.entranceByBuilding.set(apartment.id,{x:6,z:8});score.update(buildings.buildings,roads);assert.ok(score.total>connected,'population and higher-level building increase score');
buildings.clear();roads.reset();score.update(buildings.buildings,roads);assert.equal(score.total,0,'empty city has no road-only points');
wind.dispose();physics.world.free();
console.log('PASS: score breakdown, severed/restored roads, higher building level/population, empty city reset.');
console.log('PASS: 40 random maps, connected river, water prohibition, bridge-only crossings, initial road access, day cycle, night activity, population eras, mass scaling, calm/ramp/random weather, ground anchor.');


