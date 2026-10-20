import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {arcadePedals,arcadeSteering,descentDeceleration} from '../src/handling.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {tuning} from '../src/tuning.js';
const dt=1/120;
before(initPhysics);
function fixture({profile='arcade',grade=0,descent=false}={}){
 const h=(x,z)=>500+grade*z,terrain={positions:new Float32Array([-500,h(-500,-500),-500,500,h(500,-500),-500,-500,h(-500,500),500,500,h(500,500),500]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:h};
 const p=createPhysics(terrain,{min:{x:-500,z:-500},max:{x:500,z:500}}),car={style:'classic',engineId:'302',driveMode:grade?'lo':'auto',handlingProfile:profile,hillDescent:descent,x:0,z:0,heading:0,speed:0};p.reset(car);
 const step=(input={})=>{p.input(car,{throttle:0,steer:0,onDirt:true,...input},dt);p.step();p.sync(car,dt);};
 return {p,car,step};
}
test('arcade accelerator builds/releases consistently at different refresh rates',()=>{
 const states=[];
 for(const hz of [60,120]){const s={};for(let i=0;i<hz/5;i++)arcadePedals(s,{throttle:1},1/hz);assert.ok(s.throttle>.75&&s.throttle<.9);states.push(s.throttle);for(let i=0;i<hz;i++)arcadePedals(s,{throttle:0},1/hz);assert.equal(s.throttle,0);}
 assert.ok(Math.abs(states[0]-states[1])<1e-9);
 const s={};assert.equal(arcadePedals(s,{throttle:1,brake:true},dt).throttle,0);
});
test('arcade rack keeps parking lock, limits racing lock and countersteers through tires only',()=>{
 const run=(speed,side=0,options={})=>{let rack=0;for(let i=0;i<240;i++)rack=arcadeSteering(rack,1,speed,side,dt,options);return rack;};
 assert.ok(run(0)>.55);assert.ok(run(25)<.1);assert.ok(run(12,4)<run(12,-4));
 assert.equal(run(12,4,{airborne:true}),run(12,-4,{airborne:true}));
 assert.equal(arcadeSteering(.3,0,30,6,dt,{mode:'hold'}),.3);
 assert.equal(arcadeSteering(.3,0,30,-6,dt,{mode:'hold'}),.3);
});
test('downhill brakes yield to pedals and require a low range, slope and grounded upright car',()=>{
 const input={enabled:true,mode:'lo',speed:4,slope:-.3,throttle:0,brake:false,contacts:4,rollover:false};
 assert.ok(descentDeceleration(input)>0);
 for(const change of [{enabled:false},{mode:'auto'},{mode:'hi'},{speed:1},{slope:.3},{throttle:.5},{brake:true},{contacts:0},{contacts:1},{rollover:true}])assert.equal(descentDeceleration({...input,...change}),0);
 assert.ok(descentDeceleration({...input,speed:-4,slope:.3})>0,'also handles reversing down a slope');
});
test('physical downhill control holds about 6 km/h on a 35 percent grade without changing mass or gravity',()=>{
 const speeds=[];
 for(const descent of [false,true]){const f=fixture({grade:.35,descent});try{
  let previous=0;
  for(let i=0;i<1800;i++){f.step();assert.ok(Math.abs(f.car.speed-previous)<.3,`braking must act over time: ${f.car.speed-previous}, frame ${i}, HDC ${descent}`);previous=f.car.speed;}
  speeds.push(f.car.speed*3.6);assert.equal(f.car.rollover,false);assert.ok(Math.abs(f.car.physics.body.mass()-2250)<1);assert.equal(f.p.world.gravity.y,-tuning.gravity);
 }finally{f.p.dispose();}}
 assert.ok(speeds[0]>30);assert.ok(speeds[1]>5.5&&speeds[1]<7.5,JSON.stringify(speeds));
});
test('handbrake applies rear-wheel impulses and decelerates without touching front steering',()=>{
 const f=fixture();try{
  for(let i=0;i<180;i++)f.step();f.car.physics.body.setLinvel({x:0,y:0,z:-15},true);f.p.sync(f.car,dt);
  f.step({handbrake:true,steer:.3});const c=f.car.physics.controller;
  assert.equal(c.wheelBrake(0),0);assert.equal(c.wheelBrake(2),0);assert.ok(c.wheelBrake(1)>0&&c.wheelBrake(3)>0);assert.equal(c.wheelEngineForce(1),0);assert.ok(c.wheelSteering(0)>0);
  for(let i=0;i<120;i++)f.step({handbrake:true});assert.ok(f.car.speed<12);
 }finally{f.p.dispose();}
});
test('arcade steering, nitro, handbrake and downhill control cannot redirect a flight',()=>{
 const a=fixture({descent:true}),b=fixture();try{
  for(const f of [a,b]){f.car.physics.body.setTranslation({x:0,y:120,z:0},true);f.car.physics.body.setLinvel({x:2,y:4,z:-15},true);f.p.sync(f.car,dt);}
  for(let i=0;i<90;i++){a.step({throttle:1,steer:1,handbrake:true,boost:true});b.step();}
  const p=a.car.physics.body.translation(),q=b.car.physics.body.translation();assert.ok(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<1e-5);assert.ok(Math.abs(a.car.heading-b.car.heading)<1e-6);assert.equal(a.car.physics.descentActive,false);
 }finally{a.p.dispose();b.p.dispose();}
});
test('arcade launches stay responsive and full parking lock can turn the vehicle around',()=>{
 const f=fixture();try{
  let zeroTo50=null;for(let i=0;i<600;i++){f.step({throttle:1});if(zeroTo50===null&&f.car.speed>=50/3.6)zeroTo50=(i+1)*dt;}
  assert.ok(zeroTo50>1.5&&zeroTo50<2.5);assert.equal(f.car.rollover,false);
  f.car.x=f.car.z=f.car.speed=0;f.p.reset(f.car);
  let headingChange=0,previous=0;
  for(let i=0;i<1200;i++){f.step({throttle:.15,steer:1});const change=f.car.heading-previous;headingChange+=Math.atan2(Math.sin(change),Math.cos(change));previous=f.car.heading;}
  assert.ok(headingChange>Math.PI);assert.equal(f.car.rollover,false);
 }finally{f.p.dispose();}
});
