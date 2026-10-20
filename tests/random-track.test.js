import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {randomTrackDefinition} from '../src/random-track.js';
import {TRACKS,setGeneratedTrack,refreshTracks,createCircuit,terrainHeight,ROAD_WIDTH,nearestPoint,opponentInput} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {advanceProgress} from '../src/race.js';
before(initPhysics);
function verifyRamps(track){
 const ramps=track.features.filter(f=>['canyon','jump'].includes(f.kind));
 assert.ok(ramps.length>=4&&ramps.length<=10);assert.equal(ramps.length,track.rampCount);
 assert.deepEqual([...new Set(ramps.map(f=>f.tier))].sort(),[0,1,2]);assert.equal(new Set(ramps.map(f=>f.height)).size,3);
 const sorted=[...ramps].sort((a,b)=>a.start-b.start);
 for(let i=0;i<sorted.length;i++){
  const ramp=sorted[i];assert.ok(ramp.start>0&&ramp.start+ramp.length<1);
  if(i)assert.ok(sorted[i-1].start+sorted[i-1].length<ramp.start,'ramps need separate approach/landing space');
 }
}
test('every preset has 4–10 separated ramps spanning three actual height classes',()=>{for(const track of TRACKS)verifyRamps(track);});
test('seeded race generation is reproducible, varied, closed and wide enough for the road',()=>{
 const counts=new Set(),outlines=new Set();
 for(const seed of [0,1,2,17,42,1947,20261020,4294967295]){
  assert.deepEqual(randomTrackDefinition(seed),randomTrackDefinition(seed));
  const index=setGeneratedTrack(seed),track=TRACKS[index],curve=createCircuit(index),length=curve.getLength();
  verifyRamps(track);counts.add(track.rampCount);outlines.add(JSON.stringify(track.points));
  assert.ok(length>2000&&length<4500);assert.ok(curve.getPointAt(0).distanceTo(curve.getPointAt(1))<1e-7);
  for(let i=0;i<500;i++){
   const t=i/500,a=curve.getTangentAt(t),b=curve.getTangentAt((t+.002)%1),angle=Math.acos(Math.max(-1,Math.min(1,a.dot(b))));
   if(angle>.00001)assert.ok(length*.002/angle>ROAD_WIDTH+2,'inside edge must not fold over');
   const p=curve.getPointAt(t),mirror=createCircuit(index,3).getPointAt(t);assert.ok(Math.hypot(p.x+mirror.x,p.z+mirror.z)<1e-6);
   assert.ok(Number.isFinite(terrainHeight(t,index)));
  }
 }
 assert.ok(counts.size>=3);assert.equal(outlines.size,8);
 const before=structuredClone(TRACKS[16]);refreshTracks();assert.deepEqual(TRACKS[16],before,'tuning refresh must retain generated layout');
});
test('an AI Bronco can complete a generated circuit using the real terrain and suspension',()=>{
 const index=setGeneratedTrack(20261020),curve=createCircuit(index),n=1800,dt=1/120,samples=Array.from({length:n},(_,i)=>curve.getPointAt(i/n)),terrain=buildTerrain(samples,curve,index);
 const xs=samples.map(p=>p.x),zs=samples.map(p=>p.z),bounds={min:{x:Math.min(...xs),z:Math.min(...zs)},max:{x:Math.max(...xs),z:Math.max(...zs)}};
 const physics=createPhysics(terrain,bounds),car={x:0,z:0,heading:0,speed:0,style:'classic',engineId:'302',lane:-3.5,index:0,checkpoint:0,lap:0,nitro:100};
 const recover=j=>{const p=samples[j],t=curve.getTangentAt(j/n);Object.assign(car,{x:p.x-t.z*car.lane,z:p.z+t.x*car.lane,heading:Math.atan2(-t.x,-t.z),speed:0});physics.reset(car);physics.sync(car,0);};
 recover(0);let stuck=0,recoveries=0;
 try{
  for(let frame=0;frame<120*360&&car.lap<1;frame++){
   const near=nearestPoint(samples,car.x,car.z);physics.input(car,{...opponentInput(car,near,curve,samples),boost:false,onDirt:near.distance<ROAD_WIDTH,ai:true},dt);physics.step();physics.sync(car,dt);
   const next=nearestPoint(samples,car.x,car.z);Object.assign(car,advanceProgress(car.index,next.index,car.checkpoint,car.lap,n));car.index=next.index;stuck=Math.abs(car.speed)<1?stuck+dt:0;
   if(car.rolloverTime>3||next.distance>ROAD_WIDTH+12||stuck>6){recover((next.index+(stuck>6?Math.round(6*n/curve.getLength()):0))%n);stuck=0;recoveries++;}
  }
  assert.equal(car.lap,1);assert.ok(recoveries<12,`${recoveries} recoveries`);
 }finally{physics.dispose();}
});
test('small, medium and high added ramps have real takeoff lips and launch the rigid body',()=>{
 const index=0,curve=createCircuit(index),n=3600,dt=1/120,samples=Array.from({length:n},(_,i)=>curve.getPointAt(i/n)),terrain=buildTerrain(samples,curve,index),length=curve.getLength();
 const bounds={min:{x:-500,z:-500},max:{x:500,z:500}};
 for(const tier of [0,1,2]){
  const ramp=TRACKS[index].features.find(f=>f.kind==='jump'&&f.tier===tier),physics=createPhysics(terrain,bounds),car={style:'classic',engineId:'302',lane:0,nitro:100,speed:0};
  const start=ramp.start-25/length,p=curve.getPointAt(start),t=curve.getTangentAt(start);Object.assign(car,{x:p.x,z:p.z,heading:Math.atan2(-t.x,-t.z)});physics.reset(car);let flight=0;
  try{
   for(let frame=0;frame<120*14;frame++){
    const near=nearestPoint(samples,car.x,car.z);physics.input(car,{...opponentInput(car,near,curve,samples),boost:false,onDirt:true,ai:true},dt);physics.step();physics.sync(car,dt);
    const progress=nearestPoint(samples,car.x,car.z).index/n;
    if(progress>ramp.start+ramp.length)break;
    if(progress>ramp.start+ramp.runup/length-.002&&car.airborne)flight+=dt;
   }
   assert.ok(flight>.05,`tier ${tier}: no actual takeoff (${flight}s)`);
  }finally{physics.dispose();}
 }
});
