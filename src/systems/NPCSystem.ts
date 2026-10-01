import * as T from 'three';
import {NPC} from '../entities/NPC';
import {RoadSystem} from './RoadSystem';
import {PathfindingSystem} from './PathfindingSystem';
import {key,toWorld} from '../utils/grid';
export class NPCSystem{
 agents:NPC[]=[];protected version=-1;private populationTimer=0;
 constructor(protected scene:T.Scene,protected roads:RoadSystem,protected paths:PathfindingSystem,protected driving=false){}
 protected create(){return new NPC([0xd28b66,0xe4c170,0x5f8f92,0x977fa1][Math.floor(Math.random()*4)]);}
 update(dt:number,population:number,stage:number,activity=1){
 const nodes=this.roads.nodes();if(nodes.length<2)return;
 const dayTarget=this.driving?Math.min(22,1+Math.floor(Math.sqrt(population)/14)):Math.min(65,3+Math.floor(Math.sqrt(population)*.55));
 const target=Math.max(this.driving?1:0,Math.round(dayTarget*activity));this.populationTimer+=dt;
 if(this.populationTimer>.35){this.populationTimer=0;if(this.agents.length<target){const a=this.create();this.agents.push(a);this.scene.add(a.mesh);this.place(a,nodes[Math.floor(Math.random()*nodes.length)]);}else if(this.agents.length>target)this.agents.pop()!.mesh.removeFromParent();}
 for(const a of this.agents){if(this.version!==this.roads.version){a.route=[];this.place(a,nodes[Math.floor(Math.random()*nodes.length)]);}
 a.pause-=dt;if(a.pause>0)continue;
 if(!a.route.length){a.mesh.visible=true;const destinations=!this.driving&&Math.random()<(activity<.65?.8:.3)&&this.roads.entrances.length?this.roads.entrances:nodes;const goal=destinations[Math.floor(Math.random()*destinations.length)];a.route=this.paths.find(a.node,p=>key(p)===key(goal),this.roads.blocked,this.roads.roads).slice(1);if(!a.route.length){a.pause=.4;continue;}}
 const next=a.route[0],w=toWorld(next),offset=this.driving?0:this.roads.sidewalkOffset(next),dx=w.x+offset-a.mesh.position.x,dz=w.z+offset-a.mesh.position.z,dist=Math.hypot(dx,dz),step=dt*(this.driving?1.55+stage*.2:.45+stage*.11);
 if(dist<=step){a.node=next;a.route.shift();a.mesh.position.set(w.x+offset,.12,w.z+offset);if(!a.route.length&&!this.driving){a.pause=.5+Math.random()*2;if(this.roads.entrances.some(p=>key(p)===key(next))){a.mesh.visible=false;a.pause=2;}}}
 else{a.mesh.position.x+=dx/dist*step;a.mesh.position.z+=dz/dist*step;a.mesh.rotation.y=Math.atan2(dx,dz);a.phase+=dt*10;for(let i=0;i<a.legs.length;i++)a.legs[i].rotation.x=Math.sin(a.phase+i*Math.PI)*.4;}
 }this.version=this.roads.version;
 }
 private place(a:NPC,node:NPC['node']){a.node=node;const p=toWorld(node),o=this.driving?0:this.roads.sidewalkOffset(node);a.mesh.position.set(p.x+o,.12,p.z+o);}
 reset(){for(const a of this.agents)a.mesh.removeFromParent();this.agents=[];this.version=-1;this.populationTimer=0;}
}

