import {Building} from '../entities/Building';
export class PopulationSystem{
 population=0;efficiency=0;space=48;utilization=0;
 update(buildings:Building[]){this.population=buildings.reduce((n,b)=>n+b.data.population,0);this.space=this.population?buildings.reduce((n,b)=>n+b.data.population*b.data.livingSpace,0)/this.population:48;
 this.efficiency=this.population?Math.min(99.8,26+Math.log10(this.population+1)*14.76):0;
 this.utilization=Math.min(100,buildings.reduce((n,b)=>n+b.data.width*b.data.depth,0)/576*100);}
}
