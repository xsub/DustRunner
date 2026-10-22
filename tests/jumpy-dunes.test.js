import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {createJumpyDunes} from '../src/jumpy-dunes.js';
import {buildDesert,normalizeDesertOptions} from '../src/desert.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {jumpPoint} from '../src/desert-jumps.js';
import {desertInvitation} from '../src/desert-share.js';
before(initPhysics);
test('Jumpy Dunes packs varied wheel-to-car-sized dunes into each board view and shares its seed',()=>{
 const field=createJumpyDunes(20261022),repeat=createJumpyDunes(20261022),other=createJumpyDunes(17);
 assert.ok(Math.min(...field.dunes.map(d=>d.height))<1);assert.ok(Math.max(...field.dunes.map(d=>d.height))>7.5);
 const tall=field.dunes.filter(d=>Math.abs(d.x)<45&&Math.abs(d.z)<45&&d.height>2.5);assert.ok(tall.length>=6&&tall.length<=9,`${tall.length} substantial dunes in a 90 m board window`);
 for(const [x,z] of [[0,0],[50,60],[-80,70]])assert.equal(field.heightAt(x,z),repeat.heightAt(x,z));
 for(const seed of [0,17,123456,4294967295]){const h=createJumpyDunes(seed).heightAt;for(let z=-500;z<=180;z+=2.5)assert.equal(h(0,z),field.heightAt(0,z),'every seed preserves the calibrated entry rhythm');}
 assert.notEqual(field.heightAt(30,150),other.heightAt(30,150));assert.equal(field.heightAt(0,210),1);
 const url=new URL(desertInvitation({variant:'jumpy',seed:17}).url);assert.deepEqual(normalizeDesertOptions({variant:url.searchParams.get('dunes'),seed:url.searchParams.get('seed')}),{variant:'jumpy',seed:17});
});
for(const seed of [20261022,17,123456])for(const engineId of ['170','302'])test(`Jumpy Dunes seed ${seed}: ${engineId} links real jumps without overturning`,()=>{
 const ground=buildDesert({variant:'jumpy',seed}),p=createPhysics(ground,ground.bounds),car={x:0,z:210,heading:0,style:'classic',engineId,speed:0,driveMode:'auto',transmissionMode:'automatic'};p.reset(car);
 let flight=0,jumps=0,maxFlight=0;
 try{
  for(let i=0;i<120*35;i++){
   p.input(car,{throttle:i>240?1:0,steer:0,onDirt:true},1/120);p.step();p.sync(car,1/120);
   if(car.airborne&&210-car.z>20)flight+=1/120;
   else if(flight){if(flight>.25)jumps++;maxFlight=Math.max(maxFlight,flight);flight=0;}
   assert.equal(car.rollover,false);if(210-car.z>450)break;
  }
  assert.ok(jumps>=6,`${jumps} completed jumps`);assert.ok(maxFlight>.4);assert.ok(210-car.z>300,'keep driving through the field');
 }finally{p.dispose();}
});
test('refined ramp geometry keeps exact contact sampling, no seam holes and compact jump dimensions',()=>{
 const g=buildDesert(),ramps=[...g.jumps,...g.rockRamps];
 assert.ok(g.indices.length/3<1150000,'local detail stays below a 25% triangle increase');
 for(const r of ramps){
  assert.ok(r.halfWidth*2>=4&&r.halfWidth*2<=6);assert.ok(r.gap/5.08>=3&&r.gap/5.08<=5);assert.ok(r.height>=5.4);
  for(let s=0;s<=r.runup+r.gap+r.landing;s+=.5){const p=jumpPoint(r,s);assert.ok(g.heightAt(p.x,p.z)>=.99,'no -0.25 holes at exact grid boundaries');}
  const lip=jumpPoint(r,r.runup);assert.ok(Math.abs(g.heightAt(lip.x,lip.z)-1-r.height)<.35,'half-metre mesh preserves the narrow lip');
 }
 for(let i=g.coarseVertexCount*3;i<g.positions.length;i+=57){const [x,y,z]=g.positions.slice(i,i+3);assert.ok(Math.abs(g.heightAt(x,z)-y)<.001);}
});
