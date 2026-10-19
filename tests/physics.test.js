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
 assert.ok(c.wheelSteering(0)>0&&c.wheelSteering(2)>0);assert.ok(c.wheelSteering(0)>c.wheelSteering(2),'inside front wheel must steer farther than outside');
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

function prepareCruise(f,speed){
 step(f,{},180);f.car.physics.body.setLinvel({x:0,y:0,z:-speed},true);f.physics.sync(f.car,0);
 f.car.powertrain.gear=3;f.car.powertrain.rpm=speed/.34*60/(Math.PI*2)*4.7;
}
test('service brakes build progressively and stop a 72 km/h truck over a controlled run-out',()=>{
 const f=fixture(()=>0,250);prepareCruise(f,20);
 const startZ=f.car.z;let firstDeceleration=0,laterDeceleration=0,stopTime=0;
 for(let i=0;i<120*8;i++){
  const before=f.car.speed;step(f,{brake:true});
  if(i===0)firstDeceleration=(before-f.car.speed)/dt;
  if(i===59){laterDeceleration=(before-f.car.speed)/dt;assert.ok(f.car.speed>17);}
  assert.equal(f.car.rollover,false);
  if(f.car.speed<.15){stopTime=(i+1)*dt;break;}
 }
 const distance=startZ-f.car.z;
 assert.ok(firstDeceleration<3&&laterDeceleration>firstDeceleration+1);
 assert.ok(stopTime>4.5&&stopTime<6,`stop time ${stopTime}`);
 assert.ok(distance>42&&distance<60,`stopping distance ${distance}`);
 f.physics.dispose();
});
test('braking slows more than coasting and takes priority over throttle and nitro',()=>{
 const coast=fixture(()=>0,250),brake=fixture(()=>0,250),both=fixture(()=>0,250);
 for(const f of [coast,brake,both])prepareCruise(f,20);
 step(coast,{},240);step(brake,{brake:true},240);step(both,{throttle:1,brake:true,boost:true},240);
 assert.ok(coast.car.speed>brake.car.speed+3);
 assert.ok(Math.abs(brake.car.speed-both.car.speed)<1e-6);
 assert.ok(Math.abs(brake.car.z-both.car.z)<1e-6);
 for(const f of [coast,brake,both])f.physics.dispose();
});
test('reverse waits until the truck stops, then engages smoothly after a short hold',()=>{
 const f=fixture(()=>0,250);prepareCruise(f,12);
 let stoppedAt=null,reversedAt=null;
 for(let i=0;i<120*8;i++){
  step(f,{brake:true});
  if(stoppedAt===null&&Math.abs(f.car.speed)<.15)stoppedAt=i*dt;
  if(f.car.powertrain.gear<0){reversedAt=i*dt;break;}
 }
 assert.ok(stoppedAt!==null&&reversedAt-stoppedAt>.3&&reversedAt-stoppedAt<.6);
 assert.ok(Math.abs(f.car.speed)<.3,'reverse must engage without an immediate launch');
 step(f,{brake:true},120);assert.ok(f.car.speed< -1);
 f.physics.dispose();
});
test('releasing the brake bleeds pressure and permits acceleration again',()=>{
 const f=fixture(()=>0,250);prepareCruise(f,20);step(f,{brake:true},60);
 const pressure=f.car.physics.controls.brakePressure,speed=f.car.speed;
 step(f,{throttle:1},120);
 assert.ok(f.car.physics.controls.brakePressure<pressure*.01);assert.ok(f.car.speed>speed);
 f.physics.dispose();
});

test('keyboard full lock makes a low-speed U-turn within the road width in both directions',()=>{
 for(const steer of [-1,1]){
  const f=fixture(()=>0,60);step(f,{},180);
  let yaw=0,previous=f.car.heading,minX=0,maxX=0;
  try{
   for(let i=0;i<120*15&&Math.abs(yaw)<Math.PI;i++){
    step(f,{steer,throttle:f.car.speed<4?.45:0});
    const delta=Math.atan2(Math.sin(f.car.heading-previous),Math.cos(f.car.heading-previous));yaw+=delta;previous=f.car.heading;
    minX=Math.min(minX,f.car.x);maxX=Math.max(maxX,f.car.x);
    assert.equal(f.car.rollover,false);
   }
   assert.ok(Math.abs(yaw)>=Math.PI,`U-turn yaw ${yaw}`);
   assert.ok(maxX-minX+3.2<15.5,`turning envelope ${maxX-minX+3.2}`);
   assert.equal(Math.sign(yaw),steer);
  }finally{f.physics.dispose();}
 }
});

test('held steering persists at the wheel contacts after release and centers on command or recovery',()=>{
 const f=fixture(()=>0,60);step(f,{},180);
 try{
  step(f,{steer:1,steeringMode:'hold'},36);
  const controller=f.car.physics.controller,angle=f.car.physics.steer,inside=controller.wheelSteering(0),outside=controller.wheelSteering(2),heading=f.car.heading;
  assert.ok(angle>.2&&angle<.22);
  step(f,{steeringMode:'hold',throttle:.4},240);
  assert.equal(f.car.physics.steer,angle);
  assert.equal(controller.wheelSteering(0),inside);assert.equal(controller.wheelSteering(2),outside);
  assert.ok(Math.abs(f.car.heading-heading)>.1,'truck keeps turning after the arrow is released');
  step(f,{steeringMode:'hold',centerSteering:true});
  assert.equal(f.car.physics.steer,0);assert.equal(controller.wheelSteering(0),0);assert.equal(controller.wheelSteering(2),0);
  step(f,{steeringMode:'hold',steer:-1},36);assert.ok(f.car.physics.steer<-.2);
  f.physics.reset(f.car);assert.equal(f.car.physics.steer,0);
 }finally{f.physics.dispose();}
});

