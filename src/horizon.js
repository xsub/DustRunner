import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {sunDirection} from './time-of-day.js';

// Everything the driver sees beyond the playable terrain: a shader sky with
// sun, clouds and stars, kilometers of rolling far desert, and sandstone buttes.
// None of it has collision; the board view never shows it.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),u=smooth(x-ix),v=smooth(z-iz);return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;}
const fbm=(x,z)=>noise(x,z)*.55+noise(x*2.1+7,z*2.1-3)*.3+noise(x*4.3-11,z*4.3+5)*.15;

// Height of the non-drivable land `outside` meters beyond the playable edge.
export function farLandHeight(x,z,outside,edgeHeight=0){
 const dunes=4+16*noise(x/210+3,z/210)+7*noise(x/83-9,z/83+4);
 const far=smooth((outside-700)/2100),ranges=fbm(x/1500+2,z/1500-6);
 const plateau=(smooth((ranges-.5)/.07)*230+smooth((ranges-.62)/.05)*170+Math.max(0,ranges-.45)*520)*far;
 const blend=smooth(outside/160);
 return edgeHeight*(1-blend)+(dunes+plateau)*blend;
}

// Non-uniform grid: 60 m cells beside the playground, kilometers wide at the rim.
export function farGridAxis(min,max,reach=9000,cell=60){
 const inner=[],count=Math.max(1,Math.round((max-min)/cell));
 for(let i=0;i<=count;i++)inner.push(min+(max-min)*i/count);
 // A tight skirt just inside the edge keeps the hidden floor under the real terrain.
 inner.splice(1,0,min+3);inner.splice(inner.length-1,0,max-3);
 const outward=[];let step=cell,d=0;
 while(d<reach){d+=step;outward.push(d);step*=1.2;}
 return [...outward.map(v=>min-v).reverse(),...inner,...outward.map(v=>max+v)];
}

export function buildFarLand(bounds,heightAt){
 const xs=farGridAxis(bounds.min.x,bounds.max.x),zs=farGridAxis(bounds.min.z,bounds.max.z);
 const positions=[],colors=[],indices=[],sand=new THREE.Color('#8f6b3b'),pale=new THREE.Color('#a8824e'),rock=new THREE.Color('#8d5236'),color=new THREE.Color();
 const inside=(x,z)=>x>bounds.min.x+1&&x<bounds.max.x-1&&z>bounds.min.z+1&&z<bounds.max.z-1;
 const heights=new Float32Array(xs.length*zs.length);
 zs.forEach((z,j)=>xs.forEach((x,i)=>{
  const cx=Math.max(bounds.min.x,Math.min(bounds.max.x,x)),cz=Math.max(bounds.min.z,Math.min(bounds.max.z,z)),outside=Math.hypot(x-cx,z-cz);
  let y;
  if(inside(x,z))y=-8;
  else{
   // Tie the seam to the real terrain just inside the edge.
   const ex=Math.max(bounds.min.x+1.5,Math.min(bounds.max.x-1.5,x)),ez=Math.max(bounds.min.z+1.5,Math.min(bounds.max.z-1.5,z));
   y=farLandHeight(x,z,outside,heightAt(ex,ez)-.35);
  }
  heights[j*xs.length+i]=y;positions.push(x,y,z);
  color.copy(sand).lerp(pale,noise(x/400,z/400)).lerp(rock,smooth((y-45)/120)*.85);colors.push(color.r,color.g,color.b);
  if(i<xs.length-1&&j<zs.length-1){const a=j*xs.length+i;indices.push(a,a+xs.length,a+1,a+1,a+xs.length,a+xs.length+1);}
 }));
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const sample=(x,z)=>{
  const i=Math.max(0,Math.min(xs.length-2,xs.findIndex(v=>v>x)-1)),j=Math.max(0,Math.min(zs.length-2,zs.findIndex(v=>v>z)-1));
  const u=(x-xs[i])/(xs[i+1]-xs[i]),v=(z-zs[j])/(zs[j+1]-zs[j]),h=(a,b)=>heights[b*xs.length+a];
  return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v;
 };
 return {geometry,heightAt:sample};
}

function butteGeometry(){
 const parts=[],paint=(geometry,low,high)=>{
  const g=geometry.toNonIndexed(),p=g.attributes.position,colors=new Float32Array(p.count*3),a=new THREE.Color(low),b=new THREE.Color(high),c=new THREE.Color();
  g.computeBoundingBox();const {min,max}=g.boundingBox;
  for(let i=0;i<p.count;i++){
   // Weathered, irregular walls instead of perfect prisms.
   const angle=Math.atan2(p.getZ(i),p.getX(i)),wobble=1+.16*Math.sin(angle*3+p.getY(i)*5)+.09*Math.sin(angle*7+1.3);
   p.setX(i,p.getX(i)*wobble);p.setZ(i,p.getZ(i)*wobble);
   const band=.92+.08*Math.sin(p.getY(i)*46);c.copy(a).lerp(b,(p.getY(i)-min.y)/Math.max(1e-6,max.y-min.y)).multiplyScalar(band);colors.set([c.r,c.g,c.b],i*3);
  }
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.deleteAttribute('uv');g.computeVertexNormals();parts.push(g);
 };
 const piece=(top,bottom,height,y,segments=11)=>new THREE.CylinderGeometry(top,bottom,height,segments,3).translate(0,y+height/2,0);
 paint(piece(.6,1.05,.36,0),'#9a7044','#93583a');
 paint(piece(.5,.58,.52,.36),'#8c4c32','#a45c3a');
 paint(piece(.43,.5,.12,.88),'#7d412c','#8a4a30');
 // A detached spire beside the main mesa.
 paint(piece(.07,.12,.74,0,7).translate(.95,0,.25),'#8c4c32','#a45c3a');
 const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());merged.computeBoundingSphere();return merged;
}

