import * as THREE from 'three';

// Windblown sand grains around the driver. One draw call: a fixed cloud of
// points wraps around the camera in the vertex shader, so grains streak past
// at speed without any per-frame CPU work.
export const DRIFT_BOX={x:56,y:9,z:56};
export function createSandDrift(scene,count=900){
 const positions=new Float32Array(count*3),seeds=new Float32Array(count);
 let state=20261113;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
 for(let i=0;i<count;i++){positions[i*3]=random()*DRIFT_BOX.x;positions[i*3+1]=random()*random()*DRIFT_BOX.y;positions[i*3+2]=random()*DRIFT_BOX.z;seeds[i]=random();}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 const uniforms={drift:{value:new THREE.Vector3()},box:{value:new THREE.Vector3(DRIFT_BOX.x,DRIFT_BOX.y,DRIFT_BOX.z)},pixels:{value:600},opacity:{value:.3},tint:{value:new THREE.Color('#e6cfa0')},floor:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
  vertexShader:`uniform vec3 drift; uniform vec3 box; uniform float pixels; uniform float floor; attribute float seed; varying float vAlpha;
  void main(){
   vec3 p=mod(position+drift-cameraPosition,box)-box*.5;
   // Keep the cloud hugging the ground the camera stands on.
   p.y=mod(position.y+drift.y,box.y)+floor-cameraPosition.y+.15;
   float distanceToEye=length(p);
   vAlpha=smoothstep(2.4,6.,distanceToEye)*(1.-smoothstep(18.,27.,distanceToEye))*(.45+.55*seed);
   vec4 mv=viewMatrix*vec4(cameraPosition+p,1.);
   gl_PointSize=clamp((.035+.05*seed)*pixels/max(.1,-mv.z),1.,5.);gl_Position=projectionMatrix*mv;
  }`,
  fragmentShader:`uniform float opacity; uniform vec3 tint; varying float vAlpha;
  void main(){float r=length(gl_PointCoord-vec2(.5));gl_FragColor=vec4(tint,opacity*vAlpha*(1.-smoothstep(.15,.5,r)));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.visible=false;points.renderOrder=5;scene.add(points);
 return {
  points,
  setTint(color,strength=1){uniforms.tint.value.set(color);uniforms.opacity.value=.3*strength;},
  // `wind` in m/s; the cloud also settles slowly. `pixels` = viewport height / (2·tan(fov/2)).
  update(dt,{wind={x:2.4,z:.9},gust=0,pixels=600,floor=0}={}){
   const d=uniforms.drift.value,strength=1+gust;
   d.x=(d.x+wind.x*strength*dt)%DRIFT_BOX.x;d.z=(d.z+wind.z*strength*dt)%DRIFT_BOX.z;d.y=(d.y+DRIFT_BOX.y-.12*dt)%DRIFT_BOX.y;
   uniforms.pixels.value=pixels;uniforms.floor.value=floor;
  },
 };
}
