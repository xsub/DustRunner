import * as THREE from 'three';

// Reuse the exact outer road triangles, including the reflected diagonal.
// A separately sampled ribbon can intersect a banked road and flicker.
export function createRaceKerbs(terrain,rows,length){
 const cols=terrain.positions.length/(rows+1)/3,positions=[],along=[],indices=[];
 const edgeColumns=[2,3,cols-4,cols-3];
 for(let row=0;row<=rows;row++)for(const col of edgeColumns){
  const p=(row*cols+col)*3;positions.push(terrain.positions[p],terrain.positions[p+1]+.012,terrain.positions[p+2]);along.push(row/rows);
 }
 for(let row=0;row<rows;row++)for(const col of [2,cols-4]){
  const first=(row*(cols-1)+col)*6;
  for(let k=0;k<6;k++){
   const original=terrain.indices[first+k],sourceRow=Math.floor(original/cols),sourceCol=original%cols;
   indices.push(sourceRow*4+(sourceCol<=3?sourceCol-2:sourceCol-(cols-4)+2));
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('kerbAlong',new THREE.Float32BufferAttribute(along,1));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 // An integer number of red/white pairs closes without a seam at the grid.
 const pairs=Math.max(1,Math.round(length/6));
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.uniforms.kerbRed={value:new THREE.Color('#cb2925')};shader.uniforms.kerbWhite={value:new THREE.Color('#f2eee1')};shader.uniforms.kerbPairs={value:pairs};
  shader.vertexShader='attribute float kerbAlong; varying float vKerbAlong;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvKerbAlong=kerbAlong;');
  shader.fragmentShader='varying float vKerbAlong; uniform float kerbPairs; uniform vec3 kerbRed; uniform vec3 kerbWhite;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(kerbRed,kerbWhite,step(.5,fract(vKerbAlong*kerbPairs)));');
 };
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Red and white race edge strips';mesh.receiveShadow=true;
 return mesh;
}
