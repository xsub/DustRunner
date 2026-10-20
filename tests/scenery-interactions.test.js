import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {Group,IcosahedronGeometry,Matrix4,Vector3} from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {initPhysics,createPhysics} from '../src/physics.js';
import {createScenery} from '../src/scenery.js';
import {snakeRetreat} from '../src/wildlife.js';
import {findRecoverySpot} from '../src/recovery.js';
before(initPhysics);
const terrain={positions:new Float32Array([-200,0,-200,200,0,-200,-200,0,200,200,0,200]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
const bounds={min:{x:-200,z:-200},max:{x:200,z:200}};
test('rendered rock triangles are one fixed collider, support wheel rays and stay out of the recovery spawn',()=>{
 const physics=createPhysics(terrain,bounds),world=new Group();let seed=71,vertices,calls=0;
 try{
  const before=physics.world.bodies.len(),colliders=physics.world.colliders.len();
  const scenery=createScenery({world,samples:[],curve:{},roadWidth:0,nearest:()=>({distance:Infinity}),bounds:{min:{x:-60,z:-60},max:{x:60,z:60}},heightAt:()=>0,protectedAreas:[{x:0,z:0}],random:()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},addRocks:data=>{vertices=data;calls++;physics.addRocks(data);}});
  assert.equal(calls,1);assert.equal(physics.world.bodies.len(),before);assert.equal(physics.world.colliders.len(),colliders+1);
  const batch=world.children.find(o=>o.isInstancedMesh&&o.material.color.getHexString()==='82745b'),matrix=new Matrix4();batch.getMatrixAt(0,matrix);
  const point=new Vector3().fromBufferAttribute(batch.geometry.attributes.position,0).applyMatrix4(matrix);
  assert.ok(point.distanceTo(new Vector3(...vertices.slice(0,3)))<1e-5);
  const center=new Vector3().setFromMatrixPosition(matrix);assert.ok(Math.hypot(center.x,center.z)>8);assert.equal(scenery.isRecoveryBlocked(center.x,center.z),true);assert.equal(scenery.isRecoveryBlocked(0,0),false);
  // Rapier refreshes scene queries on the fixed step, as in the real game.
  physics.step();const hit=physics.world.castRay(new RAPIER.Ray({x:center.x,y:10,z:center.z},{x:0,y:-1,z:0}),20,true);
  assert.ok(hit&&hit.timeOfImpact<9.95);
  const spot=findRecoverySpot({x:center.x,z:center.z,heading:0,heightAt:()=>0,blocked:scenery.isRecoveryBlocked,fallback:{x:0,z:0}});assert.equal(scenery.isRecoveryBlocked(spot.x,spot.z),false);
 }finally{physics.dispose();}
});
test('a truck physically collides with a boulder instead of driving through it',()=>{
 const physics=createPhysics(terrain,bounds),geometry=new IcosahedronGeometry(1,0),vertices=geometry.attributes.position.array.slice();
 for(let i=0;i<vertices.length;i+=3){vertices[i]*=3;vertices[i+1]=vertices[i+1]*2+1.7;vertices[i+2]=vertices[i+2]*2-10;}
 physics.addRocks(vertices);geometry.dispose();
 const car={x:0,z:0,heading:0,speed:0,style:'classic',engineId:'302'};
 try{
  physics.reset(car);for(let i=0;i<180;i++){physics.input(car,{throttle:0,steer:0,onDirt:true},1/120);physics.step();physics.sync(car,1/120);}
  let impact=false;
  for(let i=0;i<480;i++){const speed=car.speed;physics.input(car,{throttle:.5,steer:0,onDirt:true},1/120);physics.step();physics.sync(car,1/120);if(speed-car.speed>.25)impact=true;}
  assert.ok(impact);assert.ok(car.z>-12,`truck tunneled through boulder: ${car.z}`);assert.ok(Number.isFinite(car.height));
 }finally{physics.dispose();}
});
test('snakes retreat for approaching trucks, hide instantly at close range, and reappear after a quiet interval',()=>{
 const snake={x:0,z:0,retreat:0};
 for(let i=0;i<20;i++)snakeRetreat(snake,[{x:-25+i*.5,z:0,vx:35,vz:0}],i/120,1/120);
 assert.equal(snake.retreat,1,'swept approach warns before wheels reach the snake');
 const close={x:0,z:0,retreat:0};assert.equal(snakeRetreat(close,[{x:2,z:0}],1,1/120),true);
 for(let i=0;i<240;i++)snakeRetreat(close,[],1+i/120,1/120);assert.equal(close.retreat,1);
 for(let i=0;i<360;i++)snakeRetreat(close,[],5+i/120,1/120);assert.equal(close.retreat,0);
});
test('snake safety hides animal instances even when decoration yields to physics',()=>{
 const world=new Group();let seed=71,queries=0;
 const scenery=createScenery({world,samples:[],curve:{},roadWidth:0,nearest:()=>({distance:Infinity}),bounds:{min:{x:-50,z:-50},max:{x:50,z:50}},heightAt:()=>{queries++;return 0;},random:()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}});
 scenery.update(1/30,()=>true);const batches=world.children.filter(o=>o.isInstancedMesh&&o.instanceMatrix.usage===35048);
 assert.ok(batches.some(o=>o.count>0));queries=0;
 // A dense set of stationary vehicles covers every snake; no terrain work is allowed.
 const cars=[];for(let x=-50;x<=50;x+=5)for(let z=-50;z<=50;z+=5)cars.push({x,z});
 scenery.update(1/120,()=>true,false,cars);
 assert.equal(queries,0);assert.ok(batches.every(o=>o.count===0));
});
