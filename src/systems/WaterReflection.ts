import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {fromKey,toWorld} from '../utils/grid';

/** Layer for the river tiles: the main camera renders it, the reflection camera does not. */
export const WATER_LAYER=2;
const waterDaylight={value:1},waterFog={value:new T.Color()};
// User-tunable look (settings water palette), shared by every river surface.
const waterColor={value:new T.Color('#65adf1')},waterReflect={value:.51},waterOpacity={value:.79},waterGlint={value:1.01};
/** Approved palette from the settings water panel. */
export const defaultWater=()=>({color:'#65adf1',reflection:.51,opacity:.79,glint:1.01});
/** Scene light reaching the water (1 at midday): the unlit water shader takes the same dusk and night dimming and tint
 * as the lit ground around it, instead of keeping its daytime brightness and seeming to glow. */
const waterLight={value:new T.Color(1,1,1)};
export function setWaterLight(color:T.Color){waterLight.value.copy(color);}
export type WaterStyle=ReturnType<typeof defaultWater>;
/** Water colour (sRGB hex), daytime reflection share, surface opacity and glint strength. */
export function setWaterStyle(style:WaterStyle){waterColor.value.set(style.color);waterReflect.value=style.reflection;waterOpacity.value=style.opacity;waterGlint.value=style.glint;}
/** 1 by day, 0 at night: scales the water tones and turns the glints off after dark. */
export function setWaterDaylight(value:number){waterDaylight.value=value;}
/** Live fog colour, so far water fades out exactly like the outer terrain. */
export function setWaterFog(color:T.Color){waterFog.value.copy(color);}

/** Shore distance map: world -48..48 on both axes at 0.25 units per texel, distance to the nearest land in units
 * (0..SHORE_MAX, stored in red). Drives the shallow-to-deep colour steps and the white foam line along the banks. */
const SHORE_EXTENT=48,SHORE_TEXEL=.25,SHORE_RES=SHORE_EXTENT*2/SHORE_TEXEL,SHORE_MAX=3;
function shoreMap(water:Set<string>,outer:[number,number][]){
 const n=SHORE_RES,inf=1e9,dist=new Float32Array(n*n);
 const outerSet=new Set(outer.map(([x,z])=>`${x},${z}`));
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=-SHORE_EXTENT+(i+.5)*SHORE_TEXEL,z=-SHORE_EXTENT+(j+.5)*SHORE_TEXEL;let wet:boolean;
  if(Math.abs(x)<12&&Math.abs(z)<12)wet=water.has(`${Math.floor((x+12)/1.5)},${Math.floor((z+12)/1.5)}`);
  else wet=outerSet.has(`${Math.floor(x/3)*3+1.5},${Math.floor(z/3)*3+1.5}`);
  dist[j*n+i]=wet?inf:0;
 }
 // Two-pass chamfer distance transform (1 / √2 steps).
 const d2=Math.SQRT2,at=(i:number,j:number)=>i<0||j<0||i>=n||j>=n?inf:dist[j*n+i];
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i;if(!dist[k])continue;dist[k]=Math.min(dist[k],at(i-1,j)+1,at(i,j-1)+1,at(i-1,j-1)+d2,at(i+1,j-1)+d2);}
 for(let j=n-1;j>=0;j--)for(let i=n-1;i>=0;i--){const k=j*n+i;if(!dist[k])continue;dist[k]=Math.min(dist[k],at(i+1,j)+1,at(i,j+1)+1,at(i+1,j+1)+d2,at(i-1,j+1)+d2);}
 const data=new Uint8Array(n*n*4);
 for(let k=0;k<n*n;k++){data[k*4]=Math.round(Math.min(1,dist[k]*SHORE_TEXEL/SHORE_MAX)*255);data[k*4+3]=255;}
 const texture=new T.DataTexture(data,n,n,T.RGBAFormat);texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;
 return texture;
}

