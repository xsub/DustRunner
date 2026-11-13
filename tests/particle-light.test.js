import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDustPool} from '../src/dust-pool.js';
import {createExhaustPool} from '../src/exhaust-pool.js';
import {createSandTrails} from '../src/sand-trails.js';
import {createDesertWind} from '../src/desert-scenery.js';

const dustCar={vx:0,vz:-20,heading:0,physics:{controller:{wheelIsInContact:()=>true,wheelContactPoint:()=>({x:0,y:0,z:0})}}};
const instanceRotation=(mesh,index=0)=>{const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();mesh.getMatrixAt(index,matrix);matrix.decompose(new THREE.Vector3(),q,new THREE.Vector3());return q;};
// Instance matrices are 32-bit floats, so a decomposed rotation is only good to about 1e-6 rad.
const FACING=1e-3;
const instanceColor=(mesh,index=0)=>{const color=new THREE.Color();mesh.getColorAt(index,color);return color;};

test('dust keeps facing a camera that looks around while the game is paused',()=>{
 const scene=new THREE.Scene(),dust=createDustPool(scene,16),camera=new THREE.PerspectiveCamera(),mesh=scene.children[0];
 dust.update(0,camera);assert.equal(mesh.count,0,'an empty paused pool does nothing');
 for(let i=0;i<60;i++)dust.sample(dustCar,1/120,()=>0);dust.update(.01,camera);
 const count=mesh.count,before=instanceRotation(mesh);assert.ok(count>0);assert.ok(before.angleTo(camera.quaternion)<FACING);
 camera.quaternion.setFromEuler(new THREE.Euler(0,1.2,0));
 const version=mesh.instanceMatrix.version;dust.update(0,camera);
 assert.equal(mesh.count,count,'paused: no particle ages or dies');assert.ok(instanceRotation(mesh).angleTo(camera.quaternion)<FACING,'but they turn to the new view');
 assert.ok(mesh.instanceMatrix.version>version,'and the new matrices are uploaded');
 dust.update(-1,camera);assert.equal(mesh.count,count,'negative time is ignored');
});

test('dust and exhaust take the time-of-day tint; white leaves them untouched',()=>{
 const scene=new THREE.Scene(),dust=createDustPool(scene,16),camera=new THREE.PerspectiveCamera(),mesh=scene.children[0];
 for(let i=0;i<60;i++)dust.sample(dustCar,1/120,()=>0);dust.update(.01,camera);
 const original=instanceColor(mesh).clone();assert.ok(original.r>.3);
 dust.setTint('#ffffff');dust.update(0,camera);assert.deepEqual(instanceColor(mesh).toArray(),original.toArray());
 dust.setTint('#555e6f');dust.update(0,camera);
 const night=instanceColor(mesh),tint=new THREE.Color('#555e6f');
 for(const channel of ['r','g','b'])assert.ok(Math.abs(night[channel]-original[channel]*tint[channel])<1e-6,channel);
 assert.ok(night.r<original.r*.15);

 const exhaustScene=new THREE.Scene(),exhaust=createExhaustPool(exhaustScene,16),body=new THREE.Object3D(),outlet=new THREE.Object3D();body.add(outlet);body.updateMatrixWorld(true);
 const car={style:'classic',engineId:'302',driveMode:'auto',speed:0,vx:0,vz:0,vertical:0,airborne:false,powertrain:{gear:1,load:1,throttle:1},exhausts:[outlet]};
 exhaust.update(.1,[car],camera);const smoke=exhaustScene.children.find(o=>o.isInstancedMesh),puffs=smoke.count;assert.ok(puffs>0);
 const grey=instanceColor(smoke).clone();exhaust.setTint('#937d7b');
 camera.quaternion.setFromEuler(new THREE.Euler(.3,-.9,0));exhaust.update(0,[car],camera);
 assert.equal(smoke.count,puffs,'paused: nothing is emitted or aged');assert.ok(instanceRotation(smoke).angleTo(camera.quaternion)<FACING,'paused exhaust still faces the view');
 const dusk=new THREE.Color('#937d7b');assert.ok(Math.abs(instanceColor(smoke).g-grey.g*dusk.g)<1e-6);
});

test('tyre tracks and wind gusts carry the same tint',()=>{
 const trails=createSandTrails(new THREE.Scene(),8),uniform=trails.mesh.material.uniforms.tint.value;
 assert.deepEqual(uniform.toArray(),[1,1,1]);trails.setTint('#c4b39a');assert.deepEqual(uniform.toArray(),new THREE.Color('#c4b39a').toArray());
 assert.match(trails.mesh.material.fragmentShader,/uniform vec3 tint;[\s\S]*\*tint;/);
 const world=new THREE.Group(),wind=createDesertWind({world,heightAt:()=>0,anchors:[],random:Math.random}),tumbleweed=world.children.find(o=>o.isLineSegments),gust=world.children.find(o=>o.isPoints);
 const twig=tumbleweed.material.color.clone();wind.setTint('#555e6f');
 assert.ok(tumbleweed.material.color.r<twig.r*.2);assert.deepEqual(gust.material.uniforms.tint.value.toArray(),new THREE.Color('#555e6f').toArray());
 wind.setTint('#ffffff');assert.deepEqual(tumbleweed.material.color.toArray(),twig.toArray(),'white restores the original colour');
});
