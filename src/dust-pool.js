import * as THREE from 'three';

export function createDustPool(scene,capacity=132){
 const geometry=new THREE.IcosahedronGeometry(1,0),opacity=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage);
 geometry.setAttribute('dustOpacity',opacity);
 const material=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float dustOpacity; varying float vDustOpacity;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDustOpacity=dustOpacity;');
  shader.fragmentShader='varying float vDustOpacity;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vDustOpacity;');
 };
 const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 const particles=[],free=[],matrix=new THREE.Object3D(),color=new THREE.Color();
 for(let i=0;i<capacity;i++)free.push({});
 return {
  reset(){free.push(...particles);particles.length=0;mesh.count=0;},
  spawn(car,y){
   if(!free.length||Math.random()>.48)return;const p=free.pop();
   Object.assign(p,{x:car.x+Math.sin(car.heading)*2,y:y+.3,z:car.z+Math.cos(car.heading)*2,size:.2+Math.random()*.3,life:.6+Math.random()*.5,vx:(Math.random()-.5)*3,vz:(Math.random()-.5)*3,color:car.boosting?0xead38f:0xc5a477});particles.push(p);
  },
  update(dt){
   for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){free.push(p);particles[i]=particles.at(-1);particles.pop();continue;}p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=dt*.6;p.size*=1+dt*.7;}
   particles.forEach((p,i)=>{matrix.position.set(p.x,p.y,p.z);matrix.scale.setScalar(p.size);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);mesh.setColorAt(i,color.setHex(p.color));opacity.setX(i,Math.min(.45,p.life*.35));});
   mesh.count=particles.length;if(mesh.count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;opacity.needsUpdate=true;}
  }
 };
}
