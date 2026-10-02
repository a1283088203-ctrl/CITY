import assert from 'node:assert/strict';
import * as T from 'three';
import {buildingModel} from '../src/entities/Building';
import {BUILDINGS} from '../src/data/buildings';
import {batchStatic,disposeBatches} from '../src/utils/batch';
for(const data of BUILDINGS)for(let variant=0;variant<3;variant++){
 const model=buildingModel(data,false,0,variant),before=new T.Box3().setFromObject(model);
 let vertices=0;const materials=new Set<T.Material>();model.traverse(o=>{if(o instanceof T.Mesh){vertices+=o.geometry.getAttribute('position').count;materials.add(o.material as T.Material);}});
 batchStatic(model);batchStatic(model.getObjectByName('residential-decoration') as T.Group);
 const after=new T.Box3().setFromObject(model);assert.ok(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5,'visual bounds retained');
 let batchedVertices=0,owned=0,disposed=0;model.traverse(o=>{if(o instanceof T.Mesh){batchedVertices+=o.geometry.getAttribute('position').count;assert.ok(materials.has(o.material as T.Material),'animated material identity retained');if(o.userData.batchedGeometry){owned++;o.geometry.addEventListener('dispose',()=>disposed++);}}});
 assert.equal(batchedVertices,vertices);disposeBatches(model);assert.equal(disposed,owned);
}
console.log('PASS: all 24 residential variants preserve visual bounds, geometry and shared animated materials; generated buffers are disposed.');
