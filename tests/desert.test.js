import test from 'node:test';
import {setTuning,DEFAULT_TUNING} from '../src/tuning.js';
import assert from 'node:assert/strict';
import {buildDesert,desertHeight,DESERT_SPAWN,DESERT_BOUNDS,DESERT_VARIANTS,createDesertHeight,normalizeDesertOptions} from '../src/desert.js';
import {jumpCoordinates,jumpEnd} from '../src/desert-jumps.js';
import {initPhysics,createPhysics} from '../src/physics.js';
const ground=buildDesert();
test('desert has a full 2400 × 1200 m rectangular contact mesh and varied dunes with a calm spawn',()=>{
 assert.equal(ground.coarseVertexCount,961*481);assert.equal(ground.coarseTriangleCount,960*480*2);assert.ok(ground.indices.length/3<1300000);
 assert.equal(desertHeight(DESERT_SPAWN.x,DESERT_SPAWN.z),1);
 let min=Infinity,max=-Infinity;for(let z=-250;z<=250;z+=10)for(let x=-550;x<=550;x+=10){const h=ground.heightAt(x,z);assert.ok(Number.isFinite(h)&&h>=1);min=Math.min(min,h);max=Math.max(max,h);}
 assert.ok(max-min>20);assert.deepEqual(ground.bounds,DESERT_BOUNDS);assert.ok(ground.heightAt(1199,0)>18);assert.ok(ground.heightAt(0,599)>18);
});
test('triangle sampler agrees with every sampled desert mesh vertex',()=>{
 for(let i=0;i<ground.positions.length;i+=997*3){const [x,y,z]=ground.positions.slice(i,i+3);assert.ok(Math.abs(ground.heightAt(x,z)-y)<.0001);}
});
for(const gravity of [9.81,20])test(`single truck settles and drives over desert at gravity ${gravity} using the rendered contact surface`,async()=>{
 setTuning({...DEFAULT_TUNING,gravity});
 await initPhysics();const physics=createPhysics(ground,ground.bounds),car={...DESERT_SPAWN,style:'classic',engineId:'302',driveMode:gravity===20?'lo':'auto',speed:0};physics.reset(car);
 try{
  let contacts=0,airtime=0;for(let i=0;i<1800;i++){
   physics.input(car,{throttle:i>240?1:0,steer:0,onDirt:true},1/120);physics.step();physics.sync(car,1/120);
   if(i===240){contacts=[0,1,2,3].filter(j=>car.physics.controller.wheelIsInContact(j)).length;assert.ok(Math.abs(car.height-ground.heightAt(car.x,car.z))<.15);}
   if(i>240&&car.airborne)airtime++;assert.ok(Number.isFinite(car.x)&&Number.isFinite(car.height));
  }
  assert.equal(contacts,4);
  // With the real C4 ratios, doubled gravity needs LO on the steep spawn dune.
  assert.ok(car.z<DESERT_SPAWN.z-(gravity===20?10:50));
  if(gravity===9.81)assert.ok(airtime>0,'dune crests produce real airtime');
  assert.equal(car.rollover,false);assert.equal(physics.getStats().bodies,1);
 }finally{physics.dispose();setTuning(DEFAULT_TUNING);}
});

test('dune districts have distinct, non-repeating heights and traversable slopes',()=>{
 const signatures=[];
 for(const center of [-400,0,400]){
  const heights=[];let maxSlope=0;
  for(let z=-180;z<=180;z+=12)for(let x=center-90;x<=center+90;x+=12){if([...ground.jumps,...ground.rockRamps].some(j=>{const p=jumpCoordinates(j,x,z);return p.s> -5&&p.s<jumpEnd(j)+5&&Math.abs(p.side)<j.halfWidth+j.edgeWidth+8;}))continue;const h=ground.heightAt(x,z);heights.push(h);maxSlope=Math.max(maxSlope,Math.abs(ground.heightAt(x+2.5,z)-h)/2.5);}
  const low=Math.min(...heights),high=Math.max(...heights);assert.ok(high-low>3,'varied medium dunes instead of giant walls in every district');assert.ok(maxSlope<2,'no vertical mesh cliffs');signatures.push(heights.map(h=>Math.round(h)).join(','));
 }
 assert.equal(new Set(signatures).size,3);
});

