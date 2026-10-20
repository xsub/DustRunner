import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {findRecoverySpot,recoveryFootprint} from '../src/recovery.js';
import {buildDesert,DESERT_SPAWN} from '../src/desert.js';
import {initPhysics,createPhysics} from '../src/physics.js';
before(initPhysics);
test('recovery rejects a hidden mound under the chassis even if the center is flat',()=>{
 const h=(x,z)=>Math.abs(x-1)<.2&&Math.abs(z-1)<.2?3:0;
 assert.equal(h(0,0),0);assert.equal(recoveryFootprint(h,0,0,0).safe,false);
 const spot=findRecoverySpot({x:0,z:0,heading:0,heightAt:h});assert.equal(spot.safe,true);assert.ok(Math.hypot(spot.x,spot.z)>=6);
});
test('recovery keeps a flat current position, respects bounds and uses a known flat fallback',()=>{
 const flat=findRecoverySpot({x:4,z:5,heading:.7,heightAt:()=>2});assert.equal(flat.x,4);assert.equal(flat.z,5);assert.equal(flat.heading,.7);assert.equal(flat.height,2);
 const bounds={min:{x:-10,z:-10},max:{x:10,z:10}},spot=findRecoverySpot({x:9,z:9,heading:0,heightAt:()=>0,bounds});
 assert.ok(spot.x<=5&&spot.z<=5&&spot.x>=-5&&spot.z>=-5);
 const h=(x,z)=>x>900?0:Math.sin(x*2)*3+Math.cos(z*2)*3;
 const fallback=findRecoverySpot({x:0,z:0,heading:0,heightAt:h,fallback:{x:1000,z:0,heading:1}});
 assert.equal(fallback.x,1000);assert.equal(fallback.safe,true);
});
test('course recovery skips a steep ramp and uses the next flat course candidate',()=>{
 const spot=findRecoverySpot({x:0,z:0,heading:0,heightAt:(x,z)=>x<10?z:0,candidates:[{x:0,z:0,index:1},{x:20,z:0,index:2,heading:Math.PI}]});
 assert.equal(spot.index,2);assert.equal(spot.heading,Math.PI);assert.equal(spot.safe,true);
});
for(const variant of ['ridges','stars','random'])test(`${variant}: recovery finds a flat dune patch and the real truck settles upright`,()=>{
 const terrain=buildDesert({variant,seed:20261020}),heading=.6;
 let origin;
 for(let z=-160;z<=160&&!origin;z+=40)for(let x=-400;x<=400;x+=40){if(!recoveryFootprint(terrain.heightAt,x,z,heading).safe){origin={x,z};break;}}
 assert.ok(origin);
 const spot=findRecoverySpot({...origin,heading,heightAt:terrain.heightAt,bounds:terrain.bounds,fallback:DESERT_SPAWN});
 assert.equal(spot.safe,true);assert.ok(Math.hypot(spot.x-origin.x,spot.z-origin.z)>1);
 const physics=createPhysics(terrain,terrain.bounds),car={x:spot.x,z:spot.z,heading:spot.heading,speed:0,style:'crawler',engineId:'302'};
 try{
  physics.reset(car,{groundHeight:spot.height});
  assert.ok(physics.world.gravity.y===-20);
  for(let i=0;i<360;i++){physics.input(car,{throttle:0,steer:0,onDirt:true},1/120);physics.step();physics.sync(car,1/120);}
  assert.equal(car.rollover,false);assert.equal(car.airborne,false);assert.ok(Math.abs(car.speed)<1);
  assert.ok(Math.abs(car.height-terrain.heightAt(car.x,car.z))<.25);
 }finally{physics.dispose();}
});
