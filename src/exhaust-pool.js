import * as THREE from 'three';
import {exhaustEmission} from './exhaust-layout.js';
export function createExhaustPool(scene,capacity=192){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=(x+.5-size/2)/(size/2),ny=(y+.5-size/2)/(size/2),r=Math.hypot(nx,ny),noise=.8+.12*Math.sin(x*.43+y*.17)+.08*Math.sin(y*.71-x*.28),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*Math.max(0,1-r)**1.8*noise);
 }
 const texture=new THREE.DataTexture(data,size,size);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
 const geometry=new THREE.PlaneGeometry(1,1),alpha=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('smokeAlpha',alpha);
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float smokeAlpha; varying float vSmokeAlpha;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSmokeAlpha=smokeAlpha;');
  shader.fragmentShader='varying float vSmokeAlpha;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vSmokeAlpha;');
 };
 const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 const particles=[],free=Array.from({length:capacity},()=>({})),matrix=new THREE.Object3D(),position=new THREE.Vector3(),direction=new THREE.Vector3(),color=new THREE.Color();let histories=new WeakMap();
 return {reset(){free.push(...particles);particles.length=0;mesh.count=0;histories=new WeakMap();},
  update(dt,cars,camera,emit=true){
   if(dt<=0)return;
   if(emit)for(const car of cars){
    let history=histories.get(car);if(!history){history={credit:0};histories.set(car,history);}
    const settings=exhaustEmission(car,history,dt),outlets=car.exhausts??[];
    history.credit=settings.rate?Math.min(5,history.credit+settings.rate*dt):0;
    const count=Math.floor(history.credit);history.credit-=count;
    for(const outlet of outlets){
     if(!count)break;outlet.getWorldPosition(position);direction.set(0,0,1).transformDirection(outlet.matrixWorld);
     for(let j=0;j<count&&free.length;j++){
      const p=free.pop(),life=.8+Math.random()*.5;
      Object.assign(p,{x:position.x,y:position.y,z:position.z,age:0,life,size:.16+settings.load*.14+Math.random()*.1,opacity:settings.opacity,
       vx:(car.vx??0)*.78+direction.x*(1.2+settings.load*2)+(Math.random()-.5)*.3,vy:direction.y+.2,vz:(car.vz??0)*.78+direction.z*(1.2+settings.load*2)+(Math.random()-.5)*.3,shade:.75-settings.load*.12});particles.push(p);
     }
    }
   }
   for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.life){free.push(p);particles[i]=particles.at(-1);particles.pop();continue;}p.x+=(p.vx+.2)*dt;p.z+=p.vz*dt;p.y+=(p.vy+p.age*.45)*dt;p.vx*=Math.exp(-dt*.7);p.vz*=Math.exp(-dt*.7);}
   matrix.quaternion.copy(camera.quaternion);
   particles.forEach((p,i)=>{matrix.position.set(p.x,p.y,p.z);matrix.scale.setScalar(p.size+p.age*.8);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);mesh.setColorAt(i,color.setRGB(p.shade,p.shade,p.shade*.96));const t=p.age/p.life;alpha.setX(i,p.opacity*Math.min(1,t*8)*(1-t)**1.5);});
   mesh.count=particles.length;if(mesh.count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;alpha.needsUpdate=true;}
  },getStats:()=>({particles:particles.length,capacity})};
}
