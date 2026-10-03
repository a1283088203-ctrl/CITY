import * as T from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

/** Subtle separation in linear scene light, before bloom and tone mapping.
 * Reuses the main scene's depth; no second geometry render or object outlines.
 */
export class BoundaryPass extends ShaderPass{
 private skyContribution=new T.Color();
 constructor(private camera:T.PerspectiveCamera){
  super({uniforms:{tDiffuse:{value:null},tDepth:{value:null},texel:{value:new T.Vector2()},cameraRange:{value:new T.Vector2()},fogRange:{value:new T.Vector2(70,160)},environment:{value:new T.Color()},illumination:{value:1}},
   vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`
    uniform sampler2D tDiffuse,tDepth;
    uniform vec2 texel,cameraRange,fogRange;
    uniform vec3 environment;uniform float illumination;varying vec2 vUv;
    float edgeLuma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
    bool isWindow(vec4 c){return abs(c.a-.25)<.015;}
    float depthAt(vec2 uv){float d=texture2D(tDepth,uv).x;return cameraRange.x*cameraRange.y/(cameraRange.y-d*(cameraRange.y-cameraRange.x));}
    void main(){
     vec4 source=texture2D(tDiffuse,vUv);float raw=texture2D(tDepth,vUv).x;
     if(raw>.99999){gl_FragColor=source;return;}
     if(isWindow(source)){gl_FragColor=vec4(source.rgb,1.);return;}
     float z=depthAt(vUv);vec2 dx=vec2(texel.x,0.),dy=vec2(0.,texel.y);
     vec4 leftColor=texture2D(tDiffuse,vUv-dx),rightColor=texture2D(tDiffuse,vUv+dx);
     vec4 bottomColor=texture2D(tDiffuse,vUv-dy),topColor=texture2D(tDiffuse,vUv+dy);
     float l=depthAt(vUv-dx),r=depthAt(vUv+dx),b=depthAt(vUv-dy),t=depthAt(vUv+dy);
     // Exclude both the glass and its wall-side border from edge detection.
     if(isWindow(leftColor)){leftColor=source;l=z;}
     if(isWindow(rightColor)){rightColor=source;r=z;}
     if(isWindow(bottomColor)){bottomColor=source;b=z;}
     if(isWindow(topColor)){topColor=source;t=z;}
     // Second differences reject smoothly sloping ground. Positive curvature
     // keeps silhouettes on the object side instead of drawing an outer halo.
     float curvature=max(max(l+r-2.*z,b+t-2.*z),0.);
     float geometryEdge=smoothstep(.025+z*.0015,.16+z*.009,curvature);
     vec3 cl=leftColor.rgb,cr=rightColor.rgb;
     vec3 cb=bottomColor.rgb,ct=topColor.rgb;
     float contrast=max(max(length(source.rgb-cl),length(source.rgb-cr)),max(length(source.rgb-cb),length(source.rgb-ct)));
     // Color-only transitions (cast shadows, lighting and surface colors) never create outlines.
     float similar=1.-smoothstep(.04,.3,contrast);
     // Already-lit surfaces and nearby emissive windows/lamps need less separation.
     float localLight=max(edgeLuma(source.rgb),max(max(edgeLuma(cl),edgeLuma(cr)),max(edgeLuma(cb),edgeLuma(ct))));
     float lit=1.-smoothstep(.16+illumination*.13,.65+illumination*.22,localLight)*.68;
     float distanceFade=1.-smoothstep(40.,125.,z);
     float fogFade=1.-smoothstep(fogRange.x,fogRange.y,z);
     float strength=geometryEdge*(.65+.35*similar)*lit*distanceFade*fogFade*.54;
     float building=1.-smoothstep(.01,.04,abs(source.a-.5));
     strength=min(.96,strength*(1.+1.8*building));
     float bright=illumination/(illumination+1.5);
     vec3 envHue=environment/max(edgeLuma(environment),.001);
     float objectLight=edgeLuma(source.rgb);
     vec3 darkEnvironment=envHue*min(objectLight*.48,.11);
     vec3 edgeColor=mix(source.rgb*(.48-.24*bright),darkEnvironment,.58-.28*bright);
     edgeColor*=1.-building*.35;
     gl_FragColor=vec4(mix(source.rgb,edgeColor,strength),1.);
    }`
  });
  this.material.depthTest=false;this.material.depthWrite=false;
 }
 override render(renderer:T.WebGLRenderer,writeBuffer:T.WebGLRenderTarget,readBuffer:T.WebGLRenderTarget,deltaTime:number,maskActive:boolean){
  this.uniforms.tDepth.value=readBuffer.depthTexture;
  this.uniforms.texel.value.set(1/readBuffer.width,1/readBuffer.height);
  this.uniforms.cameraRange.value.set(this.camera.near,this.camera.far);
  super.render(renderer,writeBuffer,readBuffer,deltaTime,maskActive);
 }
 update(ambient:T.HemisphereLight,sun:T.DirectionalLight,sky:T.Color,fog:T.Fog){
  this.uniforms.environment.value.copy(ambient.color).multiplyScalar(ambient.intensity).add(this.skyContribution.copy(sky).multiplyScalar(.8));
  this.uniforms.illumination.value=ambient.intensity+sun.intensity*.45;
  this.uniforms.fogRange.value.set(fog.near,fog.far);
 }
}