test('desert variants remain distinct and reproducible with moderate central terrain',()=>{
 const signatures=[];
 for(const variant of DESERT_VARIANTS.filter(v=>!v.hard)){
  const sample=createDesertHeight({variant:variant.id}),repeat=createDesertHeight({variant:variant.id});let peak=0,low=Infinity;const signature=[];
  for(let z=-200;z<=200;z+=20)for(let x=-520;x<=520;x+=20){const h=sample(x,z);assert.equal(h,repeat(x,z));peak=Math.max(peak,h);low=Math.min(low,h);signature.push(h.toFixed(2));}
  assert.ok(peak-low>5&&peak-low<30,`${variant.id}: ${peak-low} meters of elevation`);assert.equal(sample(DESERT_SPAWN.x,DESERT_SPAWN.z),1);signatures.push(signature.join(','));
 }
 assert.equal(new Set(signatures).size,DESERT_VARIANTS.filter(v=>!v.hard).length);
 const a=createDesertHeight({variant:'random',seed:123}),b=createDesertHeight({variant:'random',seed:456});assert.notDeepEqual([-900,300,850].map(x=>a(x,-400)),[-900,300,850].map(x=>b(x,-400)));assert.equal(a(100,50),createDesertHeight({variant:'random',seed:123})(100,50));
 assert.equal(normalizeDesertOptions({variant:'random',seed:0}).seed,0);assert.equal(normalizeDesertOptions({variant:'random',seed:-1}).seed,43210);
});

for(const variant of ['stars','random'])test(`${variant}: generated mesh supports four wheels and a physical drive`,async()=>{
 await initPhysics();const terrain=buildDesert({variant,seed:20261020}),physics=createPhysics(terrain,terrain.bounds),car={...DESERT_SPAWN,style:'classic',engineId:'302',speed:0};physics.reset(car);
 try{
  for(let frame=0;frame<1800;frame++){
   physics.input(car,{throttle:frame>240?1:0,steer:0,onDirt:true},1/120);physics.step();physics.sync(car,1/120);
   if(frame===240)assert.equal([0,1,2,3].filter(i=>car.physics.controller.wheelIsInContact(i)).length,4);
   assert.ok(Number.isFinite(car.height)&&car.height>-.25);
  }
  assert.ok(Math.hypot(car.x-DESERT_SPAWN.x,car.z-DESERT_SPAWN.z)>40);
  for(let i=0;i<terrain.positions.length;i+=619*3){const [x,y,z]=terrain.positions.slice(i,i+3);assert.ok(Math.abs(terrain.heightAt(x,z)-y)<.001);}
 }finally{physics.dispose();}
});

test('expanded outer quadrants contain varied dunes and the exact rendered contact surface',()=>{
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const heights=[];for(let x=750;x<=1100;x+=25)for(let z=350;z<=500;z+=25){const h=ground.heightAt(sx*x,sz*z);assert.ok(Number.isFinite(h)&&h>=1);heights.push(h);}
  assert.ok(Math.max(...heights)-Math.min(...heights)>2,'new area must contain dunes rather than empty padding');
 }
 assert.equal(DESERT_BOUNDS.max.x-DESERT_BOUNDS.min.x,2400);assert.equal(DESERT_BOUNDS.max.z-DESERT_BOUNDS.min.z,1200);
 assert.equal(ground.coarseTriangleCount,921600,'preserve 2.5 m background detail over four times the area');assert.ok(ground.refinedCells>0,'narrow ramps receive local 0.5 m contact detail');
});

test('the added eastern territory supports a real vehicle far outside the old bounds',async()=>{
 await initPhysics();let spot=null;
 for(let z=380;z<=500&&!spot;z+=5)for(let x=850;x<=1100;x+=5){const h=ground.heightAt(x,z),around=[ground.heightAt(x-3,z),ground.heightAt(x+3,z),ground.heightAt(x,z-3),ground.heightAt(x,z+3)];if(around.every(y=>Math.abs(y-h)<.35)){spot={x,z};break;}}
 assert.ok(spot,'find a locally calm part of the new dune field');
 const physics=createPhysics(ground,ground.bounds),car={...spot,style:'classic',engineId:'302',speed:0,heading:0};physics.reset(car);
 try{
  for(let i=0;i<300;i++){physics.input(car,{throttle:0,handbrake:true,onDirt:true},1/120);physics.step();physics.sync(car,1/120);}
  assert.equal([0,1,2,3].filter(i=>car.physics.controller.wheelIsInContact(i)).length,4);assert.equal(car.rollover,false);
  assert.ok(Math.abs(car.height-ground.heightAt(car.x,car.z))<.2);
 }finally{physics.dispose();}
});
