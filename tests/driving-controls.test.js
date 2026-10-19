import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drivingControls} from '../src/driving-controls.js';
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
