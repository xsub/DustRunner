import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drivingControls,steeringStep} from '../src/driving-controls.js';
test('brake pressure builds and releases consistently across frame rates',()=>{
 const a={},b={};
 for(const [state,hz] of [[a,60],[b,120]]){
  for(let i=0;i<hz/2;i++)drivingControls(state,{brake:true},20,1/hz);
  assert.ok(state.brakePressure>.7&&state.brakePressure<.9);
  for(let i=0;i<hz/2;i++)drivingControls(state,{brake:false},20,1/hz);
  assert.ok(state.brakePressure<.01);
 }
 assert.ok(Math.abs(a.brakePressure-b.brakePressure)<1e-9);
});
test('rollback does not select reverse, while an already reversing driver can feather the pedal',()=>{
 const state={};
 for(let i=0;i<120;i++)assert.equal(drivingControls(state,{brake:true},-1,1/120).reverse,false);
 for(let i=0;i<60;i++)drivingControls(state,{brake:true},0,1/120);
 assert.equal(state.reverse,true);
 drivingControls(state,{brake:false},-1,1/120);
 assert.equal(drivingControls(state,{brake:true},-1,1/120).reverse,true);
 drivingControls(state,{throttle:1},-1,1/120);
 assert.equal(drivingControls(state,{brake:true},-1,1/120).reverse,false);
});

test('steering builds gradually to parking lock and reduces lock at racing speed',()=>{
 const run=(speed,hz,seconds=2)=>{let angle=0;for(let i=0;i<hz*seconds;i++)angle=steeringStep(angle,1,speed,1/hz);return angle;};
 assert.ok(run(0,120)>.55);
 assert.ok(run(22,120)<.13);
 assert.ok(run(0,120,.1)<.19,'a tap must not snap to full lock');
 assert.ok(Math.abs(run(5,60)-run(5,120))<1e-9);
 assert.equal(run(5,120),run(-5,120),'reverse must keep parking lock');
 assert.ok(steeringStep(.5,0,3,.3)<.05,'release centers the wheels');
 assert.ok(Math.abs(steeringStep(0,-1,3,1)+steeringStep(0,1,3,1))<1e-9);
});

test('held steering accumulates taps, holds exactly across speed changes and unwinds with the opposite arrow',()=>{
 let angle=0;
 const move=(input,frames=12)=>{for(let i=0;i<frames;i++)angle=steeringStep(angle,input,0,1/120,false,'hold');};
 move(1);const first=angle;assert.ok(Math.abs(first-.07)<1e-9);
 move(0,120);assert.equal(angle,first);
 move(1);assert.ok(Math.abs(angle-2*first)<1e-9);
 assert.equal(steeringStep(angle,0,28,1,false,'hold'),angle);
 move(-1);assert.ok(Math.abs(angle-first)<1e-9);
 move(-1,120);assert.equal(angle,-.56);
 move(1,240);assert.equal(angle,.56);
 assert.equal(steeringStep(angle,1,0,1/120,false,'hold',true),0);
 assert.ok(steeringStep(angle,0,0,1,false,'return')<.001);
});
test('held steering increments are frame-rate independent and never change AI steering',()=>{
 const run=hz=>{let angle=0;for(let i=0;i<hz/2;i++)angle=steeringStep(angle,-1,8,1/hz,false,'hold');return angle;};
 assert.ok(Math.abs(run(60)-run(120))<1e-9);
 assert.equal(steeringStep(.1,.8,10,1/120,true,'hold',true),steeringStep(.1,.8,10,1/120,true));
});
