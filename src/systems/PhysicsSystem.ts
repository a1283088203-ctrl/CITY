import RAPIER from '@dimforge/rapier3d-compat';
import {CITY} from '../data/cityConfig';
export class PhysicsSystem{
 world!:RAPIER.World;
 async init(){await RAPIER.init();this.reset();}
 reset(){this.world?.free();this.world=new RAPIER.World({x:0,y:CITY.gravity,z:0});this.world.timestep=CITY.step;
 this.world.createCollider(RAPIER.ColliderDesc.cuboid(CITY.half,.5,CITY.half).setTranslation(0,-.5,0).setFriction(.85));
 for(const x of [-1,1]){this.world.createCollider(RAPIER.ColliderDesc.cuboid(.25,.5,CITY.half).setTranslation(x*(CITY.half+.25),.1,0));this.world.createCollider(RAPIER.ColliderDesc.cuboid(CITY.half,.5,.25).setTranslation(0,.1,x*(CITY.half+.25)));}}
 step(){this.world.step();}
}
