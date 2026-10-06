import * as T from 'three';
import type {Object3D} from 'three';
import {box} from './mesh';
import {seeded} from './math';

/** Stable per-cell silhouettes, using the same three boxes as the original tree. */
export function voxelTree(parent:Object3D,x:number,z:number,seed:number){
 const random=seeded(seed),shape=Math.floor(random()*4);
 const height=.8+random()*.45,width=.8+random()*.35;
 const palettes=[[0x719b71,0x97b97d],[0x648e70,0x85aa78],[0x77976a,0xa0b880],[0x5f8870,0x80a481]];
 const [leaf,tip]=palettes[Math.floor(random()*palettes.length)];
 const trunk=.48+random()*.25,thickness=.1+random()*.06;
 box(parent,thickness,trunk*height,thickness,x,trunk*height/2,z,0x806850);
 const dx=(random()-.5)*.2,dz=(random()-.5)*.2;
 // Broad, upright, stepped and forked crowns; all stay within their planting cell.
 const forms=[
  [.84,.43,.76,.54,.28,.5,.19],
  [.49,.77,.52,.36,.4,.36,.43],
  [.7,.52,.66,.42,.42,.4,.35],
  [.57,.58,.55,.5,.46,.47,.15]
 ];
 const [w,h,d,tw,th,td,rise]=forms[shape],base=(trunk+.14)*height;
 // Crown boxes live in a pivot group at the trunk top so the wind can tilt them.
 const crown=new T.Group();crown.name='crown';crown.position.set(x,base,z);parent.add(crown);
 box(crown,w*width,h*height,d*width,dx,0,dz,leaf);
 box(crown,tw*width,th*height,td*width,shape===3?.25:dx*.5,rise*height,shape===3?-.16:dz*.5,tip);
}
