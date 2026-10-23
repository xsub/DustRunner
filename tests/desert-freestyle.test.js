import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {buildDesert} from '../src/desert.js';
import {desertFreestyle,pyramidHeight} from '../src/desert-freestyle.js';
import {jumpPoint,jumpCoordinates,jumpEnd,jumpSurface} from '../src/desert-jumps.js';
import {initPhysics,createPhysics} from '../src/physics.js';
before(initPhysics);
const ground=buildDesert();
test('unpaired sand ramps have matching front and rear banks without a back wall',()=>{
 for(const jump of ground.jumps.filter(j=>!j.paired)){
  assert.equal(jumpEnd(jump),jump.runup*2);
  for(const t of [0,.1,.25,.5,.9,1])assert.ok(Math.abs(jumpSurface(jump,jump.runup*t)-jumpSurface(jump,jump.runup*(2-t)))<1e-9);
 }
});
test('scenery corridors cover return and cross approaches',()=>{
 for(const jump of ground.rockRamps){
  for(const point of [jumpPoint(jump,jumpEnd(jump)+240),...[-1,1].map(sign=>jumpPoint(jump,jump.runup*(jump.id==='rock-1'?.8:.85),sign*(jump.halfWidth+jump.edgeWidth+100)))])
   assert.ok(ground.protectedAreas.some(p=>Math.hypot(p.x-point.x,p.z-point.z)<8));
 }
});
test('the four-way pyramid has equal banks, a flat cap and smooth ground entries',()=>{
 const p=ground.freestyle.pyramids[0];assert.equal(pyramidHeight(p,p.x,p.z),p.height);
 for(const r of [0,1,4,8,12,16,20])for(const [dx,dz] of [[r,0],[-r,0],[0,r],[0,-r]])assert.equal(pyramidHeight(p,p.x+dx,p.z+dz),pyramidHeight(p,p.x+r,p.z));
 const edge=p.top+p.bank;assert.ok(pyramidHeight(p,p.x+edge-.1,p.z)<.001);
 assert.ok(Math.abs(ground.heightAt(p.x,p.z)-1-p.height)<.001);
});
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2])test(`stock 302 jumps the pyramid from heading ${heading}`,()=>{
 const o=ground.freestyle.pyramids[0],p=createPhysics(ground,ground.bounds),car={x:o.x+Math.sin(heading)*65,z:o.z+Math.cos(heading)*65,heading,style:'classic',engineId:'302',speed:0,driveMode:'auto',transmissionMode:'automatic'};p.reset(car);
 let time=0,best=0,landed=false,progress=-65;
 try{
  for(let i=0;i<120*25;i++){
   p.input(car,{throttle:i>240?1:0,steer:0,onDirt:true},1/120);p.step();p.sync(car,1/120);progress=-(car.x-o.x)*Math.sin(heading)-(car.z-o.z)*Math.cos(heading);
   if(car.airborne&&progress> -25){time+=1/120;best=Math.max(best,time);}else if(time){landed=true;time=0;}
   assert.equal(car.rollover,false);if(progress>40)break;
  }
  assert.ok(best>.2,`${best} s`);assert.ok(landed);assert.ok(progress>40);
 }finally{p.dispose();}
});
test('seeded low rollers include elongated humps, depressions and a reproducible practice strip',()=>{
 const a=desertFreestyle(1947),b=desertFreestyle(17);assert.ok(a.rollers.length>1000);assert.equal(a.rollers.filter(r=>r.practice).length,8);
 assert.ok(a.rollers.some(r=>r.height<0));assert.ok(a.rollers.every(r=>Math.abs(r.height)<.85));
 assert.notDeepEqual(a.rollers.slice(0,3),b.rollers.slice(0,3));assert.deepEqual(a.rollers,desertFreestyle(1947).rollers);
 const strip=a.rollers.filter(r=>r.practice);assert.ok(strip.every(r=>r.length/r.width>=5));
 assert.ok(ground.heightAt(-165,238)>ground.heightAt(-165,222)+.6,'low mounds and depressions remain visible in the real contact mesh');
});
test('the low roller strip moves the suspension while a stock 302 keeps driving',()=>{
 const p=createPhysics(ground,ground.bounds),car={x:-165,z:305,heading:0,style:'classic',engineId:'302',speed:0,driveMode:'auto',transmissionMode:'automatic'};p.reset(car);let min=Infinity,max=-Infinity;
 try{
  for(let i=0;i<120*25;i++){
   p.input(car,{throttle:i>240&&car.speed*3.6<50?1:0,steer:0,onDirt:true},1/120);p.step();p.sync(car,1/120);
   if(i>240)for(const length of car.suspensionLengths){min=Math.min(min,length);max=Math.max(max,length);}
   assert.equal(car.rollover,false);if(car.z<140)break;
  }
  assert.ok(car.z<140);assert.ok(max-min>.05,`${max-min} m of suspension travel`);
 }finally{p.dispose();}
});
for(const jump of ground.rockRamps)for(const direction of ['reverse','left','right'])test(`${jump.id}: ${direction} jump clears and continues with normal driving inputs`,()=>{
 const cross=direction!=='reverse',sign=direction==='right'?-1:1;
 const start=cross?jumpPoint(jump,jump.runup*(jump.id==='rock-1'?.8:.85),sign*(-jump.halfWidth-jump.edgeWidth-110)):jumpPoint(jump,jumpEnd(jump)+245);
 const heading=jump.heading+(cross?-sign*Math.PI/2:Math.PI),p=createPhysics(ground,ground.bounds),car={...start,heading,style:'classic',engineId:'godzilla73',speed:0,driveMode:'auto',transmissionMode:'automatic'};p.reset(car);
 const target=cross?(jump.id==='rock-0'?85:jump.id==='rock-1'?105:Infinity):jump.height>=12?Infinity:115;
 let flight=0,best=0,landed=false,progress=-245;
 try{
  for(let i=0;i<120*45;i++){
   p.input(car,{throttle:i>240&&car.speed*3.6<target?1:0,brake:car.speed*3.6>target+5?1:0,steer:0,onDirt:true},1/120);p.step();p.sync(car,1/120);
   const q=jumpCoordinates(jump,car.x,car.z);progress=cross?sign*q.side:jumpEnd(jump)-q.s;
   if(car.airborne&&progress> -10){flight+=1/120;best=Math.max(best,flight);}else if(flight){landed=true;flight=0;}
   assert.equal(car.rollover,false);if(progress>(cross?jump.halfWidth+jump.edgeWidth+20:jumpEnd(jump)+15))break;
  }
  assert.ok(best>.15,`${best} s`);assert.ok(landed);assert.ok(progress>(cross?jump.halfWidth+jump.edgeWidth+15:jumpEnd(jump)+10),`progress ${progress}`);
 }finally{p.dispose();}
});
