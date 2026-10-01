import * as T from 'three';
import {box} from '../utils/mesh';
import type {Cell} from '../utils/grid';
export class NPC{
 mesh=new T.Group();route:Cell[]=[];pause=0;phase=Math.random()*6;node:Cell={x:0,z:0};legs:T.Mesh[]=[];
 constructor(color:number){box(this.mesh,.16,.23,.13,0,.28,0,color);box(this.mesh,.15,.15,.15,0,.48,0,0xedbf93);for(const x of [-.055,.055])this.legs.push(box(this.mesh,.06,.16,.07,x,.09,0,0x3d5962));}
}
