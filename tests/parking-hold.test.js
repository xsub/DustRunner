import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {initPhysics,createPhysics} from '../src/physics.js';
import {resetPowertrain,shiftGear} from '../src/powertrain.js';
import {defaultEngine} from '../src/engines.js';
before(initPhysics);
function hill(angle){const s=Math.tan(angle*Math.PI/180);return {positions:new Float32Array([-500,-500*s,-500,500,-500*s,-500,-500,500*s,500,500,500*s,500]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:(x,z)=>z*s};}
for(const style of ['classic','copper78','monster80'])for(const heading of [0,Math.PI])test(`parking brake holds ${style} facing ${heading===0?'downhill':'uphill'} and releases freely`,()=>{
 const p=createPhysics(hill(25),{min:{x:-500,z:-500},max:{x:500,z:500}}),car={style,engineId:defaultEngine(style),speed:0,x:0,z:0,heading};p.reset(car);
 const step=(held,extra={})=>{p.input(car,{throttle:0,steer:0,handbrake:held,onDirt:true,...extra},1/120);p.step();p.sync(car,1/120);};
 try{
  for(let i=0;i<600;i++)step(true);const start={x:car.x,z:car.z};
  for(let i=0;i<1800;i++)step(true);
  assert.ok(Math.hypot(car.x-start.x,car.z-start.z)<.03,'parked car must not creep over 15 seconds');assert.equal(car.rollover,false);assert.ok(car.physics.parkingAnchor);
  step(true,{throttle:1});assert.equal(car.physics.parkingAnchor,null,'gas releases the static holding assistance');
  car.transmissionMode='manual';resetPowertrain(car);assert.equal(shiftGear(car,0),true);
  car.physics.body.setLinvel({x:0,y:0,z:-3},true);
  for(let i=0;i<12;i++)step(false);assert.equal(car.physics.parkingAnchor,null);assert.ok(Math.hypot(car.x-start.x,car.z-start.z)>.02,'released car remains free to move');
 }finally{p.dispose();}
});
test('moving handbrake turns and airborne cars do not acquire a parking anchor',()=>{
 const p=createPhysics(hill(0),{min:{x:-500,z:-500},max:{x:500,z:500}}),car={style:'classic',engineId:'302',speed:0,x:0,z:0,heading:0};p.reset(car);
 try{
  for(let i=0;i<300;i++){p.input(car,{handbrake:false,throttle:0,onDirt:true},1/120);p.step();p.sync(car,1/120);}
  car.physics.body.setLinvel({x:0,y:0,z:-10},true);car.speed=10;p.input(car,{handbrake:true,throttle:0,onDirt:true},1/120);assert.equal(car.physics.parkingAnchor,null);
  car.physics.body.setTranslation({x:0,y:15,z:0},true);car.physics.body.setLinvel({x:0,y:0,z:0},true);car.speed=0;
  p.input(car,{handbrake:true,throttle:0,onDirt:true},1/120);assert.equal(car.physics.parkingAnchor,null);p.step();assert.ok(car.physics.body.linvel().y<0,'gravity still acts in the air');
 }finally{p.dispose();}
});
