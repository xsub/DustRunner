import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {initPhysics,createPhysics} from '../src/physics.js';
import {triangleSampler} from '../src/terrain.js';
import {DRIVE_MODES,axleWheelForces} from '../src/drive-modes.js';
import {powertrainStep,resetPowertrain,selectDriveMode,swapEngine} from '../src/powertrain.js';
const dt=1/120,input={throttle:1,steer:0,onDirt:true};
const car=mode=>({style:'classic',engineId:'302',driveMode:mode,axleLocks:{front:true,rear:true},x:0,z:0,heading:0,speed:0});
before(initPhysics);

function flat(mode){
 const terrain={positions:new Float32Array([-5000,0,-5000,5000,0,-5000,-5000,0,5000,5000,0,5000]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
 const physics=createPhysics(terrain,{min:{x:-5000,z:-5000},max:{x:5000,z:5000}}),c=car(mode);physics.reset(c);return {physics,c};
}
test('full 3D 302 launch and road speed improve while low/crawl ranges stay slow',()=>{
 const results={};
 for(const mode of DRIVE_MODES){
  const {physics,c}=flat(mode.id);let zeroTo50=null;
  try{for(let i=0;i<120*60;i++){physics.input(c,input,dt);physics.step();physics.sync(c,dt);if(zeroTo50===null&&c.speed>=50/3.6)zeroTo50=(i+1)*dt;}
   results[mode.id]={speed:c.speed*3.6,zeroTo50};assert.ok(Math.abs(c.physics.body.mass()-2250)<1);
  }finally{physics.dispose();}
 }
 assert.ok(results.auto.zeroTo50<2.2);assert.ok(results.auto.speed>105);
 assert.ok(results.hi.speed>results.auto.speed+10&&results.hi.speed>118);
 assert.ok(results.lo.speed>35&&results.lo.speed<55);
 assert.ok(results['4x4'].speed>10&&results['4x4'].speed<14);
});

test('reduction raises engine RPM and load at the same road speed and crawl stays in first',()=>{
 const auto=car('auto'),lo=car('lo'),crawl=car('4x4');[auto,lo,crawl].forEach(resetPowertrain);
 auto.speed=lo.speed=6;crawl.speed=2;
 for(let i=0;i<600;i++)for(const c of [auto,lo,crawl])powertrainStep(c,input,dt);
 assert.ok(lo.powertrain.rpm>auto.powertrain.rpm+900);assert.equal(crawl.powertrain.gear,1);
 assert.ok(crawl.powertrain.rpm>1800);assert.ok(crawl.powertrain.load>0);
});

test('low-range selection queues at speed/in flight and never deletes momentum',()=>{
 const c=car('auto');resetPowertrain(c);c.speed=25;c.vx=2;c.vz=-25;c.x=19;c.z=20;c.nitro=62;c.lap=1;
 selectDriveMode(c,'4x4');assert.equal(c.powertrain.mode,'auto');assert.equal(c.powertrain.pendingMode,'4x4');
 assert.deepEqual([c.speed,c.vx,c.vz,c.x,c.z,c.nitro,c.lap],[25,2,-25,19,20,62,1]);
 c.speed=1;c.airborne=true;powertrainStep(c,input,dt);assert.equal(c.powertrain.mode,'auto');
 c.airborne=false;powertrainStep(c,input,dt);assert.equal(c.powertrain.mode,'4x4');assert.equal(c.powertrain.pendingMode,null);assert.equal(c.powertrain.gear,1);
 assert.deepEqual(c.powertrain.locks,{front:true,rear:true});
 selectDriveMode(c,'hi');assert.equal(c.powertrain.mode,'hi');assert.deepEqual(c.powertrain.locks,{front:false,rear:false});
 assert.throws(()=>selectDriveMode(c,'bad'));
});

test('axle locks are independent, queue safely, and survive an engine hot-swap',()=>{
 const c=car('4x4');resetPowertrain(c);c.axleLocks.front=false;powertrainStep(c,input,dt);
 assert.deepEqual(c.powertrain.locks,{front:false,rear:true});
 c.speed=3;c.axleLocks.front=true;powertrainStep(c,input,dt);assert.equal(c.powertrain.locks.front,false);
 c.speed=0;powertrainStep(c,input,dt);assert.equal(c.powertrain.locks.front,true);
 c.speed=3;const before=[c.speed,c.x,c.z];swapEngine(c,'351wefi');assert.equal(c.powertrain.mode,'4x4');assert.equal(c.powertrain.gear,1);assert.deepEqual(c.powertrain.locks,{front:true,rear:true});assert.deepEqual([c.speed,c.x,c.z],before);
});

test('locked axles transfer available torque to grounded wheels in both directions',()=>{
 const contacts=[true,false,false,true],open=axleWheelForces(1000,contacts),front=axleWheelForces(1000,contacts,{front:true,rear:false}),both=axleWheelForces(1000,contacts,{front:true,rear:true});
 assert.ok(front[0]>open[0]*10);assert.equal(front[3],open[3]);assert.deepEqual(both,[2000,0,0,2000]);
 assert.deepEqual(axleWheelForces(-1000,contacts,{front:true,rear:true}),[-2000,0,0,-2000]);
 assert.deepEqual(axleWheelForces(1000,[false,false,false,false],{front:true,rear:true}),[0,0,0,0]);
 assert.deepEqual(axleWheelForces(1000,[true,true,true,true],{front:true,rear:true}),[1000,1000,1000,1000]);
});

test('Rapier truck pulls across diagonal articulation only when the axle locks can transfer torque',()=>{
 const results=[];
 for(const locked of [false,true]){
  const vertices=[],indices=[],n=81,extent=8;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=(i/(n-1)*2-1)*extent,z=(j/(n-1)*2-1)*extent;vertices.push(x,x*z>0?.85:0,z);}
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i;indices.push(a,a+n,a+1,a+1,a+n,a+n+1);}
  const terrain={positions:new Float32Array(vertices),indices:new Uint32Array(indices)};terrain.heightAt=triangleSampler(terrain.positions,terrain.indices);
  const physics=createPhysics(terrain,{min:{x:-extent,z:-extent},max:{x:extent,z:extent}}),c=car('4x4');c.axleLocks={front:locked,rear:locked};physics.reset(c);
  // Hold body attitude to isolate differential traction from tipping in this fixture.
  c.physics.body.setTranslation({x:0,y:2.6,z:0},true);c.physics.body.setEnabledRotations(false,false,false,true);
  try{
   for(let i=0;i<360;i++){physics.input(c,{...input,throttle:0},dt);physics.step();physics.sync(c,dt);}
   assert.deepEqual([0,1,2,3].map(i=>c.physics.controller.wheelIsInContact(i)),[true,false,false,true]);
   for(let i=0;i<60;i++){physics.input(c,input,dt);physics.step();physics.sync(c,dt);}results.push(c.speed);
  }finally{physics.dispose();}
 }
 assert.ok(results[1]>results[0]+.8,JSON.stringify(results));
});

