import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Handbrake} from '../src/handbrake.js';
import {engineDriverAudible} from '../src/engine-sound.js';
test('a short handbrake hold brakes momentarily; two seconds latch at different frame rates',()=>{
 for(const hz of [30,60,120]){
  const brake=new Handbrake();for(let i=0;i<hz;i++)assert.equal(brake.update(true,1/hz),true);
  assert.equal(brake.latched,false);assert.ok(Math.abs(brake.progress-.5)<1e-9);assert.equal(brake.update(false,0),false);
  for(let i=0;i<hz*2;i++)brake.update(true,1/hz);
  assert.equal(brake.latched,true);assert.equal(brake.progress,1);assert.equal(brake.update(false,1/hz),true);
 }
});
test('the next press releases the latch and cannot reapply it until released',()=>{
 const brake=new Handbrake();brake.update(true,2);brake.update(false,0);assert.equal(brake.update(true,.01),false);
 for(let i=0;i<600;i++)assert.equal(brake.update(true,1/120),false);
 brake.update(false,0);assert.equal(brake.update(true,.1),true);assert.equal(brake.latched,false);
});
test('pausing cancels a partial hold but preserves a latched brake; reset releases everything',()=>{
 const brake=new Handbrake();brake.update(true,1.5);brake.cancelHold();assert.equal(brake.active,false);assert.equal(brake.progress,0);
 brake.update(true,1);assert.equal(brake.latched,false);brake.update(true,1);brake.cancelHold();assert.equal(brake.active,true);
 brake.reset();assert.equal(brake.active,false);assert.equal(brake.progress,0);
});
test('coasting is silent regardless of road-driven RPM/load, while idle and deliberate revs remain audible',()=>{
 const car={speed:15,powertrain:{rpm:6000,load:1}};assert.equal(engineDriverAudible(car),false);car.speed=-15;assert.equal(engineDriverAudible(car),false);
 assert.equal(engineDriverAudible(car,{accelerator:true}),true);assert.equal(engineDriverAudible(car,{accelerator:true,brake:true}),false);
 assert.equal(engineDriverAudible(car,{preview:true}),true);car.speed=0;assert.equal(engineDriverAudible(car),true);
});
test('automatic S/Down reverse gas remains audible; manual reverse uses the accelerator',()=>{
 const car={speed:-4,physics:{controls:{reverse:true}}};assert.equal(engineDriverAudible(car,{brake:true}),true);assert.equal(engineDriverAudible(car),false);
 car.transmissionMode='manual';assert.equal(engineDriverAudible(car,{brake:true}),false);assert.equal(engineDriverAudible(car,{accelerator:true}),true);
});

test('a press/release shorter than one physics step still releases the parking latch',()=>{
 const brake=new Handbrake();brake.update(true,2);brake.release();brake.press();brake.release();assert.equal(brake.update(false,1/120),false);assert.equal(brake.latched,false);
});
