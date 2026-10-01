import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
export class CameraController{
 camera=new T.PerspectiveCamera(42,1,.1,220);controls:OrbitControls;private shake=0;
 constructor(canvas:HTMLCanvasElement){this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.enablePan=false;this.controls.minDistance=16;this.controls.maxDistance=85;this.controls.minPolarAngle=.3;this.controls.maxPolarAngle=1.33;this.controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.ROTATE,RIGHT:T.MOUSE.PAN};this.controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};this.reset();}
 reset(){this.camera.position.set(32,31,36);this.controls.target.set(0,2,0);this.controls.update();}
 expand(){this.camera.position.multiplyScalar(1.25);this.controls.target.y=7;}
 pulse(){this.shake=.18;}
 update(dt:number){this.controls.update();if(this.shake>0){this.shake-=dt;this.camera.position.y+=Math.sin(this.shake*90)*.018;}}
 resize(w:number,h:number){this.camera.aspect=w/h;this.camera.fov=matchMedia('(pointer: coarse)').matches&&w<h?60:42;this.camera.updateProjectionMatrix();}
}
