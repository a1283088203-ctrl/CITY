import * as T from 'three';

/** Distant ridge silhouettes on an open cylinder around the city.
 * The texture holds layer masks (R far, G mid, B near); colors follow the live fog so the ring stays in the haze.
 */
export class MountainRing{
 readonly mesh:T.Mesh;
 private readonly far=new T.Color();private readonly mid=new T.Color();private readonly near=new T.Color();private readonly tint=new T.Color();private readonly haze=new T.Color();
 constructor(scene:T.Scene,radius=118,base=-6,top=30){
  const texture=new T.TextureLoader().load(new URL('textures/mountains.png',document.baseURI).href);
  texture.wrapS=T.RepeatWrapping;texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;
  // Extends well below the horizon so the solid foothill band hides the void beneath the scenery tiles.
  const bottom=base-40,geometry=new T.CylinderGeometry(radius,radius,top-bottom,96,1,true).translate(0,(top+bottom)/2,0);
  const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
   uniforms:{map:{value:texture},far:{value:this.far},mid:{value:this.mid},near:{value:this.near},range:{value:new T.Vector2(base,top)},repeats:{value:3},haze:{value:this.haze},hazeHeight:{value:.5}},
   vertexShader:'varying vec2 vUv;varying float vY;void main(){vUv=uv;vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`uniform sampler2D map;uniform vec3 far,mid,near,haze;uniform vec2 range;uniform float repeats,hazeHeight;varying vec2 vUv;varying float vY;
    float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
    float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
    void main(){float v=(vY-range.x)/(range.y-range.x);
     vec4 m=v<0.?vec4(0.,0.,1.,1.):texture2D(map,vec2(vUv.x*repeats,v));
     if(m.a<.5)discard;
     vec3 c=m.b>.5?near:m.g>.5?mid:far;
     // Ground haze: the ridge feet dissolve into the fog color, dithered in the same pixel steps as the scene fog.
     float h=1.-smoothstep(-.05,hazeHeight,v);h=floor(h*8.+bayer4(gl_FragCoord.xy*.5))/8.;
     c=mix(c,haze,clamp(h,0.,1.));
     // Same alpha tag as the outer scenery so the boundary pass leaves the silhouettes untouched.
     gl_FragColor=vec4(c,.75);}`});
  this.mesh=new T.Mesh(geometry,material);this.mesh.name='mountain-ring';this.mesh.frustumCulled=false;this.mesh.renderOrder=-9000;
  scene.add(this.mesh);
 }
 /** Farther ridges sit closer to the haze; nearer ones are a little denser and cooler. */
 update(fog:T.Color,sky:T.Color){
  // The outer scenery fades to exactly the fog color, so the ridge feet do too.
  this.haze.copy(fog);
  const tint=this.tint.setHex(0x5f8a96).multiplyScalar((fog.r+fog.g+fog.b)/1.6);
  this.far.copy(fog).lerp(tint,.12).multiplyScalar(.97).lerp(sky,.2);
  this.mid.copy(fog).lerp(tint,.26).multiplyScalar(.9);
  this.near.copy(fog).lerp(tint,.4).multiplyScalar(.82);
 }
}
