import test from 'node:test';
import assert from 'node:assert/strict';
import {Object3D,Vector3} from 'three';
import {resetIgnition,requestIgnition,ignitionPhase,ignitionStep} from '../src/ignition.js';
import {powertrainStep,resetPowertrain} from '../src/powertrain.js';
import {exhaustLayout,exhaustEmission} from '../src/exhaust-layout.js';
const car=()=>({style:'classic',engineId:'302',driveMode:'auto',speed:0,vx:0,vz:0,vertical:0,airborne:false});
test('engines default to running and stop only after all horizontal motion and flight end',()=>{
 const c=car();assert.equal(ignitionPhase(c),'running');resetIgnition(c);
 for(const change of [{speed:1},{vx:.4},{vz:.4},{vertical:.5},{airborne:true}]){Object.assign(c,car(),change);assert.equal(requestIgnition(c),false);assert.equal(ignitionPhase(c),'running');}
 Object.assign(c,car());assert.equal(requestIgnition(c),true);assert.equal(ignitionPhase(c),'stopping');assert.equal(requestIgnition(c),false);ignitionStep(c,.5);assert.equal(ignitionPhase(c),'off');
});
test('off and cranking engines cannot apply throttle or nitro force; restart takes real simulated time',()=>{
 const c=car();resetIgnition(c);resetPowertrain(c);requestIgnition(c);
 const input={throttle:1,brake:false,boost:true,onDirt:true};
 for(let i=0;i<120;i++){const out=powertrainStep(c,input,1/120);assert.equal(out.acceleration,0);}
 assert.equal(c.powertrain.rpm,0);assert.equal(c.powertrain.torque,0);assert.equal(c.powertrain.load,0);assert.equal(ignitionPhase(c),'off');
 requestIgnition(c);for(let i=0;i<120;i++)assert.equal(powertrainStep(c,input,1/120).acceleration,0);
 assert.equal(ignitionPhase(c),'starting');for(let i=0;i<30;i++)powertrainStep(c,input,1/120);assert.equal(ignitionPhase(c),'running');assert.ok(c.powertrain.torque>0);
});
test('ignition is rate independent and a reset starts a new session with the engine running',()=>{
 for(const hz of [30,60,120]){const c=car();resetIgnition(c);requestIgnition(c);for(let i=0;i<hz;i++)ignitionStep(c,1/hz);requestIgnition(c);for(let i=0;i<hz*2;i++)ignitionStep(c,1/hz);assert.equal(ignitionPhase(c),'running');requestIgnition(c);resetIgnition(c);assert.equal(ignitionPhase(c),'running');}
});
test('exhaust follows real throttle/load, shifts and start catches, and stops with the engine',()=>{
 const c=car(),history={};c.powertrain={gear:1,load:0,throttle:0};const idle=exhaustEmission(c,history,.01);
 c.powertrain.load=1;c.powertrain.throttle=1;const pull=exhaustEmission(c,history,.01);assert.ok(pull.rate>idle.rate*4);assert.ok(pull.opacity>idle.opacity);
 history.burst=0;c.powertrain.gear=2;assert.ok(exhaustEmission(c,history,.01).burst>0);
 c.ignition={phase:'off'};assert.equal(exhaustEmission(c,history,.01).rate,0);c.ignition={phase:'starting',time:.4};assert.equal(exhaustEmission(c,history,.01).rate,0);c.ignition.phase='running';assert.ok(exhaustEmission(c,history,.01).burst>0);
});
test('outlets match the rendered pipe tips and follow vehicle yaw, pitch and scale',()=>{
 for(const style of ['classic','ranger','sunset','sky','crawler','expedition','copper78','godzilla78']){
  const layout=exhaustLayout(style,.99);assert.equal(layout.length,2);
  for(const outlet of layout){assert.ok(new Vector3(...outlet.tip).distanceTo(new Vector3(...outlet.from))>.3);assert.ok(Math.abs(new Vector3(...outlet.direction).length()-1)<1e-9);}
  assert.equal(layout[0].tip[1],layout[1].tip[1]);assert.ok(style==='godzilla78'?layout[0].direction[0]===-1:layout[0].direction[2]===1);
 }
 const body=new Object3D(),outlet=new Object3D();body.position.set(10,4,20);body.scale.setScalar(1.4);body.rotation.set(.2,.8,.1);outlet.position.fromArray(exhaustLayout('classic')[0].tip);body.add(outlet);
 const expected=body.localToWorld(new Vector3(...exhaustLayout('classic')[0].tip));assert.ok(outlet.getWorldPosition(new Vector3()).distanceTo(expected)<1e-9);
});
test('exhaust uses one bounded particle batch, follows outlets and drains after shutdown',async()=>{
 const {Scene,OrthographicCamera,Matrix4}=await import('three');const {createExhaustPool}=await import('../src/exhaust-pool.js');
 const scene=new Scene(),camera=new OrthographicCamera(),pool=createExhaustPool(scene,24),c=car();
 c.powertrain={gear:1,load:1,throttle:1};const body=new Object3D();body.position.set(10,5,20);c.exhausts=[-1,1].map(side=>{const outlet=new Object3D();outlet.position.set(side,0,2);body.add(outlet);return outlet;});
 pool.update(.1,[c],camera);const batch=scene.children.find(o=>o.isInstancedMesh);assert.equal(scene.children.length,1);assert.equal(batch.count,2);
 const matrix=new Matrix4(),p=new Vector3();for(let i=0;i<2;i++){batch.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);assert.ok(c.exhausts.some(outlet=>outlet.getWorldPosition(new Vector3()).distanceTo(p)<.5));}
 for(let i=0;i<300;i++)pool.update(1/60,[c],camera);assert.ok(pool.getStats().particles<=24);assert.ok(pool.getStats().particles>0);
 c.ignition={phase:'off'};for(let i=0;i<120;i++)pool.update(1/60,[c],camera);assert.equal(pool.getStats().particles,0);pool.reset();assert.equal(batch.count,0);
});
