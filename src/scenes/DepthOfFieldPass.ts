import * as T from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {CopyShader} from 'three/addons/shaders/CopyShader.js';

/** Miniature-photography depth of field that only falls off behind the subject: everything from the camera up to
 * just past the city stays sharp, and the blur grows with distance towards the scenery, ridges and sky.
 * Reads the scene depth captured by the boundary pass; one gather pass with a golden-angle disc.
 * Samples are weighted by their own blur, so sharp nearer pixels never smear over the soft background.
 */
export class DepthOfFieldPass extends ShaderPass{
 /** The composer ping-pongs targets, so only the scene render's own target holds valid depth; the boundary pass records it. */
 constructor(private camera:T.PerspectiveCamera,private target:T.Vector3,taps:number,private source:{depth:T.Texture|null}){
  super({uniforms:{tDiffuse:{value:null},tDepth:{value:null},texel:{value:new T.Vector2()},cameraRange:{value:new T.Vector2()},focus:{value:new T.Vector2(40,80)},radius:{value:5}},
   vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`
    #define TAPS ${taps}
    uniform sampler2D tDiffuse,tDepth;uniform vec2 texel,cameraRange,focus;uniform float radius;varying vec2 vUv;
    float blurAt(vec2 uv){float d=texture2D(tDepth,uv).x;if(d>.99999)return 1.;
     float z=cameraRange.x*cameraRange.y/(cameraRange.y-d*(cameraRange.y-cameraRange.x));
     float b=smoothstep(focus.x,focus.y,z);return b*b*(3.-2.*b);}
    void main(){
     vec4 source=texture2D(tDiffuse,vUv);float coc=blurAt(vUv);
     if(coc<.02){gl_FragColor=source;return;}
     vec3 sum=source.rgb;float weight=1.;float r=coc*radius;
     for(int i=0;i<TAPS;i++){
      float t=(float(i)+.5)/float(TAPS),a=float(i)*2.39996323;
      vec2 offset=vec2(cos(a),sin(a))*sqrt(t)*r;vec2 uv=vUv+offset*texel;
      float sampleBlur=blurAt(uv)*radius,len=length(offset);
      // A sample only contributes if its own blur disc reaches this pixel.
      float w=clamp(sampleBlur-len+1.,0.,1.);
      sum+=texture2D(tDiffuse,uv).rgb*w;weight+=w;
     }
     gl_FragColor=vec4(sum/weight,source.a);
    }`});
  this.material.depthTest=false;this.material.depthWrite=false;
 }
 override render(renderer:T.WebGLRenderer,writeBuffer:T.WebGLRenderTarget,readBuffer:T.WebGLRenderTarget,deltaTime:number,maskActive:boolean){
  this.uniforms.tDepth.value=this.source.depth??readBuffer.depthTexture;
  this.uniforms.texel.value.set(1/readBuffer.width,1/readBuffer.height);
  this.uniforms.cameraRange.value.set(this.camera.near,this.camera.far);
  // Sharp up to a little past the focus target (the city centre); blur starts over the back half of the city and
  // reaches full strength in the near scenery behind it.
  const distance=this.camera.position.distanceTo(this.target);
  this.uniforms.focus.value.set(distance+3,distance+3+Math.max(26,distance*.75));
  // Max blur radius in render pixels, scaled with the buffer so it looks the same at every resolution.
  this.uniforms.radius.value=Math.max(2.5,readBuffer.height/540*6);
  // The write buffer owns the depth texture being sampled, so render into a private target first (no feedback
  // loop), then copy the result over.
  if(this.blurred.width!==readBuffer.width||this.blurred.height!==readBuffer.height)this.blurred.setSize(readBuffer.width,readBuffer.height);
  super.render(renderer,this.blurred,readBuffer,deltaTime,maskActive);
  this.copy.material.uniforms.tDiffuse.value=this.blurred.texture;
  renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.copy.quad.render(renderer);
 }
 private blurred=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType});
 private copy=(()=>{const material=new T.ShaderMaterial({uniforms:{tDiffuse:{value:null}},depthTest:false,depthWrite:false,
  vertexShader:CopyShader.vertexShader,fragmentShader:CopyShader.fragmentShader});
  material.uniforms.opacity={value:1};return {material,quad:new FullScreenQuad(material)};})();
 override dispose(){super.dispose();this.blurred.dispose();this.copy.material.dispose();this.copy.quad.dispose();}
}
