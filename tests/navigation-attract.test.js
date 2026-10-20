import {test} from 'node:test';
import assert from 'node:assert/strict';
import {navigationReading} from '../src/navigation.js';
import {attractRunning,withDemoDrivetrain} from '../src/attract-mode.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('compass follows all cardinal headings and wraps multiple turns',()=>{
 for(const [heading,direction,bearing] of [[0,'N',0],[-Math.PI/2,'E',90],[Math.PI,'S',180],[Math.PI/2,'W',270],[-Math.PI*4,'N',0]]){
  const n=navigationReading({x:0,z:0,heading},()=>0);assert.equal(n.direction,direction);close(n.bearing,bearing);close(n.slope,0);
 }
});
test('ground slope uses terrain gradients independently of suspension or airborne pitch',()=>{
 const plane=(x,z)=>x*.2-z*.4+23,car={x:123,z:-82,heading:0,airborne:true};
 const n=navigationReading(car,plane);close(n.slope,Math.atan(Math.hypot(.2,.4))*180/Math.PI);close(n.longitudinal,Math.atan(.4)*180/Math.PI);close(n.lateral,Math.atan(.2)*180/Math.PI);
 const reverse=navigationReading({...car,heading:Math.PI},plane);close(reverse.longitudinal,-n.longitudinal);close(reverse.lateral,-n.lateral);
});
test('attract runs only before the first race, suspends for menus and hidden tabs',()=>{
 const state={started:false,freeRide:false,phase:'ready',hidden:false,editing:false};assert.equal(attractRunning(state),true);
 for(const change of [{started:true},{freeRide:true},{phase:'racing'},{hidden:true},{editing:true}])assert.equal(attractRunning({...state,...change}),false);
});
test('demo automatic drivetrain preserves saved manual/crawler settings even on failure',()=>{
 const car={driveMode:'4x4',transmissionMode:'manual'};
 withDemoDrivetrain(car,()=>{assert.equal(car.driveMode,'auto');assert.equal(car.transmissionMode,'auto');});assert.deepEqual(car,{driveMode:'4x4',transmissionMode:'manual'});
 assert.throws(()=>withDemoDrivetrain(car,()=>{throw Error('step');}));assert.equal(car.transmissionMode,'manual');
});
