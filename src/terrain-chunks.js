import * as THREE from 'three';

// Keep the exact contact triangles/normals, but let both camera and shadow
// frusta reject distant terrain instead of drawing the entire circuit twice.
export function chunkTerrain(geometry,material,cell=64,castShadow=true){
 const group=new THREE.Group(),buckets=new Map(),position=geometry.attributes.position,index=geometry.index;
 for(let i=0;i<index.count;i+=3){
  const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
  const key=`${Math.floor((position.getX(a)+position.getX(b)+position.getX(c))/(3*cell))},${Math.floor((position.getZ(a)+position.getZ(b)+position.getZ(c))/(3*cell))}`;
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(a,b,c);
 }
 for(const indices of buckets.values()){
  const remap=new Map(),vertices=[],local=[];
  for(const original of indices){if(!remap.has(original)){remap.set(original,vertices.length);vertices.push(original);}local.push(remap.get(original));}
  const chunk=new THREE.BufferGeometry();
  for(const [name,attribute] of Object.entries(geometry.attributes)){
   const array=new attribute.array.constructor(vertices.length*attribute.itemSize);
   vertices.forEach((original,i)=>{for(let k=0;k<attribute.itemSize;k++)array[i*attribute.itemSize+k]=attribute.array[original*attribute.itemSize+k];});
   chunk.setAttribute(name,new THREE.BufferAttribute(array,attribute.itemSize,attribute.normalized));
  }
  chunk.setIndex(local);chunk.computeBoundingSphere();chunk.computeBoundingBox();
  const mesh=new THREE.Mesh(chunk,material);mesh.castShadow=castShadow;mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;group.add(mesh);
 }
 geometry.dispose();return group;
}
