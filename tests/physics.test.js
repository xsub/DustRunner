import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {initPhysics,createPhysics,GRAVITY} from '../src/physics.js';
import {triangleSampler} from '../src/terrain.js';
import {ENGINES} from '../src/engines.js';
import {vehicleMass} from '../src/vehicle-mass.js';
before(async()=>await initPhysics());
const dt=1/120;
function fixture(height=()=>0,extent=20,configuration={}){
 const vertices=[],indices=[],n=81,size=extent*2;
 for(let z=0;z<n;z++)for(let x=0;x<n;x++)vertices.push(x/(n-1)*size-size/2,height(x/(n-1)*size-size/2,z/(n-1)*size-size/2),z/(n-1)*size-size/2);
 for(let z=0;z<n-1;z++)for(let x=0;x<n-1;x++){const a=z*n+x;indices.push(a,a+n,a+1,a+1,a+n,a+n+1);}
 const terrain={positions:new Float32Array(vertices),indices:new Uint32Array(indices)};terrain.heightAt=triangleSampler(terrain.positions,terrain.indices);
 const physics=createPhysics(terrain,{min:{x:-extent,z:-extent},max:{x:extent,z:extent}});
 const car={x:0,z:0,heading:0,speed:0,style:'classic',engineId:'302',...configuration};physics.reset(car);
 return {physics,car,terrain};
}
function step(f,input={},frames=1){for(let j=0;j<frames;j++){f.physics.input(f.car,{throttle:0,steer:0,onDirt:true,...input},dt);f.physics.step();f.physics.sync(f.car,dt);}}
test('four suspension contacts settle without the tires or body sinking into flat ground',()=>{
 const f=fixture();step(f,{},360);
 assert.equal(f.car.airborne,false);assert.ok(Math.abs(f.car.height)<.04);
 for(let i=0;i<4;i++){assert.ok(f.car.physics.controller.wheelIsInContact(i));assert.ok(f.car.suspensionLengths[i]>.45&&f.car.suspensionLengths[i]<.56);}
 f.physics.dispose();
});
test('one-wheel bump produces independent suspension travel across both axles',()=>{
 const f=fixture((x,z)=>.5*Math.exp(-((x+1.4)**2+(z+1.232)**2)/.7));step(f,{},360);
 const lengths=f.car.suspensionLengths;
 assert.ok(Math.max(...lengths)-Math.min(...lengths)>.025,JSON.stringify(lengths));
 assert.ok(Math.abs(lengths[0]-lengths[2])>.025&&Math.abs(lengths[1]-lengths[3])>.025,JSON.stringify(lengths));
 assert.ok(f.car.physics.controller.wheelSuspensionForce(0)>0);
 f.physics.dispose();
});
test('airborne steering, throttle and brakes do not redirect a ballistic flight',()=>{
 const a=fixture(),b=fixture();
 for(const f of [a,b]){f.car.physics.body.setTranslation({x:0,y:20,z:0},true);f.car.physics.body.setLinvel({x:0,y:4,z:-15},true);f.physics.sync(f.car,0);}
 for(let i=0;i<90;i++){step(a,{throttle:1,steer:.2,boost:true});step(b,{brake:true,steer:-.2});}
 const p=a.car.physics.body.translation(),other=b.car.physics.body.translation();
 assert.ok(Math.abs(p.x-other.x)<.0001&&Math.abs(p.z-other.z)<.0001&&Math.abs(p.y-other.y)<.0001);
 assert.ok(Math.abs(a.car.heading-b.car.heading)<.00001);
 assert.ok(p.y>18&&p.y<21);assert.equal(GRAVITY,9.81);
 a.physics.dispose();b.physics.dispose();
});
test('asymmetric landing can physically roll a truck onto its side',()=>{
 const f=fixture(x=>3.4*(1-Math.max(0,Math.min(1,(x+.4)/.8))));
 f.car.physics.body.setTranslation({x:0,y:8,z:0},true);f.physics.sync(f.car,0);
 let minUp=1;
 for(let i=0;i<600;i++){step(f);const q=f.car.physics.body.rotation();minUp=Math.min(minUp,1-2*(q.x*q.x+q.z*q.z));}
 assert.ok(minUp<.35,`minimum up ${minUp}`);assert.ok(Number.isFinite(f.car.height));
 f.physics.dispose();
});
test('3D chassis collisions transfer momentum without cars passing through each other',()=>{
 const f=fixture(),other={x:0,z:-8,heading:Math.PI,speed:0,style:'ranger',engineId:'351m'};f.physics.reset(other);
 step(f,{},180);for(let i=0;i<180;i++){f.physics.input(other,{throttle:0,steer:0,onDirt:true},dt);f.physics.step();f.physics.sync(other,dt);}
 f.car.physics.body.setLinvel({x:0,y:0,z:-15},true);
 for(let i=0;i<100;i++){step(f);f.physics.input(other,{throttle:0,steer:0,onDirt:true},dt);f.physics.sync(other,dt);}
 assert.ok(other.vz<-.5);assert.ok(Math.hypot(f.car.x-other.x,f.car.z-other.z)>4);
 f.physics.dispose();
});
test('front-wheel steering uses different inside and outside angles; rear wheels remain straight',()=>{
 const f=fixture();step(f,{},180);step(f,{steer:.2,throttle:1},60);
 const c=f.car.physics.controller;
 assert.ok(c.wheelSteering(0)>0&&c.wheelSteering(2)>0);assert.notEqual(c.wheelSteering(0),c.wheelSteering(2));
 assert.equal(c.wheelSteering(1),0);assert.equal(c.wheelSteering(3),0);
 f.physics.dispose();
});

