import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {IcosahedronGeometry} from 'three';
import {initPhysics,createPhysics} from '../src/physics.js';
import {BRONCO_STYLES} from '../src/vehicle.js';
import {defaultEngine} from '../src/engines.js';
import {vehicleMass,vehicleMassProperties} from '../src/vehicle-mass.js';
import {vehicleProfile} from '../src/vehicle-models.js';
import {VEHICLE_DYNAMICS} from '../src/vehicle-dynamics.js';
before(initPhysics);
const dt=1/120;
const ground=()=>({positions:new Float32Array([-100,0,-100,100,0,-100,-100,0,100,100,0,100]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0});
function fixture(style){const p=createPhysics(ground(),{min:{x:-100,z:-100},max:{x:100,z:100}}),car={style,engineId:defaultEngine(style),x:0,z:0,speed:0,heading:0};p.reset(car);return {p,car};}
function step({p,car},input={}){p.input(car,{throttle:0,onDirt:true,...input},dt);p.step();p.sync(car,dt);}
test('every selectable model has an explicit mass; engine swaps replace only engine weight',()=>{
 assert.deepEqual(Object.keys(VEHICLE_DYNAMICS).sort(),Object.keys(BRONCO_STYLES).sort());
 for(const style of Object.keys(BRONCO_STYLES)){
  const light=vehicleMassProperties(style,'302'),heavy=vehicleMassProperties(style,'godzilla73');
  assert.equal(heavy.mass-light.mass,heavy.engineMass-light.engineMass);
  assert.ok(light.centerOfMass.y<-.4,style);for(const value of Object.values(light.principalAngularInertia))assert.ok(value>0&&Number.isFinite(value),style);
 }
 for(const [style,mass] of [['highroller78',3450],['turf78',4100],['monster80',4800],['midnight80',3600]])assert.equal(vehicleMass(style,defaultEngine(style)),mass);
 assert.ok(vehicleMassProperties('monster80','godzilla73').centerOfMass.y<-1.3);
});
test('big-wheel builds traverse three pairs of real faceted rocks through suspension without repeated launches',()=>{
 const geometry=new IcosahedronGeometry(1,0),a=geometry.attributes.position;
 try{for(const style of ['classic','highroller78','turf78','monster80','midnight80']){
  const f=fixture(style),vertices=[];
  try{
   for(const z of [-12,-20,-28])for(const side of [-1,1])for(let i=0;i<a.count;i++)vertices.push(a.getX(i)*.8+side*1.4*vehicleProfile(style).track,a.getY(i)*.42+.28,a.getZ(i)*.8+z);
   f.p.addRocks(new Float32Array(vertices));for(let i=0;i<360;i++)step(f);
   const resting=f.car.height;let airborne=0,peak=0;
   for(let i=0;i<1200;i++){step(f,{throttle:f.car.speed<6?.45:0});airborne+=Number(f.car.airborne);peak=Math.max(peak,f.car.height-resting);assert.equal(f.car.rollover,false,style);}
   assert.ok(f.car.z<-35,`${style}: blocked at ${f.car.z}`);assert.equal(airborne,0,style);assert.ok(peak<.4,`${style}: ${peak}`);
   assert.ok(Math.abs(f.car.physics.body.mass()-vehicleMass(style,f.car.engineId))<.01);
  }finally{f.p.dispose();}
 }}finally{geometry.dispose();}
});
test('tire safety contacts activate on the side and tall obstacles still stop an upright truck',()=>{
 const f=fixture('monster80');try{
  step(f);assert.ok(f.car.physics.tireColliders.every(c=>(c.collisionGroups()&0xffff)===4));
  f.car.physics.body.setRotation({x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2},true);f.p.sync(f.car,0);assert.ok(f.car.physics.tireColliders.every(c=>(c.collisionGroups()&0xffff)===0xffff));
  f.p.reset(f.car);f.p.addBoundary(0,-12,20,.5,5);
  for(let i=0;i<1200;i++)step(f,{throttle:.6});assert.ok(f.car.z>-12,'solid obstacle must remain an obstacle');
 }finally{f.p.dispose();}
});
test('heavy lifted trucks absorb a two-meter landing without a second bounce',()=>{
 for(const style of ['highroller78','turf78','monster80','midnight80']){
  const f=fixture(style);try{
   for(let i=0;i<360;i++)step(f);const rest=f.car.physics.body.translation().y;
   f.car.physics.body.setTranslation({x:0,y:rest+2,z:0},true);f.car.physics.body.setLinvel({x:0,y:0,z:0},true);f.p.sync(f.car,0);
   let landed=false,secondFlight=0,minimum=Infinity,rebound=0;
   for(let i=0;i<600;i++){step(f);if(!f.car.airborne)landed=true;if(landed){minimum=Math.min(minimum,f.car.physics.body.translation().y);if(i>240)rebound=Math.max(rebound,f.car.physics.body.translation().y-rest);secondFlight+=Number(f.car.airborne);}}
   assert.ok(landed,style);assert.equal(secondFlight,0,style);assert.ok(rebound<.06,`${style}: ${rebound}`);assert.ok(minimum>rest-.55,`${style}: compression ${rest-minimum}`);
  }finally{f.p.dispose();}
 }
});
