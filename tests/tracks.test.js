import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,ROAD_WIDTH,createCircuit,terrainHeight,nearestPoint,opponentInput} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {advanceProgress} from '../src/race.js';
before(async()=>await initPhysics());
const n=3600,dt=1/120;
// Legacy calibrated courses; the added circuits are exercised in track-pack.test.js.
for(let track=0;track<2;track++){
 const curve=createCircuit(track),samples=Array.from({length:n},(_,i)=>curve.getPointAt(i/n));
 const terrain=buildTerrain(samples,curve,track),bounds={min:{x:Math.min(...samples.map(p=>p.x)),z:Math.min(...samples.map(p=>p.z))},max:{x:Math.max(...samples.map(p=>p.x)),z:Math.max(...samples.map(p=>p.z))}};
 test(`${TRACKS[track].name}: lap length is four times the previous track`,()=>{
  assert.ok(Math.abs(curve.getLength()/TRACKS[track].previousLength-4)<.001);
 });
 test(`${TRACKS[track].name}: corners leave room for the inside road edge`,()=>{
  for(let i=0;i<n;i++){
   const a=samples[i],b=samples[(i+1)%n],c=samples[(i+2)%n],ab=b.clone().sub(a),bc=c.clone().sub(b),ac=c.clone().sub(a),cross=Math.abs(ab.x*bc.z-ab.z*bc.x);
   if(cross>1e-8)assert.ok(ab.length()*bc.length()*ac.length()/(2*cross)>ROAD_WIDTH+.3);
  }
 });
 test(`${TRACKS[track].name}: high jump has a straight approach and two different landing heights`,()=>{
  const f=TRACKS[track].features.find(f=>f.kind==='canyon'),length=curve.getLength();
  const a=curve.getTangentAt(f.start-20/length),b=curve.getTangentAt(f.start+f.runup/length);
  assert.ok(f.height<=3.5&&f.gap<=10&&f.landing>=40,'jump must match Bronco race speeds');
  assert.ok(TRACKS[track].features.filter(f=>f.kind==='whoops').every(f=>f.height<.2),'ordinary whoops must work the suspension rather than launch trucks');
  assert.ok(a.dot(b)>.99,'approach and takeoff must share a straight');
  assert.ok(terrainHeight(f.start+(f.runup-.2)/length,track)>6);
  const landing=f.start+(f.runup+f.gap+8)/length;
  assert.ok(terrainHeight(landing,track,3.5)-terrainHeight(landing,track,-3.5)>.8);
  assert.ok(TRACKS[track].features.filter(f=>f.kind==='whoops').reduce((sum,f)=>sum+f.count,0)>=30);
 });
 test(`${TRACKS[track].name}: sampled contact height matches rendered triangle vertices and banks`,()=>{
  for(let i=0;i<terrain.positions.length;i+=387){const v=terrain.positions;assert.ok(Math.abs(terrain.heightAt(v[i],v[i+2])-v[i+1])<.002);}
  for(let i=0;i<n;i+=7)for(const lateral of [-ROAD_WIDTH,0,ROAD_WIDTH]){
   const t=curve.getTangentAt(i/n),x=samples[i].x-t.z*lateral,z=samples[i].z+t.x*lateral;
   assert.ok(Math.abs(terrain.heightAt(x,z)-terrainHeight(i/n,track,lateral))<.003);
  }
  assert.equal(terrainHeight(0,track),terrainHeight(1,track));
 });
 test(`${TRACKS[track].name}: real suspension launches a controlled ballistic jump and lands beyond the gap`,()=>{
  const physics=createPhysics(terrain,bounds),car={x:0,z:0,heading:0,speed:0,engineId:'302',style:'classic',lane:-3.5,nitro:100};
  const p=samples[0],t=curve.getTangentAt(0);car.x=p.x-t.z*car.lane;car.z=p.z+t.x*car.lane;car.heading=Math.atan2(-t.x,-t.z);physics.reset(car);
  const f=TRACKS[track].features[0];let flight=0,longest=0,landing=0,peak=0;
  for(let frame=0;frame<120*40;frame++){
   const near=nearestPoint(samples,car.x,car.z);if(near.index/n>f.start+f.length+.025)break;
   physics.input(car,{...opponentInput(car,near,curve,samples),boost:false,onDirt:true,ai:true},dt);physics.step();physics.sync(car,dt);peak=Math.max(peak,car.height);
   if(car.airborne)flight+=dt;else{if(flight>longest){longest=flight;landing=nearestPoint(samples,car.x,car.z).index/n;}flight=0;}
  }
  assert.ok(longest>.4&&longest<1.8,`flight ${longest}`);
  assert.ok(peak>6&&peak<8.5,`peak ${peak}`);
  assert.ok(landing>f.start+(f.runup+f.gap)/curve.getLength(),`landing ${landing}`);
  physics.dispose();
 });
 test(`${TRACKS[track].name}: I6 and V8 opponents complete a full enlarged lap with physical recovery`,()=>{
  for(const engineId of ['170','400','300efi','302efi']){
   const physics=createPhysics(terrain,bounds),car={x:0,z:0,heading:0,speed:0,engineId,style:'classic',nitro:100,lane:-3.5,index:0,checkpoint:0,lap:0};
   const recover=i=>{const p=samples[i],t=curve.getTangentAt(i/n);Object.assign(car,{x:p.x-t.z*car.lane,z:p.z+t.x*car.lane,heading:Math.atan2(-t.x,-t.z),speed:0});physics.reset(car);physics.sync(car,0);};
   recover(0);let stuck=0,recoveries=0;
   for(let frame=0;frame<120*240&&car.lap<1;frame++){
    const near=nearestPoint(samples,car.x,car.z),input=opponentInput(car,near,curve,samples);
    physics.input(car,{...input,boost:false,onDirt:near.distance<ROAD_WIDTH,ai:true},dt);physics.step();physics.sync(car,dt);
    const next=nearestPoint(samples,car.x,car.z);Object.assign(car,advanceProgress(car.index,next.index,car.checkpoint,car.lap,n));car.index=next.index;
    stuck=Math.abs(car.speed)<1?stuck+dt:0;
    if(car.rolloverTime>3||next.distance>ROAD_WIDTH+12||stuck>6){recover((next.index+(stuck>6?Math.round(6*n/curve.getLength()):0))%n);stuck=0;recoveries++;}
   }
   assert.equal(car.lap,1,`${engineId} stalled at ${car.index}`);assert.ok(recoveries<12,`${engineId}: ${recoveries} recoveries`);physics.dispose();
  }
 });
}