const skyVertex=`varying vec3 vDirection;
void main(){vDirection=position;vec4 p=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0);gl_Position=p.xyww;}`;
const skyFragment=`uniform vec3 zenith; uniform vec3 horizon; uniform vec3 haze; uniform vec3 sunColor; uniform vec3 sunDir;
uniform float time; uniform float clouds; uniform float stars;
varying vec3 vDirection;
float skyHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float skyNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(skyHash(i),skyHash(i+vec2(1.,0.)),f.x),mix(skyHash(i+vec2(0.,1.)),skyHash(i+vec2(1.,1.)),f.x),f.y);}
float skyFbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*skyNoise(p);p=p*2.03+vec2(17.,9.);a*=.5;}return v;}
void main(){
 vec3 d=normalize(vDirection);float h=d.y;
 vec3 color=mix(horizon,zenith,pow(clamp(h,0.,1.),.45));
 float toSun=max(dot(d,sunDir),0.);
 color+=sunColor*(pow(toSun,6.)*.16+pow(toSun,60.)*.42);
 float cover=0.;
 if(h>.005){
  vec2 uv=d.xz/(h+.16)*1.25+vec2(time*.0035,time*.0012);
  float body=skyFbm(uv),wisps=skyFbm(uv*3.1+4.);
  cover=smoothstep(.72-clouds*.3,1.02-clouds*.25,body+wisps*.16)*smoothstep(.01,.2,h);
  float shade=smoothstep(.45,.95,body);
  vec3 lit=mix(horizon,vec3(1.),.5)*(1.-shade*.28)+sunColor*(.12+pow(toSun,3.)*.55);
  color=mix(color,lit,cover*.86);
 }
 if(stars>0.){
  vec2 cell=d.xz/(abs(h)+.35)*120.;
  float twinkle=.75+.25*sin(time*2.+skyHash(floor(cell))*40.);
  float star=step(.9972,skyHash(floor(cell)))*smoothstep(.45,.0,length(fract(cell)-.5))*smoothstep(.03,.3,h);
  color+=vec3(.9,.95,1.)*star*stars*twinkle*(1.-cover)*1.6;
 }
 color=mix(color,sunColor*1.7+.25,smoothstep(.99935,.9997,toSun)*(1.-cover*.7));
 color=mix(haze,color,smoothstep(-.012,.085,h));
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function createHorizon(scene){
 const group=new THREE.Group();group.name='horizon';group.visible=false;scene.add(group);
 const uniforms={zenith:{value:new THREE.Color()},horizon:{value:new THREE.Color()},haze:{value:new THREE.Color()},sunColor:{value:new THREE.Color()},sunDir:{value:new THREE.Vector3(0,1,0)},time:{value:0},clouds:{value:.4},stars:{value:0}};
 const dome=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),new THREE.ShaderMaterial({uniforms,vertexShader:skyVertex,fragmentShader:skyFragment,side:THREE.BackSide,depthWrite:false,fog:false}));
 dome.frustumCulled=false;dome.renderOrder=-100;dome.matrixAutoUpdate=false;group.add(dome);
 const landMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0});
 const butteMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true});
 const butteShape=butteGeometry(),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
 let land=null,buttes=null;
 return {
  group,
  setWorld(bounds,heightAt,seed=1){
   if(land){group.remove(land);land.geometry.dispose();}
   if(buttes){group.remove(buttes);buttes.dispose();}
   const far=buildFarLand(bounds,heightAt);
   land=new THREE.Mesh(far.geometry,landMaterial);land.matrixAutoUpdate=false;land.frustumCulled=false;group.add(land);
   let state=(seed*2654435761)>>>0;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
   const centerX=(bounds.min.x+bounds.max.x)/2,centerZ=(bounds.min.z+bounds.max.z)/2,halfX=(bounds.max.x-bounds.min.x)/2,halfZ=(bounds.max.z-bounds.min.z)/2;
   const count=22;buttes=new THREE.InstancedMesh(butteShape,butteMaterial,count);buttes.frustumCulled=false;
   for(let i=0;i<count;i++){
    // Evenly spread around the compass, 0.6–3.4 km beyond the edge.
    const angle=(i+random()*.8)/count*Math.PI*2,outside=600+random()*random()*2800;
    const reach=Math.min((halfX+outside)/Math.max(1e-3,Math.abs(Math.sin(angle))),(halfZ+outside)/Math.max(1e-3,Math.abs(Math.cos(angle))));
    const x=centerX+Math.sin(angle)*reach,z=centerZ+Math.cos(angle)*reach,width=(130+random()*250)*(.6+outside/2600),height=110+random()*230+outside*.035;
    matrix.compose(new THREE.Vector3(x,far.heightAt(x,z)-6,z),rotation.setFromAxisAngle(up,random()*Math.PI*2),new THREE.Vector3(width*(.75+random()*.6),height,width));
    buttes.setMatrixAt(i,matrix);
   }
   buttes.instanceMatrix.needsUpdate=true;group.add(buttes);
  },
  setTime(preset){
   const d=sunDirection(preset);
   uniforms.zenith.value.set(preset.zenith);uniforms.horizon.value.set(preset.horizon);uniforms.haze.value.set(preset.haze);uniforms.sunColor.value.set(preset.sun);
   uniforms.sunDir.value.set(d.x,d.y,d.z);uniforms.clouds.value=preset.clouds;uniforms.stars.value=preset.stars;
  },
  update(dt){uniforms.time.value+=dt;},
 };
}
