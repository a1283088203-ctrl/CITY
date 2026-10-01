import {NPCSystem} from './NPCSystem';
import {Vehicle} from '../entities/Vehicle';
export class VehicleSystem extends NPCSystem{
 protected create(){return new Vehicle([0xefae65,0xd77668,0x709daa,0xe8dcc0][Math.floor(Math.random()*4)]);}
}
