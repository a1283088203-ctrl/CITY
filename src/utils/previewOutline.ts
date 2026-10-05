import * as T from 'three';

// Shared line resources: rebuilding or rotating a preview allocates no GPU geometry.
const cube=new T.BoxGeometry(1,1,1);
const edges=new T.EdgesGeometry(cube);cube.dispose();
const material=new T.LineBasicMaterial({color:0xffedcc,transparent:true,opacity:.86,depthWrite:false,toneMapped:false});

export function addPreviewOutline(root:T.Group,width:number,depth:number){
 const outline=new T.Group();outline.name='placement-outline';
 // Trace the main mass and roof tiers, without outlining every window or ornament.
 for(const part of root.children){
  if(!(part instanceof T.Mesh)||part.scale.x<width*.35||part.scale.z<depth*.8)continue;
  const line=new T.LineSegments(edges,material);
  line.position.copy(part.position);line.quaternion.copy(part.quaternion);line.scale.copy(part.scale).addScalar(.008);
  line.renderOrder=2;outline.add(line);
 }
 root.add(outline);
}
