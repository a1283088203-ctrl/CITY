import * as T from 'three';
import type {Building} from '../entities/Building';
import type {RoadSystem} from './RoadSystem';
import {key,fromKey,neighbors} from '../utils/grid';

/* Small mood bubbles over the houses (pixel icons drawn in the in-game painter). A smiley pops up over a building when
 * it is upgraded by a merge; when a house's road gets cut off (its entrance path no longer joins the main road network,
 * anywhere on the map) crying faces pop up over that house. Icons are camera-facing sprites with a fixed small screen
 * size: they pop in, float up a little and fade. They write no depth, so outlines, AO and depth of field never pick
 * them up. */

const ICON_SCREEN=.03,LIFE=2.4,POOL=6;
/** Wait for the merged building to finish its hop before the smiley appears over it. */
const UPGRADE_DELAY=.8;
type Bubble={sprite:T.Sprite;material:T.SpriteMaterial;age:number;base:T.Vector3};

function icon(name:string){
 const texture=new T.TextureLoader().load(new URL(`textures/${name}.png`,document.baseURI).href);
 texture.colorSpace=T.SRGBColorSpace;texture.magFilter=texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;
 return texture;
}

export class MoodIconSystem{
 private readonly happy=icon('mood-happy');private readonly sad=icon('mood-sad');
 private readonly bubbles:Bubble[]=[];private readonly group=new T.Group();
 private timer=2;private wasCut=false;private upgrades:{at:T.Vector3;wait:number}[]=[];
 private main=new Set<string>();private mainVersion=-1;
 constructor(scene:T.Scene){
  for(let i=0;i<POOL;i++){
   const material=new T.SpriteMaterial({map:this.happy,alphaTest:.5,depthWrite:false,sizeAttenuation:false,toneMapped:false,fog:false});
   const sprite=new T.Sprite(material);sprite.center.set(.5,0);sprite.visible=false;sprite.renderOrder=20;this.group.add(sprite);
   this.bubbles.push({sprite,material,age:LIFE,base:new T.Vector3()});
  }
  scene.add(this.group);
 }
 /** Largest connected piece of the road network; recomputed only when the roads change. */
 private mainNetwork(roads:RoadSystem){
  if(roads.version===this.mainVersion)return this.main;this.mainVersion=roads.version;
  const seen=new Set<string>();let best=new Set<string>();
  for(const start of roads.roads){
   if(seen.has(start))continue;seen.add(start);const part=new Set([start]),queue=[fromKey(start)];
   for(let i=0;i<queue.length;i++)for(const n of neighbors(queue[i])){const k=key(n);if(seen.has(k)||!roads.roads.has(k))continue;seen.add(k);part.add(k);queue.push(n);}
   if(part.size>best.size)best=part;
  }
  return this.main=best;
 }
 /** Settled houses whose road has been cut: no entrance path at all, or one that ends on a piece split off the main
  * network. A house that only stands beside a road, or takes a road cell while traffic still runs around it, is fine. */
 stranded(buildings:readonly Building[],roads:RoadSystem){
  const main=this.mainNetwork(roads);if(!main.size)return [];
  return buildings.filter(b=>{if(b.age<=2||b.stable<=.5)return false;const e=roads.entranceByBuilding.get(b.id);return !e||!main.has(key(e));});
 }
 update(dt:number,buildings:readonly Building[],roads:RoadSystem){
  for(const b of this.bubbles){
   if(!b.sprite.visible)continue;b.age+=dt;
   if(b.age>=LIFE){b.sprite.visible=false;continue;}
   // Pop with a little overshoot, drift upwards, fade out over the last half second.
   const t=b.age,pop=t<.22?Math.sin(t/.22*Math.PI*.5)*1.18:t<.34?1.18-(t-.22)/.12*.18:1;
   b.sprite.scale.setScalar(ICON_SCREEN*pop);b.sprite.position.copy(b.base).setY(b.base.y+t*.22);
   b.material.opacity=Math.min(1,(LIFE-t)/.5);
  }
  // Upgrades: once the merged building has landed, the smiley goes over whichever building is nearest the merge.
  for(let i=this.upgrades.length-1;i>=0;i--){
   const u=this.upgrades[i];u.wait-=dt;if(u.wait>0)continue;this.upgrades.splice(i,1);
   if(!buildings.length)continue;
   let best=buildings[0],d=Infinity;
   for(const b of buildings){const p=b.mesh.position,dd=(p.x-u.at.x)**2+(p.z-u.at.z)**2;if(dd<d){d=dd;best=b;}}
   // A house that is cut off is not happy even after an upgrade.
   if(!this.stranded([best],roads).length)this.spawn(this.happy,best);
  }
  const stranded=this.stranded(buildings,roads),cut=stranded.length>0;
  // React straight away when a road has just been cut.
  if(cut&&!this.wasCut)this.timer=Math.min(this.timer,.3);
  this.wasCut=cut;if(!cut)return;
  this.timer-=dt;if(this.timer>0)return;
  this.spawn(this.sad,stranded[Math.floor(Math.random()*stranded.length)]);
  this.timer=1.2+Math.random()*1.4;
 }
 /** Called on every merge upgrade with the merge position. */
 upgraded(position:T.Vector3){this.upgrades.push({at:position.clone(),wait:UPGRADE_DELAY});}
 private spawn(map:T.Texture,building:Building){
  if(this.bubbles.some(b=>b.sprite.visible&&b.sprite.userData.building===building.id))return;
  const b=this.bubbles.find(x=>!x.sprite.visible);if(!b)return;
  const box=building.bounds;b.material.map=map;b.material.opacity=1;b.age=0;b.sprite.visible=true;b.sprite.userData.building=building.id;
  b.base.set((box.min.x+box.max.x)/2+(Math.random()-.5)*.4,box.max.y+.25,(box.min.z+box.max.z)/2+(Math.random()-.5)*.4);
  b.sprite.position.copy(b.base);b.sprite.scale.setScalar(0);
 }
 reset(){for(const b of this.bubbles){b.sprite.visible=false;b.age=LIFE;}this.timer=2;this.wasCut=false;this.upgrades=[];this.main=new Set();this.mainVersion=-1;}
}
