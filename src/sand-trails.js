import * as THREE from 'three';

// A fixed ring of terrain-conforming ribbons: no decals, textures, physics
// bodies or per-frame scene objects. The oldest tracks are overwritten.
export function createSandTrails(scene,capacity=8192){
 const positions=new Float32Array(capacity*18),uvs=new Float32Array(capacity*12),strengths=new Float32Array(capacity*6);
 const geometry=new THREE.BufferGeometry();
 const position=new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage),uv=new THREE.BufferAttribute(uvs,2).setUsage(THREE.DynamicDrawUsage),strength=new THREE.BufferAttribute(strengths,1).setUsage(THREE.DynamicDrawUsage);
 geometry.setAttribute('position',position);geometry.setAttribute('uv',uv);geometry.setAttribute('strength',strength);
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  vertexShader:`attribute float strength; varying vec2 vUv; varying float vStrength;
   void main(){vUv=uv;vStrength=strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec2 vUv; varying float vStrength;
   void main(){
    float edge=smoothstep(0.0,0.12,vUv.x)*smoothstep(0.0,0.12,1.0-vUv.x);
    float tread=1.0-smoothstep(0.25,0.47,abs(fract(vUv.y*5.5+abs(vUv.x-0.5)*1.7)-0.5));
    float groove=1.0-smoothstep(0.27,0.46,abs(vUv.x-0.5));
    float ridge=smoothstep(0.32,0.45,abs(vUv.x-0.5));
    vec3 color=mix(vec3(0.16,0.078,0.021),vec3(0.48,0.30,0.095),ridge);
    gl_FragColor=vec4(color,edge*(0.17+groove*0.14+tread*0.10)*vStrength);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Sand wheel ruts';mesh.frustumCulled=false;mesh.renderOrder=1;scene.add(mesh);
 const contact={x:0,y:0,z:0};let trails=new WeakMap(),cursor=0,count=0;
 geometry.setDrawRange(0,0);
 function emit(a,b,heightAt,intensity){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),nx=-dz/length*.27,nz=dx/length*.27;
  const corners=[[a.x+nx,a.z+nz,0,a.distance],[a.x-nx,a.z-nz,1,a.distance],[b.x+nx,b.z+nz,0,b.distance],[b.x-nx,b.z-nz,1,b.distance]];
  const slot=cursor;cursor=(cursor+1)%capacity;count=Math.min(capacity,count+1);
  for(const [j,k] of [0,1,2,2,1,3].entries()){
   const [x,z,u,v]=corners[k],p=slot*18+j*3,t=slot*12+j*2;
   positions[p]=x;positions[p+1]=heightAt(x,z)+.025;positions[p+2]=z;uvs[t]=u;uvs[t+1]=v;strengths[slot*6+j]=intensity;
  }
  position.addUpdateRange(slot*18,18);uv.addUpdateRange(slot*12,12);strength.addUpdateRange(slot*6,6);
 }
 return {
  mesh,
  get count(){return count;},
  breakTrail(car){trails.delete(car);},
  reset(){trails=new WeakMap();cursor=count=0;geometry.setDrawRange(0,0);},
  sample(car,heightAt){
   const controller=car.physics?.controller;if(!controller)return;
   let wheels=trails.get(car);if(!wheels){wheels=Array(4).fill(null);trails.set(car,wheels);}
   const lateral=Math.abs((car.vx??0)*Math.cos(car.heading)-(car.vz??0)*Math.sin(car.heading));
   const intensity=Math.min(1.8,1+lateral*.1+(car.physics.controls?.brakePressure??0)*.45);
   let changed=false;
   for(let i=0;i<4;i++){
    if(!controller.wheelIsInContact(i)||car.rollover){wheels[i]=null;continue;}
    const p=controller.wheelContactPoint(i,contact);
    // Tires on rocks/props must not paint a suspended mark onto the sand below.
    if(!p||Math.abs(p.y-heightAt(p.x,p.z))>.22){wheels[i]=null;continue;}
    const previous=wheels[i];
    if(!previous){wheels[i]={x:p.x,z:p.z,distance:0};continue;}
    const distance=Math.hypot(p.x-previous.x,p.z-previous.z);
    if(distance<.35)continue;
    if(distance>2){wheels[i]={x:p.x,z:p.z,distance:0};continue;}
    const next={x:p.x,z:p.z,distance:previous.distance+distance};emit(previous,next,heightAt,intensity);wheels[i]=next;changed=true;
   }
   if(changed){position.needsUpdate=uv.needsUpdate=strength.needsUpdate=true;geometry.setDrawRange(0,count*6);}
  },
  dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}
 };
}
