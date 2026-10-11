import * as T from 'three';
import {seeded} from '../utils/math';
import type {WindSystem} from './WindSystem';

/* Drifting cloud shadows on the ground. Every lit material evaluates a soft, tileable value-noise cloud layer that
 * floats at a fixed height: each fragment looks up the cloud above it along the sun ray, and the result scales the sun's
 * shadow factor, so cloud shade shares the stylized blue-grey tint of building shadows (see CityScene) and falls on
 * buildings, ground and the scenery ring alike. Computing it in the receiving shader (instead of casting into the shadow
 * map) gives smooth partial shade with no shadow-map aliasing. The layer slides with the wind; cover and darkness follow
 * the weather (rain is overcast, calm days are sparse). */

/** World units per noise cell; larger = bigger clouds. */
const CLOUD_SCALE=14;
/** The noise repeats every PERIOD cells, so the drift can wrap without a visible jump. */
const PERIOD=64,WRAP=CLOUD_SCALE*PERIOD;
/** Noise level where the shade is half-faded in, per weather: lower = more sky covered. */
const COVER={CALM:.56,BREEZE:.53,STRONG_WIND:.5,RAIN:.38};
/** Peak darkness relative to a building shadow (0..1). */
const OPACITY={CALM:.85,BREEZE:.85,STRONG_WIND:.88,RAIN:.95};
/** Share of ambient/sky light a full cloud also takes away. */
const AMBIENT_DIM='.3';
/** Half-width of the noise band over which shadow edges fade; larger = blurrier edges. */
const SOFT=.11;
/** Height of the cloud layer. */
const HEIGHT=40;

/** Lit built-in materials (and everything derived from them via onBeforeCompile) get the cloud uniforms. */
const LIT=['lambert','phong','standard','physical','toon'] as const;
// Same expression CityScene uses for the sun shadow; the cloud factor multiplies it.
const DIR_SHADOW='getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )';
const WITH_DIR_SHADOW='#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0';

export class CloudShadowSystem{
 // Plain {x,y,z,w} objects (not Vector4): material uniform cloning keeps them by reference, so one update reaches every material.
 /** x,y: drift offset, z: cover threshold, w: opacity. */
 private readonly params={x:0,y:0,z:COVER.CALM,w:OPACITY.CALM};
 /** xyz: world direction towards the sun, w: cloud layer height. */
 private readonly sun={x:0,y:1,z:0,w:HEIGHT};
 private readonly dir=new T.Vector3();
 constructor(){
  for(const k of LIT){const u=T.ShaderLib[k].uniforms as Record<string,T.IUniform>;u.cloudParams={value:this.params};u.cloudSun={value:this.sun};}
  T.ShaderChunk.shadowmap_pars_vertex+=`\n${WITH_DIR_SHADOW}\nvarying vec3 vCloudWorld;\n#endif\n`;
  T.ShaderChunk.shadowmap_vertex+=`\n${WITH_DIR_SHADOW}\nvCloudWorld=worldPosition.xyz;\n#endif\n`;
  T.ShaderChunk.shadowmap_pars_fragment+=`\n${WITH_DIR_SHADOW}
varying vec3 vCloudWorld;uniform vec4 cloudParams;uniform vec4 cloudSun;
float cloudHash(vec2 p,float period){p=mod(p,period);return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float cloudNoise(vec2 p,float period){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(cloudHash(i,period),cloudHash(i+vec2(1.,0.),period),f.x),mix(cloudHash(i+vec2(0.,1.),period),cloudHash(i+vec2(1.,1.),period),f.x),f.y);}
/** 0 = clear sky, 1 = fully under a cloud (already scaled by the weather opacity). */
float cloudShade(){
 float lift=(cloudSun.w-vCloudWorld.y)/max(cloudSun.y,.05);
 vec2 p=(vCloudWorld.xz+cloudSun.xz*lift+cloudParams.xy)/${CLOUD_SCALE.toFixed(1)};
 float n=cloudNoise(p,${PERIOD.toFixed(1)})*.7+cloudNoise(p*2.+vec2(17.,31.),${(PERIOD*2).toFixed(1)})*.3;
 return smoothstep(cloudParams.z-${SOFT},cloudParams.z+${SOFT},n)*cloudParams.w;}
#endif\n`;
  const before=T.ShaderChunk.lights_fragment_begin;
  // The cloud blocks the sun like a cast shadow (same blue-grey tint) ...
  T.ShaderChunk.lights_fragment_begin=before.replace(`directLight.color, ${DIR_SHADOW} )`,`directLight.color, ${DIR_SHADOW} * ( 1.0 - cloudShade() ) )`);
  if(T.ShaderChunk.lights_fragment_begin===before)console.warn('CloudShadowSystem: sun shadow chunk not found, cloud shadows disabled');
  // ... and also dims some sky light, so cloud shade reads a little deeper than a building shadow.
  T.ShaderChunk.lights_fragment_end=`${WITH_DIR_SHADOW}\nreflectedLight.indirectDiffuse *= 1.0 - ${AMBIENT_DIM} * cloudShade();\n#endif\n`+T.ShaderChunk.lights_fragment_end;
 }
 /** New random cloud field for a new game. */
 reroll(seed=Math.floor(Math.random()*0xffffffff)){const r=seeded(seed);this.params.x=r()*WRAP;this.params.y=r()*WRAP;}
 update(dt:number,wind:WindSystem,sun:T.Vector3){
  // Clouds always drift a little and hurry along with the wind.
  const speed=.9+wind.strength*5;
  this.params.x=(this.params.x-wind.direction.x*speed*dt+WRAP)%WRAP;this.params.y=(this.params.y-wind.direction.z*speed*dt+WRAP)%WRAP;
  const ease=1-Math.exp(-Math.max(0,dt)*.3);
  this.params.z+=(COVER[wind.state]-this.params.z)*ease;this.params.w+=(OPACITY[wind.state]-this.params.w)*ease;
  this.dir.copy(sun).normalize();this.sun.x=this.dir.x;this.sun.y=this.dir.y;this.sun.z=this.dir.z;
 }
}
