import type {Building} from '../entities/Building';
import type {RoadSystem} from './RoadSystem';
import {SCORING} from '../data/scoring';
import {key,fromKey,neighbors} from '../utils/grid';

/** Live city value: population + standing buildings + reachable-road bonus. */
export class ScoreSystem{
 total=0;populationPoints=0;buildingPoints=0;roadPoints=0;connectivity=0;served=0;
 private version=-1;private reachable=new Set<string>();
 update(buildings:Building[],roads:RoadSystem){
  if(this.version!==roads.version){
   this.version=roads.version;this.reachable.clear();
   // The west entrance is the external connection; severed eastern road fragments
   // are not considered connected merely because they are labelled "main road".
   const gate={x:0,z:roads.terrain?.bridgeRow??8},queue=[gate];
   for(let i=0;i<queue.length;i++){const p=queue[i],k=key(p);
    if(this.reachable.has(k)||!roads.roads.has(k)||roads.blocked.has(k))continue;
    if(roads.terrain?.water.has(k)&&!roads.terrain.bridges.has(k))continue;
    this.reachable.add(k);queue.push(...neighbors(p).filter(n=>!this.reachable.has(key(n))));
   }
  }
  this.populationPoints=buildings.reduce((sum,b)=>sum+b.data.population*SCORING.populationPoint,0);
  this.buildingPoints=buildings.reduce((sum,b)=>sum+SCORING.levelPoints[b.level-1],0);
  this.served=buildings.filter(b=>{const entrance=roads.entranceByBuilding.get(b.id);return entrance&&this.reachable.has(key(entrance));}).length;
  const coverage=buildings.length?this.served/buildings.length:0;
  const network=roads.roads.size?this.reachable.size/roads.roads.size:0;
  this.connectivity=buildings.length?.75*coverage+.25*network:0;
  this.roadPoints=Math.round((this.populationPoints+this.buildingPoints)*SCORING.roadBonusRate*this.connectivity);
  this.total=this.populationPoints+this.buildingPoints+this.roadPoints;
 }
}
