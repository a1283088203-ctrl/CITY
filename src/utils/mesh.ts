import * as T from 'three';
const geometry=new T.BoxGeometry(1,1,1);
const materials=new Map<number,T.MeshLambertMaterial>();
const glowing=new Map<string,{material:T.MeshLambertMaterial;intensity:number}>();
let nightAmount=0;
export function box(parent:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:number){
 let material=materials.get(color);if(!material){material=new T.MeshLambertMaterial({color});materials.set(color,material);}
 const mesh=new T.Mesh(geometry,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
/** Shared emissive materials, no per-window lights or textures. */
export function litBox(parent:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:number,emission:number,intensity=2){
 const mesh=box(parent,w,h,d,x,y,z,color),id=`${color}:${emission}:${intensity}`;
 let entry=glowing.get(id);if(!entry){const material=new T.MeshLambertMaterial({color,emissive:emission,emissiveIntensity:intensity*nightAmount});entry={material,intensity};glowing.set(id,entry);}
 mesh.material=entry.material;return mesh;
}
export function setNightLights(amount:number){nightAmount=amount;for(const entry of glowing.values())entry.material.emissiveIntensity=amount*entry.intensity;}
export function disposeTree(root:T.Object3D){root.traverse(o=>{if(o instanceof T.Mesh && o.userData.owned){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});root.removeFromParent();}
