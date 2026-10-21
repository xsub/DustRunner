import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchRigidMeshes} from '../src/mesh-batching.js';
import {chunkTerrain} from '../src/terrain-chunks.js';
import {createOffroadWheel} from '../src/wheel.js';
import {RenderBudget} from '../src/render-budget.js';
import {VehiclePresentation} from '../src/vehicle-presentation.js';
import {createBronco} from '../src/vehicle.js';
import {createDustPool} from '../src/dust-pool.js';

test('batching preserves nested transforms, bounds, triangle count and transparent panes',()=>{
 const root=new THREE.Group();root.position.set(20,5,-40);root.rotation.y=.3;
 const nested=new THREE.Group();nested.position.x=3;root.add(nested);
 const metal=new THREE.MeshStandardMaterial(),glass=new THREE.MeshStandardMaterial({transparent:true});
 for(let i=0;i<4;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),metal);mesh.position.set(i,1,2);mesh.rotation.y=i*.2;nested.add(mesh);}
 const pane=new THREE.Mesh(new THREE.PlaneGeometry(2,2),glass);root.add(pane);
 const before=new THREE.Box3().setFromObject(root,true);batchRigidMeshes(root);const after=new THREE.Box3().setFromObject(root,true);
 assert.ok(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5);assert.equal(pane.parent,root);
 let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 assert.equal(meshes,2);assert.equal(triangles,50);
});

test('detailed wheels share five batches without sharing animated transforms',()=>{
 const a=createOffroadWheel(),b=createOffroadWheel();assert.equal(a.children.length,5);assert.equal(b.children.length,5);
 a.children.forEach((m,i)=>{assert.equal(m.geometry,b.children[i].geometry);assert.equal(m.material,b.children[i].material);});
 a.rotation.x=2;assert.ok(Math.abs(b.rotation.x)<1e-10);assert.ok(a.children.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0)>5000);
});

test('terrain chunks preserve every contact triangle, winding, normals and UVs exactly',()=>{
 const geometry=new THREE.PlaneGeometry(180,180,9,9).rotateX(-Math.PI/2),original=geometry.clone(),group=chunkTerrain(geometry,new THREE.MeshStandardMaterial(),40);
 assert.ok(group.children.length>10);let count=0;
 const triangles=g=>{const result=[];for(let i=0;i<g.index.count;i+=3){const values=[];for(let k=0;k<3;k++){const index=g.index.getX(i+k);for(const name of ['position','normal','uv']){const attr=g.attributes[name];for(let j=0;j<attr.itemSize;j++)values.push(attr.array[index*attr.itemSize+j]);}}result.push(values.join(','));}return result;};
 const actual=[];for(const mesh of group.children){count+=mesh.geometry.index.count;actual.push(...triangles(mesh.geometry));}
 assert.equal(count,original.index.count);assert.deepEqual(actual.sort(),triangles(original).sort());
});

test('resolution controller reduces persistent overload and ignores isolated stalls or pauses',()=>{
 const budget=new RenderBudget();assert.ok(3024*1880*budget.pixelRatio(3024,1880,2)**2<=2100001);
 for(let i=0;i<160;i++)budget.sample(i*25,14);assert.ok(budget.scale<1);
 const reduced=budget.scale;budget.sample(10000,0);assert.equal(budget.scale,reduced);
 for(let i=1;i<=400;i++)budget.sample(10000+i*8.33,3);assert.ok(budget.scale>reduced);
 const normal=new RenderBudget();for(let i=0;i<400;i++)normal.sample(i*1000/60,5);assert.equal(normal.scale,1);
 for(let i=0;i<10000;i++)budget.sample(20000+i*40,20);assert.ok(budget.scale>=.6);assert.ok(budget.pixelRatio(1920,1080,1)>=.5);
});

test('vehicle presentation interpolates position, rotation and suspension without altering saved simulation poses',()=>{
 const car={mesh:new THREE.Group(),wheels:[{pivot:new THREE.Group(),spin:new THREE.Group()}],axles:[]},view=new VehiclePresentation(car);
 car.mesh.position.x=10;car.mesh.rotation.y=1;car.wheels[0].pivot.position.y=.8;view.capture();view.render(.5);
 assert.equal(car.mesh.position.x,5);assert.ok(Math.abs(car.mesh.rotation.y-.5)<1e-8);assert.equal(car.wheels[0].pivot.position.y,.4);
 view.render(1);assert.equal(car.mesh.position.x,10);car.mesh.position.x=200;view.capture(true);view.render(0);assert.equal(car.mesh.position.x,200);
});

test('all eight vehicle styles retain detailed geometry, independent wheels and functional disposal',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
 try{for(const style of ['classic','ranger','sunset','sky','crawler','expedition','copper78','godzilla78']){
  const car=createBronco(style);assert.equal(car.wheels.length,4);assert.equal(car.axles.length,2);
  let meshes=0;car.mesh.traverse(o=>{if(o.isMesh)meshes++;});assert.ok(meshes<70,`${style}: ${meshes} meshes`);
  assert.ok(car.body.color.isColor);car.dispose();
 }}finally{globalThis.document=previous;}
});

test('dust uses one bounded draw batch and reuses slots after expiry and reset',()=>{
 const scene=new THREE.Scene(),dust=createDustPool(scene,12),camera=new THREE.PerspectiveCamera(),car={vx:0,vz:-20,heading:0,physics:{controller:{wheelIsInContact:()=>true,wheelContactPoint:()=>({x:0,y:0,z:0})}}};
 const fill=()=>{for(let i=0;i<120;i++)dust.sample(car,1/120,()=>0);dust.update(.001,camera);};
 fill();const mesh=scene.children[0];assert.equal(scene.children.length,1);assert.equal(mesh.count,12);
 const geometry=mesh.geometry,material=mesh.material;dust.update(4,camera);assert.equal(mesh.count,0);
 fill();assert.equal(mesh.count,12);assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);
 dust.reset();assert.equal(mesh.count,0);
});
