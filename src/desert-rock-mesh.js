import {t as msg} from './i18n.js';
import * as THREE from 'three';
// Extract exactly the same triangles that Rapier contacts. No visual-only ramp.
export function createDesertRockMesh(ground){
 const positions=[],colors=[],uv=[],source=ground.positions,mask=ground.rockMask;
 for(let i=0;i<ground.indices.length;i+=3){
  const a=ground.indices[i],b=ground.indices[i+1],c=ground.indices[i+2];
  if(mask[a]<.09||mask[b]<.09||mask[c]<.09)continue;
  for(const id of [a,b,c]){
   const [x,y,z]=source.subarray(id*3,id*3+3),band=.78+.12*Math.sin(y*3.2)+.04*Math.sin(x*.8+z*.5);
   positions.push(x,y+.018,z);uv.push(x/8,z/8);colors.push(band,band*.94,band*.82);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
 let map;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#b5ac98';ctx.fillRect(0,0,512,512);
  let seed=719;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<180;i++){ctx.fillStyle=i%2?'#a39b8855':'#ccc1a944';ctx.beginPath();ctx.ellipse(random()*512,random()*512,8+random()*35,4+random()*18,random()*3,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<22000;i++){ctx.fillStyle=i%3?'#9f978655':'#cbc2ad66';ctx.fillRect(random()*512,random()*512,1,1);}
  ctx.strokeStyle='#80796c77';ctx.lineWidth=.5;for(let i=0;i<18;i++){const x=random()*512,y=random()*512;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*7-3,y+random()*6);ctx.stroke();}
  map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;
 }
 const material=new THREE.MeshStandardMaterial({color:'#8c806c',map,bumpMap:map,bumpScale:.035,vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 material.addEventListener('dispose',()=>map?.dispose());
 const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=true;mesh.name=msg("desert_rock_mesh.rock_formations_and_solid_ramps");return mesh;
}