test('engine weight loads the front axle and heavier blocks move the physical center of mass forward',()=>{
 const light=fixture(()=>0,20,{engineId:'170'}),heavy=fixture(()=>0,20,{engineId:'400'});
 for(const f of [light,heavy]){
  step(f,{},240);
  const body=f.car.physics.body,c=f.car.physics.controller,front=c.wheelSuspensionForce(0)+c.wheelSuspensionForce(2),rear=c.wheelSuspensionForce(1)+c.wheelSuspensionForce(3);
  assert.ok(Math.abs(body.mass()-vehicleMass('classic',f.car.engineId))<.01);
  assert.ok(body.localCom().y<-.35&&body.localCom().z<0);
  assert.ok(front/(front+rear)>.53&&front/(front+rear)<.62,`front axle share ${front/(front+rear)}`);
 }
 assert.ok(heavy.car.physics.body.mass()>light.car.physics.body.mass());
 assert.ok(heavy.car.physics.body.localCom().z<light.car.physics.body.localCom().z);
 light.physics.dispose();heavy.physics.dispose();
});
test('full-throttle upgraded starts with nitro keep the front tires grounded for every engine and body',()=>{
 for(const style of ['classic','ranger','sunset','expedition'])for(const engine of ENGINES)for(const settled of [false,true]){
  const f=fixture(()=>0,250,{style,engineId:engine.id});if(settled)step(f,{},180);
  let peakPitch=0,frontAirFrames=0;
  for(let i=0;i<360;i++){
   step(f,{throttle:1,boost:true,engine:3,tires:3});
   const q=f.car.physics.body.rotation(),front=f.car.physics.controller;
   peakPitch=Math.max(peakPitch,Math.asin(Math.max(-1,Math.min(1,2*(q.w*q.x-q.y*q.z)))));
   if(i>30&&!front.wheelIsInContact(0)&&!front.wheelIsInContact(2))frontAirFrames++;
   assert.equal(f.car.rollover,false,`${style} ${engine.id}`);
  }
  assert.ok(peakPitch<12*Math.PI/180,`${style} ${engine.id}: pitch ${peakPitch*180/Math.PI}`);
  assert.ok(frontAirFrames<12,`${style} ${engine.id}: ${frontAirFrames} frames doing a wheelie`);
  assert.ok(f.car.speed>10,`${style} ${engine.id}: launch must still accelerate`);
  f.physics.dispose();
 }
});
test('engine and body swaps update mass properties without changing the collision envelope',()=>{
 const f=fixture(),body=f.car.physics.body,colliders=body.numColliders();step(f,{},180);
 const before=body.mass(),center=body.localCom().z;
 f.car.engineId='400';step(f);
 assert.ok(body.mass()>before);assert.ok(body.localCom().z<center);assert.equal(body.numColliders(),colliders);
 f.car.style='ranger';step(f);
 assert.ok(Math.abs(body.mass()-vehicleMass('ranger','400'))<.01);assert.equal(body.numColliders(),colliders);
 f.physics.dispose();
});
