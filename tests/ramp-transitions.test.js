import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,setGeneratedTrack,createCircuit,terrainHeight,nearestPoint,refreshTracks} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {angleDelta,clamp} from '../src/race.js';
import {setTuning,DEFAULT_TUNING} from '../src/tuning.js';
before(initPhysics);
function checkGrade(index,limit=.55){
 const track=TRACKS[index];
 for(const ramp of track.ramps)for(const lateral of [-6,0,6]){
  // Test the whole footprint plus blends, not only exact feature endpoints.
  for(let d=-9;d<ramp.length*track.length+9;d+=.25){
   const t=ramp.start+d/track.length,delta=.025/track.length;
   const grade=Math.abs(terrainHeight(t+delta,index,lateral)-terrainHeight(t-delta,index,lateral))/.05;
   assert.ok(grade<limit,`${track.name} tier ${ramp.tier}, ${d} m: grade ${grade}`);
  }
  for(const t of [ramp.start,ramp.start+ramp.length]){
   const delta=.001/track.length;
   assert.ok(Math.abs(terrainHeight(t+delta,index,lateral)-terrainHeight(t-delta,index,lateral))<.002,'no height discontinuity at ramp join');
  }
 }
}
test('all preset and seeded ramps have continuous joins and climbable faces in both directions',()=>{
 for(let i=0;i<16;i++)checkGrade(i);
 for(const seed of [0,42,1947,20261020,4294967295])checkGrade(setGeneratedTrack(seed));
});
test('maximum-height tuning extends a short landing rather than cutting the back slope off',()=>{
 try{
  setTuning({rampHeight:7.5,jumpGap:0,landingLength:20});refreshTracks();
  const f=TRACKS[0].ramps[0];assert.ok(f.landing>=37.5);
  checkGrade(0,.65);
 }finally{setTuning(DEFAULT_TUNING);refreshTracks();}
});
test('the weakest I6 can climb the formerly vertical back faces with real wheel contacts',()=>{
 const index=0,curve=createCircuit(index),n=1800,dt=1/120,samples=Array.from({length:n},(_,i)=>curve.getPointAt(i/n)),terrain=buildTerrain(samples,curve,index),length=curve.getLength();
 for(const kind of ['canyon','jump']){
  const f=TRACKS[index].ramps.find(f=>f.kind===kind&&f.tier===2),start=f.start+f.length+12/length,p=curve.getPointAt(start),t=curve.getTangentAt(start);
  const car={x:p.x,z:p.z,heading:Math.atan2(t.x,t.z),speed:0,engineId:'170',style:'classic',driveMode:'lo',nitro:100},physics=createPhysics(terrain,{min:{x:-500,z:-500},max:{x:500,z:500}});
  physics.reset(car);let crossed=false;
  try{
   for(let step=0;step<120*35;step++){
    const near=nearestPoint(samples,car.x,car.z),target=curve.getPointAt((near.index/n-8/length+1)%1),desired=Math.atan2(-(target.x-car.x),-(target.z-car.z));
    physics.input(car,{throttle:1,steer:clamp(angleDelta(desired,car.heading)*1.6,-1,1),brake:false,boost:false,onDirt:true},dt);physics.step();physics.sync(car,dt);
    if(near.index/n<f.start+f.runup/length){crossed=true;break;}
   }
   assert.ok(crossed,`${kind}: failed to climb over the crest`);assert.ok(!car.rollover);
  }finally{physics.dispose();}
 }
});
