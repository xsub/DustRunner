import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {initPhysics,createPhysics} from '../src/physics.js';
import {readVehicleDiagnostics} from '../src/vehicle-diagnostics.js';
import {tuning} from '../src/tuning.js';
const dt=1/120;
before(initPhysics);
function flat(){
 const terrain={positions:new Float32Array([-500,0,-500,500,0,-500,-500,0,500,500,0,500]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
 const physics=createPhysics(terrain,{min:{x:-500,z:-500},max:{x:500,z:500}}),car={style:'classic',engineId:'302',x:0,z:0,heading:0,speed:0};
 physics.reset(car);
 const step=(input={})=>{physics.input(car,{throttle:0,steer:0,onDirt:true,...input},dt);physics.step();physics.sync(car,dt);};
 for(let i=0;i<180;i++)step();
 return {physics,car,step,read:()=>readVehicleDiagnostics(car,{dt,gravity:tuning.gravity})};
}
test('measured suspension supports vehicle weight, with more load on the engine axle',()=>{
 const {physics,read}=flat();try{
  const d=read();assert.equal(d.contacts,4);assert.ok(Math.abs(d.support-d.weight)/d.weight<.02);
  assert.ok(d.wheels[0].support+d.wheels[2].support>d.wheels[1].support+d.wheels[3].support);
  for(const w of d.wheels){assert.ok(w.compression>0&&w.compression<.1);assert.ok(Math.abs(w.ground.y+w.hub.y*-1+w.radius)<.02);assert.ok(w.supportVector.y>0);}
 }finally{physics.dispose();}
});
test('actual contact impulses have driving/braking directions and use the fixed step duration',()=>{
 const {physics,car,step,read}=flat();try{
  for(let i=0;i<120;i++)step({throttle:1});const drive=read();
  assert.ok(drive.wheels.every(w=>w.tractionVector.forward>0));
  assert.ok(drive.wheels[1].support>drive.wheels[0].support,'load transfers to the rear under acceleration');
  const half=readVehicleDiagnostics(car,{dt:dt/2});assert.ok(Math.abs(half.wheels[0].longitudinal/drive.wheels[0].longitudinal-2)<1e-9);
  for(let i=0;i<12;i++)step({brake:true});const brake=read();assert.ok(brake.wheels.every(w=>w.tractionVector.forward<0));
  car.physics.body.setLinvel({x:5,y:0,z:0},true);step();assert.ok(read().wheels.every(w=>w.sideVector.x<0),'lateral force opposes sideways motion');
 }finally{physics.dispose();}
});
test('airborne wheels lose contact forces and diagnostics cannot change the simulation',()=>{
 const {physics,car,step,read}=flat();try{
  const b=car.physics.body,p=b.translation();b.setTranslation({x:p.x,y:p.y+15,z:p.z},true);step();
  const before=JSON.stringify({p:b.translation(),v:b.linvel(),q:b.rotation(),s:car.suspensionLengths}),d=read();
  assert.equal(d.contacts,0);assert.equal(d.support,0);assert.ok(d.weight>20000);
  for(const w of d.wheels){assert.equal(w.ground,null);assert.equal(w.longitudinal,0);assert.equal(w.lateral,0);assert.deepEqual(w.supportVector,{x:0,y:0,forward:0});}
  assert.equal(JSON.stringify({p:b.translation(),v:b.linvel(),q:b.rotation(),s:car.suspensionLengths}),before);
 }finally{physics.dispose();}
});
test('cutaways ignore heading while preserving pitch, roll, axle articulation and signed wheel speeds',()=>{
 const {physics,car,read}=flat();try{
  const body=car.physics.body,tilt=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.2).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.15));
  body.setRotation(tilt,true);const first=read();body.setRotation(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),1.3).multiply(tilt),true);
  car.wheels=Array.from({length:4},(_,i)=>({angularVelocity:i%2?-10:20,angle:i}));
  car.suspensionLengths=[.3,.6,.7,.4];const next=read();
  assert.ok(Math.abs(next.pitch-first.pitch)<1e-6);assert.ok(Math.abs(next.roll-first.roll)<1e-6);
  assert.ok(Math.abs(next.center.forward-first.center.forward)<1e-6);assert.ok(next.wheels[0].camber<0&&next.wheels[1].camber>0);
  assert.ok(Math.abs(next.wheels[0].rpm-20*60/(2*Math.PI))<1e-9);assert.ok(next.wheels[0].speed<0&&next.wheels[1].speed>0);assert.equal(next.wheels[3].angle,3);
 }finally{physics.dispose();}
});
