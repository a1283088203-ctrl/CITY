import {SkyGradient} from './SkyGradient';
import {FIXED_GRADE} from '../data/colorGrade';
import {ColorGradePass} from './ColorGradePass';
import {BoundaryPass} from './BoundaryPass';
import * as T from 'three';
import {box} from '../utils/mesh';
import {STAGES} from '../data/progression';
import type {TimeOfDaySystem} from '../systems/TimeOfDaySystem';
import {setNightLights} from '../utils/mesh';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
export class CityScene{
 skyGradient:SkyGradient;
 scene=new T.Scene();renderer:T.WebGLRenderer;sun=new T.DirectionalLight(0xffe2ba,2.5);ambient=new T.HemisphereLight(0xdff5ed,0x647557,2);private stage=0;
 colorGrade?:ColorGradePass;boundary?:BoundaryPass;composer?:EffectComposer;bloom?:UnrealBloomPass;private bloomStage=0;private streetLights=[new T.PointLight(0xffd7a1,0,4,2),new T.PointLight(0xffd7a1,0,4,2)];
 constructor(parent:HTMLElement){this.renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(matchMedia('(pointer: coarse)').matches?.65:.5);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.setClearColor(0xc9deda);parent.append(this.renderer.domElement);
 this.scene.fog=new T.Fog(0xc9deda,70,160);this.scene.add(this.ambient,this.sun);this.sun.position.set(-15,30,18);this.sun.castShadow=true;const shadowSize=matchMedia('(pointer: coarse)').matches?1024:2048;this.sun.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(this.sun.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:1,far:90});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.025;
 box(this.scene,24,1,24,0,-.85,0,0x9a9870);box(this.scene,24.6,.4,24.6,0,-1.2,0,0x557f78);box(this.scene,25,.18,25,0,-1.48,0,0x789a87);
 for(const s of [-1,1]){box(this.scene,24.5,.3,.25,0,.05,s*12.2,0xe3d7b8);box(this.scene,.25,.3,24.5,s*12.2,.05,0,0xe3d7b8);}
 this.skyGradient=new SkyGradient(this.scene);this.setStage(0);
 }
 enablePostProcessing(camera:T.PerspectiveCamera){
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=Math.pow(2,FIXED_GRADE.exposure);
  this.composer=new EffectComposer(this.renderer);for(const target of [this.composer.renderTarget1,this.composer.renderTarget2])target.depthTexture=new T.DepthTexture(target.width,target.height,T.UnsignedIntType);this.composer.addPass(new RenderPass(this.scene,camera));this.boundary=new BoundaryPass(camera);this.composer.addPass(this.boundary);
  this.bloom=new UnrealBloomPass(new T.Vector2(innerWidth/2,innerHeight/2),.12,.18,1.25);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());this.colorGrade=new ColorGradePass();this.colorGrade.set(FIXED_GRADE);this.composer.addPass(this.colorGrade);
  this.scene.add(...this.streetLights);for(const light of [this.sun,this.ambient,...this.streetLights])light.layers.enable(1);
 }
 setStage(index:number){this.stage=index;}
 applyLighting(time:TimeOfDaySystem,dt:number){
  this.scene.background=null;
  this.skyGradient.update(time.night,time.hour);(this.scene.fog as T.Fog).color.copy(this.skyGradient.fogColor);
  this.sun.color.copy(time.sun);this.sun.intensity=time.sunPower;this.ambient.color.copy(time.ambient);this.ambient.intensity=time.ambientPower;
  const angle=(time.hour-6)/24*Math.PI*2;this.sun.position.set(Math.cos(angle)*28,Math.max(9,Math.sin(angle)*35),18);
  setNightLights(time.night,dt);this.boundary?.update(this.ambient,this.sun,time.sky,this.scene.fog as T.Fog);
  this.bloomStage+=(STAGES[Math.max(0,this.stage)].bloom-this.bloomStage)*(1-Math.exp(-dt*.25));
  if(this.bloom){this.bloom.strength=this.bloomStage*(.12+.88*time.night);this.bloom.radius=.12+this.bloomStage*.15;}
 }
 setStreetLights(positions:T.Vector3[],night:number){this.streetLights.forEach((light,i)=>{light.intensity=positions[i]?night*2.4:0;if(positions[i])light.position.copy(positions[i]);});}
 render(camera:T.PerspectiveCamera){if(this.composer)this.composer.render();else this.renderer.render(this.scene,camera);}
 resize(w:number,h:number){this.renderer.setSize(w,h);this.composer?.setSize(w,h);}
}









