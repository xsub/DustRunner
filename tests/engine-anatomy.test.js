import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {sliderCrank,valveLift} from '../src/engine-anatomy.js';
import {engineById,engineTorque,defaultEngine} from '../src/engines.js';
import {vehicleMass,vehicleMassProperties} from '../src/vehicle-mass.js';
import {isBiminiBody,isCompactBody} from '../src/body-types.js';
import {initPhysics,createPhysics} from '../src/physics.js';
before(initPhysics);
test('slider crank preserves conrod length on both 45-degree V banks and a straight bank',()=>{
 for(const bank of [-Math.PI/4,0,Math.PI/4])for(let i=0;i<720;i++){
  const a=i*Math.PI/180,s=sliderCrank(a,bank);
  assert.ok(Math.abs(Math.hypot(s.piston.x-s.pin.x,s.piston.y-s.pin.y)-.42)<1e-12);
  assert.ok(Math.abs(s.piston.x*Math.cos(bank)-s.piston.y*Math.sin(bank))<1e-12);
  assert.equal(s.cam,a/2);
 }
 const top=sliderCrank(0).travel,bottom=sliderCrank(Math.PI).travel;assert.ok(Math.abs(top-bottom-.26)<1e-12);
});
test('four-stroke valve illustration repeats over two crank revolutions, not every revolution',()=>{
 const angle=Math.PI/2;assert.ok(valveLift(angle).intake>.99);assert.equal(valveLift(angle+Math.PI*2).intake,0);
 assert.deepEqual(valveLift(angle),valveLift(angle+Math.PI*4));assert.ok(valveLift(Math.PI*3.5).exhaust>.99);
});
test('new 1978 bodies mount distinct stock-family and modern-swap engine defaults',()=>{
 assert.equal(defaultEngine('copper78'),'400');assert.equal(defaultEngine('godzilla78'),'godzilla73');
 for(const body of ['copper78','godzilla78']){assert.ok(isBiminiBody(body));assert.equal(isCompactBody(body),false);}
 const e=engineById('godzilla73');assert.equal(e.liters,7.3);assert.equal(e.cylinders,8);
 assert.ok(Math.abs(engineTorque(e,5500)*5500/9549/ .7457-430)<2);assert.equal(engineTorque(e,4000),644);
 assert.ok(vehicleMass('godzilla78',e.id)>vehicleMass('godzilla78','302'));assert.ok(vehicleMassProperties('godzilla78',e.id).centerOfMass.y<-.4);
});
test('Godzilla delivers stronger acceleration in the full-size body without launch wheelies',()=>{
 const result={};
 for(const id of ['400','godzilla73']){
  const terrain={positions:new Float32Array([-500,0,-500,500,0,-500,-500,0,500,500,0,500]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
  const p=createPhysics(terrain,{min:{x:-500,z:-500},max:{x:500,z:500}}),c={style:'godzilla78',engineId:id,driveMode:'auto',handlingProfile:'arcade',x:0,z:0,heading:0,speed:0};p.reset(c);let zeroTo50=null;
  try{for(let i=0;i<720;i++){p.input(c,{throttle:i<180?0:1,steer:0,onDirt:true},1/120);p.step();p.sync(c,1/120);if(i>=180){assert.equal(c.rollover,false);const q=c.physics.body.rotation();assert.ok(Math.abs(2*(q.w*q.x-q.y*q.z))<.3);if(zeroTo50===null&&c.speed>50/3.6)zeroTo50=(i-180)/120;}}
   assert.ok(zeroTo50!==null);result[id]=zeroTo50;
  }finally{p.dispose();}
 }
 assert.ok(result.godzilla73<result['400']*.9,JSON.stringify(result));
});
