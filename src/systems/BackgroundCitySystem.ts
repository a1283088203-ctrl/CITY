import * as T from 'three';
import {seeded} from '../utils/math';
export class BackgroundCitySystem{
 mesh:T.InstancedMesh;private stage=-1;private density=22;private heights=new Float32Array(160);private growth=0;
 constructor(scene:T.Scene){this.mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({color:0x94b0ad}),160);scene.add(this.mesh);}
 update(stage:number,dt=1/60){this.stage=stage;const blend=1-Math.exp(-dt*.18);this.growth+=(stage-this.growth)*blend;this.density+=([22,40,75,115,160][stage]-this.density)*blend;
 const random=seeded(45),dummy=new T.Object3D();for(let i=0;i<160;i++){const angle=random()*Math.PI*2,r=34+random()*70,h=1+random()*(2+this.growth*6);this.heights[i]+=(h-this.heights[i])*Math.min(1,dt*.5);dummy.position.set(Math.cos(angle)*r,this.heights[i]/2-2,Math.sin(angle)*r);dummy.scale.set(2+random()*3,this.heights[i],2+random()*3);dummy.updateMatrix();this.mesh.setMatrixAt(i,dummy.matrix);this.mesh.setColorAt(i,new T.Color().setHSL(.47+random()*.1,.12,.45+random()*.2));}this.mesh.count=Math.floor(this.density);this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;}
 reset(){this.stage=-1;this.growth=0;this.density=22;this.heights.fill(0);}
}
