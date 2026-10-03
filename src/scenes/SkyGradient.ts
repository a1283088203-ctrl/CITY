import * as T from 'three';
export const defaultSky=()=>({sky:'#b8dcf7',background:'#75b6db',transition:.55});
export type SkyPalette=ReturnType<typeof defaultSky>;
export class SkyGradient{
 readonly material:T.ShaderMaterial;
 readonly mesh:T.Mesh;
 palette=defaultSky();private night=0;readonly fogColor=new T.Color();
 constructor(scene:T.Scene){
  this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{upper:{value:new T.Color()},lower:{value:new T.Color()},transition:{value:.55}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:'uniform vec3 upper,lower;uniform float transition;varying vec2 vUv;void main(){float t=smoothstep(transition-.45,transition+.45,vUv.y);gl_FragColor=vec4(mix(lower,upper,t),1.);}'});
  this.mesh=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.mesh.name='sky-gradient';this.mesh.frustumCulled=false;this.mesh.renderOrder=-10000;this.mesh.layers.enable(1);scene.add(this.mesh);this.update(0);
 }
 set(p:SkyPalette){this.palette={...p};this.update(this.night);}
 update(night:number){this.night=night;const brightness=1-night*.88;this.material.uniforms.upper.value.set(this.palette.sky).multiplyScalar(brightness);this.material.uniforms.lower.value.set(this.palette.background).multiplyScalar(brightness);this.material.uniforms.transition.value=this.palette.transition;this.fogColor.copy(this.material.uniforms.upper.value).lerp(this.material.uniforms.lower.value,.35);}
}
