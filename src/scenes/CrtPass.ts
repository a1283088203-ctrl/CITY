import * as T from 'three';

/** Scanlines + aperture grille + a soft vignette, applied on the final graded image. */
export const CRT_SHADER={
 uniforms:{tDiffuse:{value:null},resolution:{value:new T.Vector2(960,540)}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 resolution;varying vec2 vUv;
 void main(){
  vec3 color=texture2D(tDiffuse,vUv).rgb;
  // Whisper-subtle: faint scanlines and a light vignette, no RGB fringing.
  float scan=.95+.05*sin(vUv.y*resolution.y*3.14159265);
  vec2 d=vUv-.5;float vig=1.0-dot(d,d)*.28;
  gl_FragColor=vec4(color*scan*vig,1.0);
 }`
};
