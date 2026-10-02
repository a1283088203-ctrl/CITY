import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Batch static siblings sharing a material; animated/shared materials remain live. */
export function batchStatic(group:T.Group,skip:(mesh:T.Mesh)=>boolean=()=>false){
 const buckets=new Map<string,T.Mesh[]>();
 for(const child of group.children){
  if(!(child instanceof T.Mesh)||Array.isArray(child.material)||skip(child))continue;
  const key=`${child.material.uuid}:${child.castShadow}:${child.receiveShadow}`;
  const list=buckets.get(key)??[];list.push(child);buckets.set(key,list);
 }
 for(const list of buckets.values()){
  if(list.length<2)continue;
  const parts=list.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});
  const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geometry)continue;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,list[0].material);mesh.castShadow=list[0].castShadow;mesh.receiveShadow=list[0].receiveShadow;mesh.userData.batchedGeometry=true;
  for(const item of list){item.removeFromParent();if(item.userData.batchedGeometry)item.geometry.dispose();}
  group.add(mesh);
 }
}
export function disposeBatches(group:T.Object3D){group.traverse(o=>{if(o instanceof T.Mesh&&o.userData.batchedGeometry)o.geometry.dispose();});}
