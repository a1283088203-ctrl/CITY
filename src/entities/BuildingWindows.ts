import * as T from 'three';
import {windowBox} from '../utils/mesh';

type Pane=readonly [number,number,number,number]; // width, height, horizontal offset, vertical offset
const STYLES:readonly (readonly Pane[])[]=[
 [[.24,.26,0,0]],
 [[.105,.28,-.0675,0],[.105,.28,.0675,0]],
 [[.105,.12,-.0675,-.0775],[.105,.12,.0675,-.0775],[.105,.12,-.0675,.0775],[.105,.12,.0675,.0775]],
 [[.17,.32,0,0]],
 [[.26,.12,0,-.0775],[.26,.12,0,.0775]],
 [[.24,.20,0,-.045],[.24,.065,0,.1175]]
];

/** Six pane layouts. Gaps form divisions without reintroducing dark window outlines. */
export function facadeWindow(parent:T.Group,x:number,y:number,z:number,side:boolean,level:number,variant:number,emission:number,litChance:number){
 const style=(level<=3?0:3)+((variant%3)+3)%3;
 let first:T.Mesh|undefined;
 for(const [width,height,dx,dy] of STYLES[style]){
  // All panes of one window share a light state, while separate windows remain random.
  const pane=first?first.clone():windowBox(parent,1,1,1,0,0,0,0x446875,emission,level<3?1.7:2.5,litChance);
  if(first)parent.add(pane);else first=pane;
  pane.scale.set(side?.025:width,height,side?width:.025);
  pane.position.set(x+(side?0:dx),y+dy,z+(side?dx:0));
 }
}
