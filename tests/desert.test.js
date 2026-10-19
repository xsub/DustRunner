import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDesert,desertHeight,DESERT_SPAWN,DESERT_BOUNDS} from '../src/desert.js';
import {initPhysics,createPhysics} from '../src/physics.js';
const ground=buildDesert();
test('desert has a full 1200 × 600 m rectangular contact mesh and varied dunes with a calm spawn',()=>{
 assert.equal(ground.positions.length,481*241*3);assert.equal(ground.indices.length,480*240*6);
 assert.equal(desertHeight(DESERT_SPAWN.x,DESERT_SPAWN.z),1);
 let min=Infinity,max=-Infinity;for(let z=-250;z<=250;z+=10)for(let x=-550;x<=550;x+=10){const h=ground.heightAt(x,z);assert.ok(Number.isFinite(h)&&h>=1);min=Math.min(min,h);max=Math.max(max,h);}
 assert.ok(max-min>20);assert.deepEqual(ground.bounds,DESERT_BOUNDS);assert.ok(ground.heightAt(599,0)>ground.heightAt(560,0)+10);assert.ok(ground.heightAt(0,299)>ground.heightAt(0,260)+10);
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

test('dune districts have distinct, non-repeating heights and traversable slopes',()=>{
 const signatures=[];
 for(const center of [-400,0,400]){
  const heights=[];let maxSlope=0;
  for(let z=-180;z<=180;z+=12)for(let x=center-90;x<=center+90;x+=12){const h=ground.heightAt(x,z);heights.push(h);maxSlope=Math.max(maxSlope,Math.abs(ground.heightAt(x+2.5,z)-h)/2.5);}
  const low=Math.min(...heights),high=Math.max(...heights);assert.ok(high-low>10,'both basins and tall dunes per district');assert.ok(maxSlope<2,'no vertical mesh cliffs');signatures.push(heights.map(h=>Math.round(h)).join(','));
 }
 assert.equal(new Set(signatures).size,3);
});
