import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {buildDesert,createDesertHeight} from '../src/desert.js';
import {desertJumps,jumpPoint,jumpCoordinates,jumpEnd,jumpSurface} from '../src/desert-jumps.js';
import {initPhysics,createPhysics} from '../src/physics.js';
before(initPhysics);
const terrain=buildDesert();
test('flat curb-height ruts, moderate dunes and rare broad giant descents coexist',()=>{
 const h=createDesertHeight(),flat=[];for(let z=275;z<=325;z+=2.5)for(let x=-725;x<=-675;x+=2.5)flat.push(h(x,z));
 assert.ok(Math.max(...flat)-Math.min(...flat)>.12);assert.ok(Math.max(...flat)-Math.min(...flat)<.4);
 assert.ok(h(760,-280)>45);assert.ok(h(760,-280)-h(760,120)>30,'a long giant-dune descent spans hundreds of metres');
 let gentle=0,total=0;
 for(let z=-480;z<=480;z+=15)for(let x=-1080;x<=1080;x+=15){
  if(terrain.jumps.some(j=>{const c=jumpCoordinates(j,x,z);return c.s> -j.approach-40&&c.s<jumpEnd(j)+45&&Math.abs(c.side)<j.halfWidth+40;}))continue;
  const slope=Math.hypot((h(x+2.5,z)-h(x-2.5,z))/5,(h(x,z+2.5)-h(x,z-2.5))/5);gentle+=slope<Math.tan(20*Math.PI/180)?1:0;total++;
 }
 assert.ok(gentle/total>.95,'most natural ground must be easily climbable, rather than steep walls');
});
test('six seeded sand jumps have smooth run-ins and three opposite landing ramps',()=>{
 const a=desertJumps(1947);assert.equal(a.length,6);assert.equal(a.filter(j=>j.paired).length,3);assert.deepEqual(a,desertJumps(1947));assert.notDeepEqual(a,desertJumps(123));
 for(const j of a){assert.equal(jumpSurface(j,0),0);assert.ok(jumpSurface(j,.1)<.001);assert.equal(jumpSurface(j,j.runup),j.height);
  const start=jumpPoint(j,-70),lip=jumpPoint(j,j.runup);assert.ok(Math.abs(terrain.heightAt(start.x,start.z)-1)<.02);assert.ok(Math.abs(terrain.heightAt(lip.x,lip.z)-(1+j.height))<1.3,'2.5 m render/contact grid samples a real takeoff lip');
 }
});
for(const [engineId,index,minRange,minFlight] of [['302',0,18,.7],['302',2,18,.7],['godzilla73',4,25,1]])test(`${engineId} physically launches and lands sand jump ${index} without a rollover`,()=>{
 const j=terrain.jumps[index],p=createPhysics(terrain,terrain.bounds),car={...jumpPoint(j,-245),heading:j.heading,style:'classic',engineId,speed:0,transmissionMode:'automatic',driveMode:'auto'};p.reset(car);
 let time=0,maxFlight=0,maxRange=0,takeoff=null,landed=false;
 try{
  for(let i=0;i<120*35;i++){
   p.input(car,{throttle:i>240?1:0,steer:0,onDirt:true},1/120);p.step();p.sync(car,1/120);const s=jumpCoordinates(j,car.x,car.z).s;
   if(i>240&&s>0&&car.airborne){if(time===0)takeoff={x:car.x,z:car.z};time+=1/120;maxFlight=Math.max(maxFlight,time);}else if(time){maxRange=Math.max(maxRange,Math.hypot(car.x-takeoff.x,car.z-takeoff.z));landed=true;time=0;}
   assert.equal(car.rollover,false);if(landed&&s>jumpEnd(j)+5)break;
  }
  assert.ok(landed);assert.ok(maxRange>minRange,`${maxRange} m`);assert.ok(maxFlight>minFlight,`${maxFlight} s`);assert.ok(jumpCoordinates(j,car.x,car.z).s>jumpEnd(j),'continue driving after the landing');
 }finally{p.dispose();}
});
