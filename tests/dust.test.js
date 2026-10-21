import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {dustEmission} from '../src/dust-emission.js';
import {createDustPool} from '../src/dust-pool.js';
const car=(extra={})=>({vx:0,vz:-15,heading:0,vertical:0,physics:{controls:{brakePressure:0},controller:{wheelIsInContact:()=>true,wheelContactPoint:i=>({x:i,y:0,z:2})}},...extra});
test('dust increases with speed, lateral slide, braking and loose sand',()=>{
 const base=dustEmission(car(),{},1/120);
 assert.equal(dustEmission(car({vz:0}),{},1/120).rate,0);
 assert.ok(dustEmission(car({vz:-30}),{},1/120).rate>base.rate);
 assert.ok(dustEmission(car({vx:8}),{},1/120).rate>base.rate);
 const braking=car();braking.physics.controls.brakePressure=1;
 assert.ok(dustEmission(braking,{},1/120).rate>base.rate);
 assert.ok(dustEmission(car(),{},1/120,{sand:true}).rate>base.rate);
});
test('airborne tires emit nothing and landing kicks up a decaying cloud',()=>{
 const history={};const c=car({airborne:true,vertical:-9});
 assert.equal(dustEmission(c,history,1/120).rate,0);
 c.airborne=false;c.vertical=0;
 const landing=dustEmission(c,history,1/120).rate;
 for(let i=0;i<120;i++)dustEmission(c,history,1/120);
 assert.ok(landing>dustEmission(c,history,1/120).rate*2);
});
test('contact emission has stable rate across sampling frequencies',()=>{
 const run=hz=>{const pool=createDustPool(new THREE.Scene(),1000),c=car();for(let i=0;i<hz;i++)pool.sample(c,1/hz,()=>0);return pool.getStats().emitted;};
 assert.equal(run(60),run(120));assert.equal(run(30),run(120));
});
test('pool rejects props and airborne contacts, stays bounded and resets',()=>{
 const scene=new THREE.Scene(),pool=createDustPool(scene,8),c=car();
 for(let i=0;i<120;i++)pool.sample(c,1/120,()=>-2);
 assert.equal(pool.getStats().particles,0);
 c.airborne=true;for(let i=0;i<120;i++)pool.sample(c,1/120,()=>0);
 assert.equal(pool.getStats().particles,0);
 c.airborne=false;pool.breakTrail(c);
 for(let i=0;i<120;i++)pool.sample(c,1/120,()=>0);
 assert.equal(pool.getStats().particles,8);assert.equal(scene.children.length,1);
 pool.update(4,new THREE.PerspectiveCamera());assert.equal(pool.getStats().particles,0);
 pool.reset();assert.equal(pool.getStats().emitted,0);
});

test('acceleration under engine load and handbrake raise dust without idling clouds',()=>{
 const moving=car(),history={speed:14.95};
 moving.powertrain={load:1};
 assert.ok(dustEmission(moving,history,1/120).rate>dustEmission(car(),{},1/120).rate);
 assert.ok(dustEmission(car(),{},1/120,{handbrake:true}).rate>dustEmission(car(),{},1/120).rate);
 assert.equal(dustEmission(car({vz:0,powertrain:{load:1}}),{},1/120).rate,0);
});
