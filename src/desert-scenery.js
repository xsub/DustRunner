import * as THREE from 'three';
import {indexedNearest} from './track-index.js';
import {triangleSampler} from './terrain.js';

// Low dunes share their triangles with the vehicle collision mesh. Keep the
// racing embankment clear; small infield islands still get the sand material.
export function buildRaceDesert(samples,bounds,clearance){
 const positions=[],uv=[],indices=[],anchors=[],step=4;
 const minX=Math.floor((bounds.min.x-80)/step)*step,minZ=Math.floor((bounds.min.z-80)/step)*step;
 const nx=Math.ceil((bounds.max.x+80-minX)/step)+1,nz=Math.ceil((bounds.max.z+80-minZ)/step)+1;
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
  const x=minX+i*step,z=minZ+j*step,distance=indexedNearest(samples,x,z).distance;
  const t=Math.max(0,Math.min(1,(distance-clearance-2)/18)),fade=t*t*(3-2*t);
  const u=x*.77+z*.64+5*Math.sin(z*.025),wave=.5+.5*Math.sin(u*.095+Math.sin(z*.04)*1.3);
  const y=-.25+fade*(.3+2.6*wave*wave+.55*(1+Math.sin(z*.067-x*.024)));
  positions.push(x,y,z);uv.push(x/8,z/8);
  if(fade>.6&&wave>.9&&(i+j)%4===0)anchors.push({x,y,z});
  if(i<nx-1&&j<nz-1){const a=j*nx+i;indices.push(a,a+nx,a+1,a+1,a+nx,a+nx+1);}
 }
 const mesh={positions:new Float32Array(positions),uv:new Float32Array(uv),indices:new Uint32Array(indices),anchors};
 mesh.heightAt=triangleSampler(mesh.positions,mesh.indices);return mesh;
}
export function combineGround(a,b){
 const positions=new Float32Array(a.positions.length+b.positions.length);positions.set(a.positions);positions.set(b.positions,a.positions.length);
 const indices=new Uint32Array(a.indices.length+b.indices.length);indices.set(a.indices);for(let i=0;i<b.indices.length;i++)indices[a.indices.length+i]=b.indices[i]+a.positions.length/3;
 return {positions,indices,heightAt:(x,z)=>Math.max(a.heightAt(x,z),b.heightAt(x,z))};
}
export function createSandMaterial(){
 const material=new THREE.MeshStandardMaterial({color:'#96713e',roughness:1,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vSandWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSandWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader='varying vec3 vSandWorld;\nfloat sandHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=vSandWorld.xz;
   float grain=sandHash(floor(p*38.0));
   float ripple=sin(p.x*10.0+p.y*4.2+sin(p.y*.33)*3.0+sin(p.x*.11+p.y*.09)*5.0);
   float broad=sin(p.x*.037+sin(p.y*.041))*sin(p.y*.061);
   float aa=1.0-smoothstep(.5,2.0,fwidth(p.x*10.0+p.y*4.2));
   diffuseColor.rgb*=.86+broad*.06+grain*.15+ripple*.04*aa;
  `);
 };
 return material;
}

// Two draw calls, no rigid bodies. Rare gusts wait for visible off-road anchors
// and for spare frame time, just like the existing decorative snake animation.
export function createDesertWind({world,heightAt,anchors,random}){
 const twigs=[],v=new THREE.Vector3();
 for(let ring=0;ring<9;ring++)for(let k=0;k<22;k++){
  for(const a of [k/22*Math.PI*2,(k+1)/22*Math.PI*2]){
   const r=.68*(.82+random()*.18);v.set(Math.cos(a)*r,Math.sin(a)*r,Math.sin(a*3+ring)*.13);v.applyAxisAngle(new THREE.Vector3(0,1,0),ring*2.4);twigs.push(v.x,v.y,v.z);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(twigs,3));
 const tumbleweed=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#685036'}));tumbleweed.visible=false;world.add(tumbleweed);
 const sandGeometry=new THREE.BufferGeometry(),positions=new Float32Array(48*3);sandGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 const sandMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:0}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=9.0;}',fragmentShader:'uniform float opacity; void main(){float r=length(gl_PointCoord-vec2(.5));gl_FragColor=vec4(.72,.57,.32,opacity*(1.0-smoothstep(.05,.5,r)));}'});
 const sand=new THREE.Points(sandGeometry,sandMaterial);sand.frustumCulled=false;sand.visible=false;world.add(sand);
 let time=0,last=0,next=18+random()*22,event=null;
 return {update(dt,isVisible,allow=true){
  if(dt<=0)return;time+=dt;
  if(!allow){sand.visible=false;tumbleweed.visible=false;return;}
  if(time-last<1/20)return;last=time;
  if(event&&time-event.start>event.duration){event=null;next=time+30+random()*45;}
  if(!event&&time>=next){
   const visible=anchors.filter(a=>isVisible(a.x,a.y+1,a.z));
   if(visible.length){const a=visible[Math.floor(random()*visible.length)];event={...a,start:time,duration:8,roll:random()<.3};}
   else next=time+3;
  }
  tumbleweed.visible=false;sand.visible=false;if(!event)return;
  const age=time-event.start;
  if(event.roll){
   const x=event.x+age*.7,z=event.z+age*.24,y=heightAt(x,z)+.7;
   tumbleweed.visible=isVisible(x,y,z);tumbleweed.position.set(x,y,z);tumbleweed.rotation.set(age*.38,age*.12,-age);
  }else{
   sand.visible=isVisible(event.x,event.y+1,event.z);sandMaterial.uniforms.opacity.value=Math.sin(age/event.duration*Math.PI)*.19;
   for(let i=0;i<48;i++){const phase=(age*.22+i*.618)%1,x=event.x+phase*6,z=event.z+Math.sin(i*13.7)*1.2+phase*1.5;
    positions[i*3]=x;positions[i*3+1]=heightAt(x,z)+.13+Math.sin(phase*Math.PI)*.5;positions[i*3+2]=z;}
   sandGeometry.attributes.position.needsUpdate=true;
  }
 }};
}
