import {STAGES} from '../data/progression';
export class ProgressionSystem{
 maxLevel=1;index=0;peakPopulation=0;get stage(){return STAGES[this.index];}
 update(level:number,population=0){this.maxLevel=Math.max(this.maxLevel,level);this.peakPopulation=Math.max(this.peakPopulation,population);const old=this.index;this.index=STAGES.reduce((n,s,i)=>this.peakPopulation>=s.population?i:n,0);return old!==this.index;}
 reset(){this.maxLevel=1;this.index=0;this.peakPopulation=0;}
}
