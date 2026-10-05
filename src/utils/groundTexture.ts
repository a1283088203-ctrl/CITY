import * as T from 'three';

// Local art trial: switch off to restore the original solid-color terrain.
export const GROUND_TEXTURE_TRIAL=true;
type Kind='grass'|'dirt';
const materials=new Map<string,T.MeshLambertMaterial>();
let atlas:T.Texture|undefined;
export function groundTexture(mesh:T.Mesh,kind:Kind){
 if(!GROUND_TEXTURE_TRIAL||typeof document==='undefined')return mesh;
 if(!atlas){atlas=new T.TextureLoader().load(new URL('textures/ground-trial-v1.png',document.baseURI).href);atlas.colorSpace=T.SRGBColorSpace;atlas.magFilter=T.NearestFilter;atlas.minFilter=T.NearestMipmapNearestFilter;}
 const source=mesh.material as T.MeshLambertMaterial,key=`${source.uuid}:${kind}`;
 let material=materials.get(key);
 if(!material){material=source.clone();material.userData.groundKind=kind;configureGroundTexture(material);materials.set(key,material);}
 mesh.material=material;return mesh;
}
/** Reapply the hook to clones before attaching the surrounding terrain's fog hook. */
export function configureGroundTexture(material:T.MeshLambertMaterial){
 const kind=material.userData.groundKind as Kind|undefined;if(!kind||!atlas)return;
 material.onBeforeCompile=shader=>{
  shader.uniforms.groundAtlas={value:atlas};
  shader.vertexShader='varying vec3 groundPosition;varying float groundTop;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundPosition=(modelMatrix*vec4(position,1.)).xyz;groundTop=step(.5,normal.y);');
  shader.fragmentShader=`uniform sampler2D groundAtlas;varying vec3 groundPosition;varying float groundTop;
   vec3 groundHash(vec2 p){vec3 h=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));h+=dot(h,h.yxz+33.33);return fract((h.xxy+h.yzz)*h.zyx);}
  `+shader.fragmentShader;
  // Stable per-cell crops and orientations remove the repeating narrow grass strip.
  // Keep one texture lookup and quantized pixels for mobile performance and voxel detail.
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 pixelPosition=(floor(groundPosition.xz*64.)+.5)/64.;
   vec2 cell=floor(pixelPosition/.75);
   vec3 variation=groundHash(cell);
   vec2 localUV=fract(pixelPosition/.75);
   if(variation.x>.5)localUV=localUV.yx;
   if(variation.y>.5)localUV.x=1.-localUV.x;
   if(variation.z>.5)localUV.y=1.-localUV.y;
   float cropScale=mix(.65,1.,variation.z);
   vec2 groundUV=vec2(variation.x*.88,${kind==='grass'?'.015':'.29+variation.y*.24'})+localUV*vec2(.08,.12)*cropScale;
   vec3 groundSample=texture2D(groundAtlas,groundUV).rgb;
   float detail=clamp(dot(groundSample,vec3(.2126,.7152,.0722))/${kind==='grass'?'.40':'.46'},.86,1.11);
   detail=mix(1.,detail,mix(.5,.85,variation.y));
   diffuseColor.rgb*=mix(1.,detail,groundTop*.8);`);
 };
 material.customProgramCacheKey=()=>`ground-trial-v5-${kind}`;
}