/** One river-shaped reflection target that mirrors the whole scene (refreshed a few times per second). */
export class WaterReflection{
 readonly surface:Reflector;private shore:T.DataTexture;
 constructor(water:Set<string>,bridges:Set<string>,outer:[number,number][]=[]){
  this.shore=shoreMap(water,outer);
  const planes=[...water].filter(k=>!bridges.has(k)).map(k=>{const p=toWorld(fromKey(k));return new T.PlaneGeometry(1.5,1.5).translate(p.x,-p.z,0);});
  for(const [x,z] of outer)planes.push(new T.PlaneGeometry(3.01,3.01).translate(x,-z,0));
  const geometry=mergeGeometries(planes,false)!;planes.forEach(p=>p.dispose());
  const mobile=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches,size=mobile?256:512;
  this.surface=new Reflector(geometry,{textureWidth:size,textureHeight:size,multisample:0,clipBias:.003,color:0x5b9ca8,shader:{
   uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},time:{value:0},shoreMap:{value:null}},
   vertexShader:`uniform mat4 textureMatrix;varying vec4 reflectedUv;varying vec2 riverPosition;
    void main(){riverPosition=position.xy;reflectedUv=textureMatrix*vec4(position,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
   fragmentShader:`uniform sampler2D tDiffuse,shoreMap;uniform vec3 color,fogTint,waterColor,waterLight;uniform float time,daylight,waterReflect,waterOpacity,waterGlint;varying vec4 reflectedUv;varying vec2 riverPosition;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
     return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
    float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
    void main(){
     // Every effect is snapped to a 0.1-unit grid so it lands on the game's pixel grain.
     vec2 px=floor(riverPosition*10.)/10.;
     vec2 uv=reflectedUv.xy/reflectedUv.w;uv.x+=sin(px.y*5.0+time*.9)*.0025;uv.y+=sin(px.x*3.0+time*.65)*.0012;
     vec3 reflection=texture2D(tDiffuse,clamp(uv,0.0,1.0)).rgb;
     // Distance to the nearest bank (world units), roughened with noise so the depth contours wander like a real bed.
     float shore=texture2D(shoreMap,(vec2(px.x,-px.y)+${SHORE_EXTENT.toFixed(1)})/${(SHORE_EXTENT*2).toFixed(1)}).r*${SHORE_MAX.toFixed(1)};
     float depth=shore+(vnoise(px*1.6)*.65+vnoise(px*4.1)*.35-.5)*.55;
     // Flat colour steps: pale shallows along the banks, then two mid tones, deep in the middle.
     float band=depth<.4?0.:depth<.85?1.:depth<1.4?2.:3.;
     vec3 tint=mix(mix(waterColor,vec3(.78,.93,1.),.45),waterColor*.8,band/3.);
     // A clear, saturated blue; the reflection is cooled towards it so mirrored sky and buildings read as in the water.
     // Lit like the land: the scene's sun + sky light tints and dims the water at dusk and night.
     vec3 water=tint*waterLight;
     // Night water is darker, so the reflection (lit windows) takes a slightly larger share after dark; shallows
     // reflect a little less so the steps stay readable.
     // After dark the mirrored sky is dimmed and takes a smaller share, so the river sits in the night like the land
     // around it; lit windows still show, just softer.
     vec3 c=mix(water,reflection*vec3(.8,.93,1.08)*mix(.7,1.,daylight),waterReflect*mix(.75,1.,daylight)*mix(.6,1.,band/3.));
     // A little of the haze colour at dusk and night takes the edge off the saturated blue.
     c=mix(c,fogTint*.85,(1.-daylight)*.22);
     // Thin white foam right at the bank, gently breathing along its length.
     float edge=shore+(vnoise(px*3.2+vec2(time*.25,-time*.18))-.5)*.12;
     float foam=step(edge,.11);
     // Glints: short horizontal dashes on a stretched grid, each twinkling on its own phase.
     vec2 cell=floor(riverPosition*vec2(5.,12.));float h=hash(cell);
     float glint=step(.86,h)*smoothstep(.55,.95,sin(time*(1.5+h*2.)+h*40.));
     // Fine sparkle points that flash briefly.
     float h2=hash(floor(riverPosition*14.)+7.3);
     float spark=step(.975,h2)*step(.7,sin(time*3.+h2*60.));
     // By day the glints are bright white; at night they stay on as a faint, cool moonlit shimmer.
     float shine=min(1.,max(glint*.85,spark)*mix(.16,1.,daylight)*waterGlint);
     vec3 glow=mix(vec3(.62,.74,.9),vec3(1.,1.,.96),daylight)*mix(vec3(.55),vec3(1.),daylight)*min(vec3(1.),waterLight*1.6);
     // Same distance fade as the outer terrain (17..43 units, 6 dithered steps), so the far river
     // dissolves into the haze with the land instead of ending in a hard edge at dusk and night.
     float fade=smoothstep(17.,43.,length(riverPosition));fade=clamp(floor(fade*6.+bayer4(gl_FragCoord.xy*.5))/6.,0.,1.);
     c=mix(mix(c,glow,shine),vec3(.96,.99,1.)*waterLight,foam*mix(.55,.9,daylight));
     gl_FragColor=vec4(mix(c,fogTint,fade),mix(mix(waterOpacity,1.,max(shine,foam)),1.,fade));
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`
  }});
  // Shared, so one call per frame dims the water and its glints for dusk and night.
  (this.surface.material as T.ShaderMaterial).uniforms.daylight=waterDaylight;
  (this.surface.material as T.ShaderMaterial).uniforms.fogTint=waterFog;
  Object.assign((this.surface.material as T.ShaderMaterial).uniforms,{waterColor,waterReflect,waterOpacity,waterGlint,waterLight});
  (this.surface.material as T.ShaderMaterial).uniforms.shoreMap.value=this.shore;
  this.surface.name='river-reflection';this.surface.rotation.x=-Math.PI/2;this.surface.position.y=-.154;
  const material=this.surface.material as T.ShaderMaterial;material.transparent=true;material.depthWrite=false;
  // Blend colour only and keep the tile's alpha: outer scenery is tagged alpha .75 so the boundary pass skips it.
  // Overwriting that tag drew a dark outline where the far water tiles meet the sky.
  Object.assign(material,{blending:T.CustomBlending,blendSrc:T.SrcAlphaFactor,blendDst:T.OneMinusSrcAlphaFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor});
  // Reflect the whole scene (terrain, trees, lamps, mountains, people, cars), not just the buildings on layer 1.
  this.surface.camera.layers.set(0);this.surface.camera.layers.enable(1);
  const texture=this.surface.getRenderTarget().texture;texture.minFilter=T.NearestFilter;texture.magFilter=T.NearestFilter;
  const render=this.surface.onBeforeRender;let last=-Infinity;
  this.surface.onBeforeRender=(...args)=>{const now=performance.now();if(now-last<(mobile?125:66))return;last=now;render.apply(this.surface,args);};
 }
 update(time:number){(this.surface.material as T.ShaderMaterial).uniforms.time.value=time;}
 dispose(){this.surface.removeFromParent();this.surface.geometry.dispose();this.surface.dispose();this.shore.dispose();}
}
