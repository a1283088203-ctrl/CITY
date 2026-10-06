import {NPC} from './NPC';
import {box,litBox} from '../utils/mesh';
export class Vehicle extends NPC{
 constructor(color:number){super(color);this.mesh.clear();this.legs=[];this.arms=[];box(this.mesh,.35,.18,.66,0,.18,0,color);box(this.mesh,.3,.15,.32,0,.33,-.02,0xd3e8de);for(const x of [-.18,.18])for(const z of [-.2,.2])box(this.mesh,.08,.14,.14,x,.1,z,0x33464e);for(const x of [-.1,.1]){litBox(this.mesh,.08,.06,.03,x,.2,.34,0xffe1a2,0xffe8ad,3.5);litBox(this.mesh,.08,.05,.03,x,.2,-.34,0xb84747,0xff3838,2.5);}}
}