test('crawler has climbing force, low ranges ignore nitro, and airborne force stays zero',()=>{
 const c=car('4x4');resetPowertrain(c);let drive;
 for(let i=0;i<240;i++)drive=powertrainStep(c,{...input,slope:.35},dt);
 assert.ok(drive.acceleration>4.5,'crawler must overcome gravity on a climb');
 for(const mode of ['lo','4x4']){
  const a=car(mode),b=car(mode);resetPowertrain(a);resetPowertrain(b);
  for(let i=0;i<200;i++){const normal=powertrainStep(a,input,dt),boost=powertrainStep(b,{...input,boost:true},dt);assert.equal(boost.acceleration,normal.acceleration);assert.equal(boost.topSpeed,normal.topSpeed);}
  a.airborne=true;const flight=powertrainStep(a,input,dt);assert.equal(flight.acceleration,0);
 }
});

test('crawler catches a rollback and climbs a 35 percent slope without the speed governor blocking forward torque',()=>{
 const terrain={positions:new Float32Array([-200,150,-200,200,150,-200,-200,10,200,200,10,200]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:(x,z)=>80-.35*z};
 const physics=createPhysics(terrain,{min:{x:-200,z:-200},max:{x:200,z:200}}),c=car('4x4');physics.reset(c);let rollback=0;
 try{
  for(let i=0;i<1200;i++){physics.input(c,{...input,throttle:i>180?1:0},dt);physics.step();physics.sync(c,dt);rollback=Math.min(rollback,c.speed);}
  assert.ok(rollback< -2);assert.ok(c.z< -10);assert.ok(c.speed>2&&c.speed<4);assert.equal(c.rollover,false);
 }finally{physics.dispose();}
});
