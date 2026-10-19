import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDesert,desertHeight,DESERT_SPAWN} from '../src/desert.js';
import {initPhysics,createPhysics} from '../src/physics.js';
const ground=buildDesert();
test('desert has a full 600 m square contact mesh and varied dunes with a calm spawn',()=>{
 assert.equal(ground.positions.length,241*241*3);assert.equal(ground.indices.length,240*240*6);
 assert.equal(desertHeight(DESERT_SPAWN.x,DESERT_SPAWN.z),1);
 let min=Infinity,max=-Infinity;for(let z=-250;z<=250;z+=10)for(let x=-250;x<=250;x+=10){const h=ground.heightAt(x,z);assert.ok(Number.isFinite(h)&&h>=1);min=Math.min(min,h);max=Math.max(max,h);}
 assert.ok(max-min>6);assert.ok(ground.heightAt(299,0)>ground.heightAt(260,0)+8);
});
test('triangle sampler agrees with every sampled desert mesh vertex',()=>{
 for(let i=0;i<ground.positions.length;i+=997*3){const [x,y,z]=ground.positions.slice(i,i+3);assert.ok(Math.abs(ground.heightAt(x,z)-y)<.0001);}
});
test('single truck settles and drives over desert using the rendered contact surface',async()=>{
 await initPhysics();const physics=createPhysics(ground,ground.bounds),car={...DESERT_SPAWN,style:'classic',engineId:'302',speed:0};physics.reset(car);
 let contacts=0,airtime=0;for(let i=0;i<1800;i++){
  physics.input(car,{throttle:i>240?1:0,steer:0,onDirt:true},1/120);physics.step();physics.sync(car,1/120);
  if(i===240){contacts=[0,1,2,3].filter(j=>car.physics.controller.wheelIsInContact(j)).length;assert.ok(Math.abs(car.height-ground.heightAt(car.x,car.z))<.15);}
  if(i>240&&car.airborne)airtime++;assert.ok(Number.isFinite(car.x)&&Number.isFinite(car.height));
 }
 assert.equal(contacts,4);assert.ok(car.z<DESERT_SPAWN.z-50);assert.ok(airtime>0,'dune crests produce real airtime');assert.equal(physics.getStats().bodies,1);physics.dispose();
});