for(const kind of ['cone','tires'])test(`Bronco pushes through ${kind} and the displaced barriers reset for the next race`,()=>{
 const f=fixture(()=>0,60);step(f,{},180);
 const props=[-2.1,-.7,.7,2.1].map(x=>f.physics.addBarrier(x,0,-6,{kind,layers:3}));
 let maxShift=0;
 try{
  assert.ok(props.every(body=>body.isSleeping()));
  for(let i=0;i<120*4;i++){
   step(f,{throttle:.5});
   for(const stack of props)for(const body of stack.tireBodies??[stack])maxShift=Math.max(maxShift,Math.abs(body.translation().z+6));
   assert.equal(f.car.rollover,false);
  }
  assert.ok(f.car.z<-15,`truck must get past props: ${f.car.z}`);
  assert.ok(maxShift>1,`props must visibly move: ${maxShift}`);
  assert.ok(props.every(body=>body.mass()<35),'props must be much lighter than a Bronco');
  f.physics.resetBarriers();
  props.forEach((body,i)=>{const p=body.translation();assert.ok(Math.abs(p.x-[-2.1,-.7,.7,2.1][i])<1e-5&&Math.abs(p.z+6)<1e-5);assert.equal(body.isSleeping(),true);});
 }finally{f.physics.dispose();}
});

test('distant markers remain inactive until a truck approaches',()=>{
 const f=fixture(()=>0,100),prop=f.physics.addBarrier(50,0,0,{kind:'cone'});
 try{
  step(f,{},120);assert.equal(prop.isEnabled(),false);
  f.car.x=45;f.car.z=0;f.physics.reset(f.car);step(f);
  assert.equal(prop.isEnabled(),true);
  f.physics.resetBarriers();assert.equal(prop.isEnabled(),false);
 }finally{f.physics.dispose();}
});

test('loose tire stacks scatter without launching a Bronco at cruising speed',()=>{
 for(const style of ['classic','ranger']){
  const f=fixture(()=>0,100,{style});step(f,{},240);
  const stacks=[-2.1,-.7,.7,2.1].map(x=>f.physics.addBarrier(x,0,-8,{kind:'tires',layers:3}));
  f.car.physics.body.setLinvel({x:0,y:0,z:-16},true);f.physics.sync(f.car,0);
  let peak=0,flight=0;
  try{
   for(const stack of stacks){assert.equal(stack.tireBodies.length,3);for(const tire of stack.tireBodies)assert.ok(Math.abs(tire.mass()-10)<.001);}
   for(let i=0;i<360;i++){step(f);peak=Math.max(peak,f.car.height);if(f.car.airborne)flight+=dt;assert.equal(f.car.rollover,false);}
   assert.ok(f.car.z<-15,'truck passes through the stack');
   assert.ok(peak<.25,`unwanted launch height ${peak}`);assert.ok(flight<.1,`unwanted flight ${flight}`);
  }finally{f.physics.dispose();}
 }
});
test('suspension absorbs a two-meter flat landing without a second jump',()=>{
 const f=fixture();step(f,{},240);const resting=f.car.height;
 f.car.physics.body.setTranslation({x:0,y:3.5,z:0},true);f.physics.sync(f.car,0);
 let touched=false,rebound=0,secondFlight=0;
 try{
  for(let i=0;i<480;i++){
   step(f);if(!f.car.airborne)touched=true;
   if(touched){rebound=Math.max(rebound,f.car.height-resting);if(f.car.airborne)secondFlight+=dt;}
  }
  assert.equal(touched,true);assert.ok(rebound<.03,`rebound ${rebound}`);assert.equal(secondFlight,0);
 }finally{f.physics.dispose();}
});
test('small rolling bumps keep the tires in contact instead of producing repeated hops',()=>{
 const f=fixture((x,z)=>.14*Math.sin(z*Math.PI*2/8),100);step(f,{},240);
 f.car.physics.body.setLinvel({x:0,y:0,z:-9},true);f.physics.sync(f.car,0);
 let air=0;
 try{
  for(let i=0;i<600;i++){step(f,{throttle:f.car.speed<9?.35:0});if(f.car.airborne)air++;assert.equal(f.car.rollover,false);}
  assert.equal(air,0);
 }finally{f.physics.dispose();}
});

test('loaded Bronco mass is shared by the rigid body and drivetrain and resists vertical impulses',()=>{
 for(const [style,mass] of [['classic',2250],['ranger',2750]]){
  const f=fixture(()=>0,20,{style,engineId:'302'});step(f,{},240);
  try{
   assert.equal(vehicleMass(style,'302'),mass);assert.ok(Math.abs(f.car.physics.body.mass()-mass)<.01);
   assert.ok(f.car.physics.body.localCom().y<-.47);
   f.car.physics.body.setLinvel({x:0,y:0,z:0},true);f.car.physics.body.applyImpulse({x:0,y:3300,z:0},true);
   assert.ok(Math.abs(f.car.physics.body.linvel().y-3300/mass)<.001);
   assert.ok(f.car.physics.body.linvel().y<1.5,'same hit must lift a loaded truck less than the previous light calibration');
  }finally{f.physics.dispose();}
 }
});
