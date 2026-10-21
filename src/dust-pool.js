import * as THREE from 'three';
import {dustEmission} from './dust-emission.js';

export function createDustPool(scene,capacity=384){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=(x+.5-size/2)/(size/2),ny=(y+.5-size/2)/(size/2),r=Math.hypot(nx,ny),noise=.8+.12*Math.sin(x*.43+y*.17)+.08*Math.sin(y*.71-x*.28),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*Math.max(0,1-r)**1.25*noise);
 }
 const texture=new THREE.DataTexture(data,size,size);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
 const geometry=new THREE.PlaneGeometry(1,1),alpha=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('dustOpacity',alpha);
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,forceSinglePass:true,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float dustOpacity; varying float vDustOpacity;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDustOpacity=dustOpacity;');
  shader.fragmentShader='varying float vDustOpacity;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vDustOpacity;');
 };
 const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 mesh.name='Wheel contact dust';
 const particles=[],free=Array.from({length:capacity},()=>({})),matrix=new THREE.Object3D(),color=new THREE.Color(),contact={x:0,y:0,z:0};let histories=new WeakMap(),emitted=0;
 return {
  reset(){free.push(...particles);particles.length=0;mesh.count=0;histories=new WeakMap();emitted=0;},
  breakTrail(car){histories.delete(car);},
  sample(car,dt,heightAt,options={}){
   if(dt<=0)return;
   const controller=car.physics?.controller;if(!controller)return;
   let history=histories.get(car);if(!history){history={credits:[0,0,0,0]};histories.set(car,history);}
   const settings=dustEmission(car,history,dt,options);
   for(let i=0;i<4;i++){
    if(!settings.rate||!controller.wheelIsInContact(i)){history.credits[i]=0;continue;}
    const point=controller.wheelContactPoint(i,contact);
    // No sand clouds from tires resting on a rock or other elevated prop.
    if(!point||Math.abs(point.y-heightAt(point.x,point.z))>.25){history.credits[i]=0;continue;}
    history.credits[i]=Math.min(3,history.credits[i]+settings.rate*dt);
    const count=Math.floor(history.credits[i]);history.credits[i]-=count;
    for(let j=0;j<count&&free.length;j++){
     const p=free.pop(),life=settings.life*(.8+Math.random()*.4);
     Object.assign(p,{x:point.x+(Math.random()-.5)*.2,y:point.y+.16,z:point.z+(Math.random()-.5)*.2,
      age:0,life,size:1.5+Math.random()*.7,growth:settings.spread,opacity:settings.opacity,sand:settings.sand,
      vx:(car.vx??0)*.12+(Math.random()-.5)*settings.spread*2,
      vz:(car.vz??0)*.12+(Math.random()-.5)*settings.spread*2,vy:.28+Math.random()*.4});
     particles.push(p);emitted++;
    }
   }
  },
  update(dt,camera){
   if(dt<=0)return;
   const damping=Math.exp(-dt*1.2);
   for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.life){free.push(p);particles[i]=particles.at(-1);particles.pop();continue;}
    p.x+=(p.vx+.3)*dt;p.z+=(p.vz+.1)*dt;p.y+=p.vy*dt;p.vx*=damping;p.vz*=damping;p.vy*=Math.exp(-dt*.4);
   }
   matrix.quaternion.copy(camera.quaternion);
   particles.forEach((p,i)=>{matrix.position.set(p.x,p.y,p.z);matrix.scale.setScalar(p.size+p.age*p.growth);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);
    mesh.setColorAt(i,color.setHex(p.sand?0xb69b70:0xe0c39a));const t=p.age/p.life;alpha.setX(i,p.opacity*Math.min(1,t*12)*(1-t)**1.3);
   });
   mesh.count=particles.length;if(mesh.count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;alpha.needsUpdate=true;}
  },
  getStats:()=>({particles:particles.length,capacity,emitted})
 };
}
