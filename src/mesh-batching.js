import {t as msg} from './i18n.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Bake rigid parts in root-local coordinates. Animated pivots remain separate.
// Transparent panes keep their individual sorting and are never merged.
export function batchRigidMeshes(root,{shared=false}={}){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),transform=new THREE.Matrix4(),groups=new Map(),sources=[];
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isInstancedMesh||Array.isArray(mesh.material)||mesh.material.transparent||mesh.userData.sharedWheel)return;
  const key=`${mesh.material.uuid}/${mesh.castShadow}/${mesh.receiveShadow}`;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 });
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;
  const geometries=meshes.map(mesh=>{
   const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
   // Window frames and primitives need the same attribute layout to batch.
   for(const name of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(name))geometry.deleteAttribute(name);
   if(!geometry.attributes.normal)geometry.computeVertexNormals();
   if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
   transform.multiplyMatrices(inverse,mesh.matrixWorld);geometry.applyMatrix4(transform);return geometry;
  });
  const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
  if(!geometry)throw new Error(msg("mesh_batching.rigid_mesh_batching_failed"));
  geometry.computeBoundingSphere();const first=meshes[0],batch=new THREE.Mesh(geometry,first.material);
  batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.userData.sharedWheel=shared;
  root.add(batch);sources.push(...meshes);
 }
 const oldGeometries=new Set();
 for(const mesh of sources){oldGeometries.add(mesh.geometry);mesh.removeFromParent();}
 // A geometry may also be used by an unbatched child (or another model).
 if(!shared){const retained=new Set();root.traverse(o=>{if(o.geometry)retained.add(o.geometry);});for(const g of oldGeometries)if(!retained.has(g))g.dispose();}
 return root;
}
