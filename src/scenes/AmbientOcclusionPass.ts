import * as T from 'three';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

const VERTEX=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

/** Screen-space ambient occlusion from the scene depth alone (no extra geometry or normal render).
 * Pass 1 reconstructs view positions and face normals from depth and gathers a small disc of samples, rotated per
 * pixel in a 4x4 Bayer pattern; it writes occlusion and linear depth to a private target. Pass 2 averages each 4x4
 * block (covering every rotation, so the pattern cancels out), weighted by depth so occlusion never bleeds across
 * silhouettes, and darkens creases and contact areas with the same cool blue-grey family as the cast shadows.
 * Runs in linear light before bloom and depth of field. Lit windows and the sky are left untouched.
 */
export class AmbientOcclusionPass extends Pass{
 private target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:false});
 private occlusion:FullScreenQuad;private composite:FullScreenQuad;
 private occlusionMaterial:T.ShaderMaterial;private compositeMaterial:T.ShaderMaterial;
 /** The composer ping-pongs targets, so only the scene render's own target holds valid depth; the boundary pass records it. */
 constructor(private camera:T.PerspectiveCamera,private source:{depth:T.Texture|null},samples:number){
  super();
  this.occlusionMaterial=new T.ShaderMaterial({depthTest:false,depthWrite:false,
   uniforms:{tDepth:{value:null},cameraRange:{value:new T.Vector2()},frustum:{value:new T.Vector2()},texel:{value:new T.Vector2()},radius:{value:.9},projScale:{value:1}},
   vertexShader:VERTEX,
   fragmentShader:`
    #define SAMPLES ${samples}
    uniform sampler2D tDepth;uniform vec2 cameraRange,frustum,texel;uniform float radius,projScale;varying vec2 vUv;
    float linearDepth(vec2 uv){float d=texture2D(tDepth,uv).x;return cameraRange.x*cameraRange.y/(cameraRange.y-d*(cameraRange.y-cameraRange.x));}
    vec3 viewPos(vec2 uv,float z){return vec3((uv*2.-1.)*frustum*z,-z);}
    vec3 viewAt(vec2 uv){return viewPos(uv,linearDepth(uv));}
    float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
    float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
    void main(){
     if(texture2D(tDepth,vUv).x>.99999){gl_FragColor=vec4(0.,1e4,0.,1.);return;}
     float z=linearDepth(vUv);vec3 p=viewPos(vUv,z);
     // Face normal from the neighbour on the flatter side, so silhouettes keep the right plane.
     vec2 dx=vec2(texel.x,0.),dy=vec2(0.,texel.y);
     vec3 r=viewAt(vUv+dx)-p,l=p-viewAt(vUv-dx),u=viewAt(vUv+dy)-p,d=p-viewAt(vUv-dy);
     vec3 n=normalize(cross(abs(r.z)<abs(l.z)?r:l,abs(u.z)<abs(d.z)?u:d));if(n.z<0.)n=-n;
     float rpx=min(radius*projScale/z,48.);
     if(rpx<1.){gl_FragColor=vec4(0.,z,0.,1.);return;}
     float rot=bayer4(gl_FragCoord.xy)*6.2831853,occ=0.;
     for(int i=0;i<SAMPLES;i++){
      float t=(float(i)+.5)/float(SAMPLES),a=float(i)*2.39996323+rot;
      vec3 v=viewAt(vUv+vec2(cos(a),sin(a))*sqrt(t)*rpx*texel)-p;float len=length(v);
      // Geometry rising above the surface within the radius occludes it; farther (or sky) samples fade out.
      occ+=max(0.,dot(n,v/max(len,1e-4))-.15)*(1.-smoothstep(radius*.5,radius,len));
     }
     float ao=clamp(occ/float(SAMPLES)*2.2,0.,1.)*(1.-smoothstep(55.,110.,z));
     gl_FragColor=vec4(ao,z,0.,1.);
    }`});
  this.compositeMaterial=new T.ShaderMaterial({depthTest:false,depthWrite:false,
   uniforms:{tDiffuse:{value:null},tAO:{value:this.target.texture},texel:{value:new T.Vector2()},tint:{value:new T.Color(.5,.58,.74)},strength:{value:.85}},
   vertexShader:VERTEX,
   fragmentShader:`
    uniform sampler2D tDiffuse,tAO;uniform vec2 texel;uniform vec3 tint;uniform float strength;varying vec2 vUv;
    void main(){
     vec4 c=texture2D(tDiffuse,vUv);vec2 center=texture2D(tAO,vUv).xy;
     if(center.y>9e3||abs(c.a-.25)<.015){gl_FragColor=c;return;}
     float sum=0.,weight=0.;
     for(int x=-2;x<2;x++)for(int y=-2;y<2;y++){
      vec2 s=texture2D(tAO,vUv+vec2(float(x),float(y))*texel).xy;
      float k=exp(-abs(s.y-center.y)/(center.y*.02+.05));sum+=s.x*k;weight+=k;
     }
     gl_FragColor=vec4(c.rgb*mix(vec3(1.),tint,sum/weight*strength),c.a);
    }`});
  this.occlusion=new FullScreenQuad(this.occlusionMaterial);this.composite=new FullScreenQuad(this.compositeMaterial);
 }
 override render(renderer:T.WebGLRenderer,writeBuffer:T.WebGLRenderTarget,readBuffer:T.WebGLRenderTarget){
  const width=readBuffer.width,height=readBuffer.height,tan=Math.tan(T.MathUtils.degToRad(this.camera.fov)/2);
  if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
  const o=this.occlusionMaterial.uniforms;
  o.tDepth.value=this.source.depth??readBuffer.depthTexture;o.cameraRange.value.set(this.camera.near,this.camera.far);
  o.frustum.value.set(tan*this.camera.aspect,tan);o.texel.value.set(1/width,1/height);o.projScale.value=height/(2*tan);
  renderer.setRenderTarget(this.target);this.occlusion.render(renderer);
  // The composite never samples the depth texture, so it can write straight into the write buffer. That buffer may
  // own the scene depth that depth of field reads next, so auto-clear is switched off to keep it (the quad covers
  // every pixel anyway).
  const c=this.compositeMaterial.uniforms;c.tDiffuse.value=readBuffer.texture;c.texel.value.set(1/width,1/height);
  const autoClear=renderer.autoClear;renderer.autoClear=false;
  renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.composite.render(renderer);
  renderer.autoClear=autoClear;
 }
 override dispose(){this.target.dispose();this.occlusionMaterial.dispose();this.compositeMaterial.dispose();this.occlusion.dispose();this.composite.dispose();}
}
