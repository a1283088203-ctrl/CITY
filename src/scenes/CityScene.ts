import {SkyGradient} from './SkyGradient';
import {MountainRing} from './MountainRing';
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
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {CRT_SHADER} from './CrtPass';
export class CityScene{
 skyGradient:SkyGradient;mountains:MountainRing;
 scene=new T.Scene();renderer:T.WebGLRenderer;sun=new T.DirectionalLight(0xffe2ba,2.5);ambient=new T.HemisphereLight(0xdff5ed,0x647557,2);private stage=0;
 colorGrade?:ColorGradePass;boundary?:BoundaryPass;composer?:EffectComposer;bloom?:UnrealBloomPass;crt?:ShaderPass;bloomScale=1;private bloomStage=0;private streetLights=[new T.PointLight(0xffd7a1,0,4,2),new T.PointLight(0xffd7a1,0,4,2)];
 constructor(parent:HTMLElement){
  // Pixel-dithered fog everywhere: quantize the fog factor with an ordered Bayer matrix.
  T.ShaderChunk.fog_pars_fragment=`#ifdef USE_FOG\nuniform vec3 fogColor;varying float vFogDepth;\n#ifdef FOG_EXP2\nuniform float fogDensity;\n#else\nuniform float fogNear;uniform float fogFar;\n#endif\nfloat bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}\nfloat bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}\n#endif`;
  T.ShaderChunk.fog_fragment=`#ifdef USE_FOG\n#ifdef FOG_EXP2\nfloat fogFactor=1.0-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);\n#else\nfloat fogFactor=smoothstep(fogNear,fogFar,vFogDepth);\n#endif\nfogFactor=floor(fogFactor*8.+bayer4(gl_FragCoord.xy*.5))/8.;\ngl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,fogFactor);\n#endif`;
  // Stylized shadows: cast areas pick up a strong cool blue-grey scaled by the light's own energy; lit and ambient-lit pixels keep their original colors.
  const dirShadow='getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )';
  const lum='dot( directLight.color, vec3( .2126, .7152, .0722 ) )';
  T.ShaderChunk.lights_fragment_begin=T.ShaderChunk.lights_fragment_begin.replace(`directLight.color *= ( directLight.visible && receiveShadow ) ? ${dirShadow} : 1.0;`,`directLight.color = ( directLight.visible && receiveShadow ) ? mix( vec3( .15, .24, .50 ) * ${lum}, directLight.color, ${dirShadow} ) : directLight.color;`);
  this.renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(this.pixelScale(innerWidth,innerHeight));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.setClearColor(0xc9deda);parent.append(this.renderer.domElement);
 this.scene.fog=new T.Fog(0xc9deda,70,160);this.scene.add(this.ambient,this.sun);this.sun.position.set(-15,30,18);this.sun.castShadow=true;const shadowSize=matchMedia('(pointer: coarse)').matches?1024:2048;this.sun.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(this.sun.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:1,far:90});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.025;
 box(this.scene,24,1,24,0,-.85,0,0x9a9870);box(this.scene,24.6,.4,24.6,0,-1.2,0,0x557f78);box(this.scene,25,.18,25,0,-1.48,0,0x789a87);
 for(const s of [-1,1]){box(this.scene,24.5,.3,.25,0,.05,s*12.2,0xe3d7b8);box(this.scene,.25,.3,24.5,s*12.2,.05,0,0xe3d7b8);}
 this.skyGradient=new SkyGradient(this.scene);this.mountains=new MountainRing(this.scene);this.setStage(0);
 }
 enablePostProcessing(camera:T.PerspectiveCamera){
  this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=Math.pow(2,FIXED_GRADE.exposure);
  this.composer=new EffectComposer(this.renderer);for(const target of [this.composer.renderTarget1,this.composer.renderTarget2])target.depthTexture=new T.DepthTexture(target.width,target.height,T.UnsignedIntType);this.composer.addPass(new RenderPass(this.scene,camera));this.boundary=new BoundaryPass(camera);this.composer.addPass(this.boundary);
  this.bloom=new UnrealBloomPass(new T.Vector2(innerWidth/2,innerHeight/2),.12,.18,1.25);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());this.colorGrade=new ColorGradePass();this.colorGrade.set(FIXED_GRADE);this.composer.addPass(this.colorGrade);
  this.crt=new ShaderPass(CRT_SHADER);this.crt.enabled=false;this.composer.addPass(this.crt);
  this.scene.add(...this.streetLights);for(const light of [this.sun,this.ambient,...this.streetLights])light.layers.enable(1);
 }
 setStage(index:number){this.stage=index;}
 applyLighting(time:TimeOfDaySystem,dt:number){
  this.scene.background=null;
  this.skyGradient.update(time.night,time.hour);(this.scene.fog as T.Fog).color.copy(this.skyGradient.fogColor);this.mountains.update(this.skyGradient.fogColor,this.skyGradient.material.uniforms.upper.value);
  this.sun.color.copy(time.sun);this.sun.intensity=time.sunPower;this.ambient.color.copy(time.ambient);this.ambient.intensity=time.ambientPower;
  const angle=(time.hour-6)/24*Math.PI*2;this.sun.position.set(Math.cos(angle)*28,Math.max(9,Math.sin(angle)*35),18);
  setNightLights(time.night,dt);this.boundary?.update(this.ambient,this.sun,time.sky,this.scene.fog as T.Fog);
  this.bloomStage+=(STAGES[Math.max(0,this.stage)].bloom-this.bloomStage)*(1-Math.exp(-dt*.25));
  if(this.bloom){
   // Daylight highlights need a visible baseline; keep the established night glow.
   this.bloom.strength=T.MathUtils.lerp(.3+this.bloomStage*.5,this.bloomStage,time.night)*this.bloomScale;
   this.bloom.threshold=T.MathUtils.lerp(.85,1.25,time.night);
   this.bloom.radius=.12+this.bloomStage*.15;
  }
 }
 setStreetLights(positions:T.Vector3[],night:number){this.streetLights.forEach((light,i)=>{light.intensity=positions[i]?night*2.4:0;if(positions[i])light.position.copy(positions[i]);});}
 render(camera:T.PerspectiveCamera){if(this.composer)this.composer.render();else this.renderer.render(this.scene,camera);}
 /** Keep the pixel-grain look on any screen: render scale is capped by an absolute buffer size, so fullscreen on large monitors never gets smoother than the intended grain. UI is DOM and stays crisp. */
 private pixelScale(w:number,h:number){const coarse=matchMedia('(pointer: coarse)').matches;return Math.min(coarse?.65:.5,(coarse?1280:960)/w,(coarse?800:540)/h);}
 setCrt(on:boolean){if(this.crt)this.crt.enabled=on;}
 resize(w:number,h:number){const scale=this.pixelScale(w,h);this.renderer.setPixelRatio(scale);this.renderer.setSize(w,h);if(this.composer){this.composer.setPixelRatio(scale);this.composer.setSize(w,h);}if(this.crt)(this.crt.uniforms.resolution.value as T.Vector2).set(w*scale,h*scale);}
}









