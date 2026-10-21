import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {initPhysics,createPhysics} from '../src/physics.js';
import {BRONCO_STYLES} from '../src/vehicle.js';
import {vehicleProfile} from '../src/vehicle-models.js';
import {defaultEngine} from '../src/engines.js';
import {swapEngine} from '../src/powertrain.js';
before(initPhysics);
test('live model replacement preserves motion and race state, rebuilds wheels, and releases old bodies',()=>{
 const ground={positions:new Float32Array([-500,0,-500,500,0,-500,-500,0,500,500,0,500]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
 const p=createPhysics(ground,{min:{x:-500,z:-500},max:{x:500,z:500}}),car={style:'classic',engineId:'302',x:30,z:42,heading:.4,speed:20,lap:2,index:101,checkpoint:4,nitro:63,airborne:true,transmissionMode:'automatic'};
 try{
  p.reset(car);car.physics.body.setTranslation({x:30,y:8,z:42},true);car.physics.body.setLinvel({x:3,y:2,z:-20},true);car.physics.body.setAngvel({x:.1,y:.2,z:.3},true);
  const rotation={...car.physics.body.rotation()},velocity={...car.physics.body.linvel()},angular={...car.physics.body.angvel()};
  for(const style of [...Object.keys(BRONCO_STYLES),'classic']){
   car.style=style;p.replaceVehicle(car);swapEngine(car,defaultEngine(style));
   assert.deepEqual({...car.physics.body.linvel()},velocity);assert.deepEqual({...car.physics.body.angvel()},angular);assert.deepEqual({...car.physics.body.rotation()},rotation);
   assert.equal(car.physics.body.translation().x,30);assert.equal(car.physics.body.translation().z,42);assert.equal(car.physics.body.translation().y,8);
   assert.deepEqual([car.lap,car.index,car.checkpoint,car.nitro,car.speed,car.airborne],[2,101,4,63,20,true]);
   assert.equal(car.physics.profile.wheelScale,vehicleProfile(style).wheelScale);assert.equal(p.getStats().bodies,1);assert.equal(p.world.bodies.len(),1);
  }
  car.airborne=false;const y=car.physics.body.translation().y;car.style='monster80';p.replaceVehicle(car);car.style='classic';p.replaceVehicle(car);assert.ok(Math.abs(car.physics.body.translation().y-y)<1e-5,'cycling larger wheels and back must not ratchet height');
  p.input(car,{throttle:1,onDirt:true},1/120);p.step();p.sync(car,1/120);assert.ok(Number.isFinite(car.speed));
 }finally{p.dispose();}
});
