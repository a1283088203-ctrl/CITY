import * as T from 'three';
/** Elevation range (radians) of the scene's directional light over a day: ~15° at dawn/dusk to ~63° at noon. */
const LIGHT_LOW=.26,LIGHT_HIGH=1.1;
export const defaultSky=()=>({sky:'#b8dcf7',background:'#75b6db',transition:.55});
export type SkyPalette=ReturnType<typeof defaultSky>;
export class SkyGradient{
 readonly material:T.ShaderMaterial;
 readonly mesh:T.Mesh;
 /** 0..1 strength of the warm sunrise/sunset sky. */
 sunset=0;
 palette=defaultSky();private night=0;private hour=9;
 private readonly sunDir=new T.Vector3();private readonly moonDir=new T.Vector3();private readonly halo=new T.Color();private readonly sunDisc=new T.Color();private sunsetSky=new T.Color('#a87eaa');private sunsetHorizon=new T.Color('#d28b65');readonly fogColor=new T.Color();
 constructor(scene:T.Scene){
  // Screen-space gradient above the horizon; rays pointing below it (steep views past the scenery and the mountain rim) resolve to fog color.
  this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{upper:{value:new T.Color()},lower:{value:new T.Color()},fog:{value:this.fogColor},transition:{value:.55},
   sunDir:{value:this.sunDir},moonDir:{value:this.moonDir},sunGlow:{value:0},moonGlow:{value:0},halo:{value:this.halo},sunDisc:{value:this.sunDisc}},
   vertexShader:'varying vec2 vUv;varying vec3 vDir;void main(){vUv=uv;vec4 r=inverse(projectionMatrix)*vec4(position.xy,1.,1.);vDir=transpose(mat3(viewMatrix))*(r.xyz/r.w);gl_Position=vec4(position.xy,1.,1.);}',
   fragmentShader:`uniform vec3 upper,lower,fog,sunDir,moonDir,halo,sunDisc;uniform float transition,sunGlow,moonGlow;varying vec2 vUv;varying vec3 vDir;
    float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
    void main(){
     float t=smoothstep(transition-.45,transition+.45,vUv.y);t=floor(t*24.+bayer4(gl_FragCoord.xy))/24.;
     vec3 d=normalize(vDir),c=mix(lower,upper,t);
     // Sun: a pale core inside a warm disc, wrapped in three flat halo rings that step outwards (pixel-art style).
     // It sits on the farthest layer, so the mountain ring and clouds pass in front of it.
     float s=acos(clamp(dot(d,sunDir),-1.,1.));
     if(sunGlow>0.){
      float rings=(step(s,.125)*.12+step(s,.09)*.14+step(s,.06)*.18)*sunGlow;
      c=mix(c,halo,rings);
      c=mix(c,sunDisc,step(s,.036)*sunGlow);c=mix(c,vec3(1.,.99,.9),step(s,.024)*sunGlow);
     }
     // Moon: a smaller cool disc with a couple of darker maria and one faint ring.
     float m=acos(clamp(dot(d,moonDir),-1.,1.));
     if(moonGlow>0.){
      // Muted blue-grey so it sits in the night sky instead of glowing.
      c=mix(c,vec3(.36,.41,.52)*.6+c*.4,step(m,.07)*.22*moonGlow);
      vec3 side=normalize(cross(moonDir,vec3(0.,1.,0.))),up=cross(side,moonDir);vec2 q=vec2(dot(d,side),dot(d,up))/.028;
      float maria=step(length(q-vec2(-.3,.25)),.32)+step(length(q-vec2(.35,-.2)),.22);
      c=mix(c,mix(vec3(.5,.56,.66),vec3(.39,.44,.54),clamp(maria,0.,1.)),step(m,.028)*moonGlow);
     }
     float below=smoothstep(.06,-.08,d.y);below=floor(below*8.+bayer4(gl_FragCoord.xy*.5))/8.;
     gl_FragColor=vec4(mix(c,fog,clamp(below,0.,1.)),1.);}`});
  this.mesh=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.mesh.name='sky-gradient';this.mesh.frustumCulled=false;this.mesh.renderOrder=-10000;this.mesh.layers.enable(1);scene.add(this.mesh);this.update(0);
 }
 /** The sun and moon sit exactly where the scene's directional light comes from (it is the sun by day and the
  * moonlight at night), fixed in the world, so the disc always agrees with the shadows. They are drawn on the farthest
  * layer, so the mountain ring and clouds pass in front of them. */
 setLight(position:T.Vector3){
  // The azimuth is exactly the light's, so the disc lines up with the shadow direction. The light never drops below
  // ~15° (its height is clamped) and the camera is always tilted down, so at its true height the disc would sit above
  // the top of the frame; its elevation is mapped into the visible band just above the horizon instead: low at dawn
  // and dusk (half behind the ridges), a little higher around noon.
  const len=Math.max(1e-6,position.length()),elevation=Math.asin(T.MathUtils.clamp(position.y/len,-1,1));
  const shown=T.MathUtils.mapLinear(T.MathUtils.clamp(elevation,LIGHT_LOW,LIGHT_HIGH),LIGHT_LOW,LIGHT_HIGH,.035,.105);
  const azimuth=Math.atan2(position.x,position.z);
  this.sunDir.set(Math.sin(azimuth)*Math.cos(shown),Math.sin(shown),Math.cos(azimuth)*Math.cos(shown));this.moonDir.copy(this.sunDir);
 }
 set(p:SkyPalette){this.palette={...p};this.update(this.night,this.hour);}
 update(night:number,hour=9){this.night=night;this.hour=hour;// Sunrise uses the same warm sky as sunset, mirrored around its own peak.
  const glow=(start:number,peak:number,end:number)=>T.MathUtils.smoothstep(hour,start,peak)*(1-T.MathUtils.smoothstep(hour,peak,end));
  const sunset=Math.max(glow(16+40/60,17.8,18+50/60),glow(5,6+2/60,7+10/60));this.sunset=sunset;const brightness=1-night*.88;this.material.uniforms.upper.value.set(this.palette.sky).lerp(this.sunsetSky,sunset).multiplyScalar(brightness);this.material.uniforms.lower.value.set(this.palette.background).lerp(this.sunsetHorizon,sunset).multiplyScalar(brightness);this.material.uniforms.transition.value=this.palette.transition;this.fogColor.copy(this.material.uniforms.upper.value).lerp(this.material.uniforms.lower.value,.35);
  // Sun shows 06:00–18:00, moon 18:00–06:00 (directions come from the light, see setLight).
  const sunP=(hour-6)/12,moonP=(((hour-18)%24)+24)%24/12,u=this.material.uniforms;
  u.sunGlow.value=sunP>0&&sunP<1?1-night*.9:0;u.moonGlow.value=moonP>0&&moonP<1?Math.min(1,night*1.4):0;
  // Halo rings take a light, warm version of the sky; at sunrise and sunset they turn the soft pink of the reference.
  this.halo.copy(u.upper.value).lerp(new T.Color(1,1,.95),.45).lerp(new T.Color('#f7b3a4'),sunset*.8);
  this.sunDisc.set('#fdeab4').lerp(new T.Color('#ffe08a'),sunset);}
}




