import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {batchRigidMeshes} from './mesh-batching.js';

// All trucks share geometry. Detailed tread is merged into one draw call.
const profile=[[.30,-.205],[.39,-.24],[.49,-.225],[.55,-.17],[.565,-.09],[.565,.09],[.55,.17],[.49,.225],[.39,.24],[.30,.205],[.30,-.205]];
const tireGeometry=new THREE.LatheGeometry(profile.map(([r,x])=>new THREE.Vector2(r,x)),40).rotateZ(Math.PI/2);
const blocks=[];
for(let row=0;row<3;row++)for(let j=0;j<26;j++){
 const a=(j+(row===1?.5:0))*Math.PI*2/26;
 const block=new THREE.BoxGeometry(.13,.055,.105);
 block.rotateY(row===0?-.35:row===2?.35:0);
 block.translate((row-1)*.145,.568,0);block.rotateX(a);blocks.push(block);
}
const treadGeometry=mergeGeometries(blocks);blocks.forEach(g=>g.dispose());
const ringGeometry=new THREE.TorusGeometry(.3,.018,6,32).rotateY(Math.PI/2);
const sideRingGeometry=new THREE.TorusGeometry(.43,.008,4,36).rotateY(Math.PI/2);
const rimShape=new THREE.Shape();rimShape.absarc(0,0,.285,0,Math.PI*2,false);
const center=new THREE.Path();center.absarc(0,0,.085,0,Math.PI*2,true);rimShape.holes.push(center);
for(let i=0;i<8;i++){
 const a=i*Math.PI/4,hole=new THREE.Path();hole.absarc(Math.cos(a)*.207,Math.sin(a)*.207,.043,0,Math.PI*2,true);rimShape.holes.push(hole);
}
const faceGeometry=new THREE.ExtrudeGeometry(rimShape,{depth:.026,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:1,curveSegments:10}).rotateY(Math.PI/2);
const hubGeometry=new THREE.CylinderGeometry(.084,.10,.085,12).rotateZ(Math.PI/2);
const boltGeometry=new THREE.CylinderGeometry(.021,.021,.022,6).rotateZ(Math.PI/2);
const innerGeometry=new THREE.CylinderGeometry(.28,.28,.34,32).rotateZ(Math.PI/2);
const tireMaterial=new THREE.MeshStandardMaterial({color:'#242720',roughness:.98});
const treadMaterial=new THREE.MeshStandardMaterial({color:'#32352c',roughness:1});
const metalMaterial=new THREE.MeshStandardMaterial({color:'#c9c6af',metalness:.65,roughness:.44});
const innerMaterial=new THREE.MeshStandardMaterial({color:'#34352c',roughness:.85});
const hubMaterial=new THREE.MeshStandardMaterial({color:'#66685d',metalness:.6,roughness:.55});
const bronzeMaterial=new THREE.MeshStandardMaterial({color:'#90704a',metalness:.65,roughness:.42});
const wheelTemplates=new Map();
export function createOffroadWheel(finish='silver'){
 if(wheelTemplates.has(finish))return wheelTemplates.get(finish).clone(true);
 const rimMaterial=finish==='bronze'?bronzeMaterial:metalMaterial;
 const group=new THREE.Group();
 const add=(geometry,material,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 add(tireGeometry,tireMaterial);add(treadGeometry,treadMaterial);add(innerGeometry,innerMaterial);
 for(const side of [-1,1]){
  add(ringGeometry,rimMaterial,side*.213);
  add(sideRingGeometry,treadMaterial,side*.236);
  const face=add(faceGeometry,rimMaterial,side*.2);if(side<0)face.rotation.y=Math.PI;
  add(hubGeometry,hubMaterial,side*.205);
  for(let i=0;i<5;i++){
   const a=i*Math.PI*2/5;add(boltGeometry,metalMaterial,side*.235,Math.cos(a)*.13,Math.sin(a)*.13);
  }
 }
 batchRigidMeshes(group,{shared:true});group.traverse(o=>{if(o.isMesh)o.userData.sharedWheel=true;});
 wheelTemplates.set(finish,group);return group.clone(true);
}
