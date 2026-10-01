import {type Cell,key,neighbors,fromKey} from '../utils/grid';
export class PathfindingSystem{
 /** Breadth-first search is shortest-path optimal on this uniform-cost grid. */
 find(start:Cell,goal:(p:Cell)=>boolean,blocked:Set<string>,allowed?:Set<string>):Cell[]{
 const queue=[start],parents=new Map<string,string|null>([[key(start),null]]);let end:string|undefined;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(goal(p)){end=key(p);break;}
 for(const n of neighbors(p)){const k=key(n);if(parents.has(k)||blocked.has(k)||(allowed&&!allowed.has(k)))continue;parents.set(k,key(p));queue.push(n);}}
 if(!end)return [];const path:Cell[]=[];let at:string|null=end;while(at!==null){path.push(fromKey(at));at=parents.get(at)??null;}return path.reverse();
 }
}
