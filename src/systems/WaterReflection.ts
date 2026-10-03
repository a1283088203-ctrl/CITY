import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {fromKey,toWorld} from '../utils/grid';

/** One river-shaped reflection target; only buildings and lighting use layer 1. */
export class WaterReflection{
 readonly surface:Reflector;
 constructor(water:Set<string>,bridges:Set<string>){
  const planes=[...water].filter(k=>!bridges.has(k)).map(k=>{const p=toWorld(fromKey(k));return new T.PlaneGeometry(1.5,1.5).translate(p.x,-p.z,0);});
  const geometry=mergeGeometries(planes,false)!;planes.forEach(p=>p.dispose());
  const mobile=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches,size=mobile?256:512;
  this.surface=new Reflector(geometry,{textureWidth:size,textureHeight:size,multisample:0,clipBias:.003,color:0x5b9ca8,shader:{
   uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},time:{value:0}},
   vertexShader:`uniform mat4 textureMatrix;varying vec4 reflectedUv;varying vec2 riverPosition;
    void main(){riverPosition=position.xy;reflectedUv=textureMatrix*vec4(position,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
   fragmentShader:`uniform sampler2D tDiffuse;uniform vec3 color;uniform float time;varying vec4 reflectedUv;varying vec2 riverPosition;
    void main(){vec2 uv=reflectedUv.xy/reflectedUv.w;uv.x+=sin(riverPosition.y*5.0+time*.9)*.0015;uv.y+=sin(riverPosition.x*3.0+time*.65)*.0008;
     vec3 reflection=texture2D(tDiffuse,clamp(uv,0.0,1.0)).rgb;gl_FragColor=vec4(mix(color,reflection,.82),.48);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`
  }});
  this.surface.name='river-reflection';this.surface.rotation.x=-Math.PI/2;this.surface.position.y=-.154;
  const material=this.surface.material as T.ShaderMaterial;material.transparent=true;material.depthWrite=false;
  this.surface.camera.layers.set(1);
  const texture=this.surface.getRenderTarget().texture;texture.minFilter=T.NearestFilter;texture.magFilter=T.NearestFilter;
  const render=this.surface.onBeforeRender;let last=-Infinity;
  this.surface.onBeforeRender=(...args)=>{const now=performance.now();if(now-last<(mobile?125:66))return;last=now;render.apply(this.surface,args);};
 }
 update(time:number){(this.surface.material as T.ShaderMaterial).uniforms.time.value=time;}
 dispose(){this.surface.removeFromParent();this.surface.geometry.dispose();this.surface.dispose();}
}
