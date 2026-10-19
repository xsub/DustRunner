import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,TRACK_VARIANTS,ROAD_WIDTH,createCircuit,terrainHeight,nearestPoint,opponentInput} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {initPhysics,createPhysics} from '../src/physics.js';
before(async()=>await initPhysics());
const n=3600,dt=1/120;
for(let track=0;track<TRACKS.length;track++){
 const original=createCircuit(track),originalSamples=Array.from({length:n},(_,j)=>original.getPointAt(j/n)),originalTerrain=buildTerrain(originalSamples,original,track);
 for(let variant=1;variant<TRACK_VARIANTS.length;variant++){
  const reflection=TRACK_VARIANTS[variant],curve=createCircuit(track,variant),parity=reflection.x*reflection.z;
  const samples=Array.from({length:n},(_,i)=>curve.getPointAt(i/n));
  const terrain=buildTerrain(samples,curve,track);
  test(`${TRACKS[track].name} ${reflection.name}: exact reflected circuit, terrain and AI steering`,()=>{
   assert.ok(Math.abs(curve.getLength()-original.getLength())<1e-7);
   assert.ok(curve.getPointAt(0).distanceTo(curve.getPointAt(1))<1e-7);
   for(let i=0;i<terrain.indices.length;i+=1023){
    let x=0,z=0;
    for(let k=0;k<3;k++){const v=terrain.indices[i+k]*3;x+=terrain.positions[v]/3;z+=terrain.positions[v+2]/3;}
    assert.ok(Math.abs(terrain.heightAt(x,z)-originalTerrain.heightAt(x*reflection.x,z*reflection.z))<.003,'triangle interiors must reflect exactly');
   }
   for(let i=0;i<n;i+=23){
    const t=i/n,p=original.getPointAt(t),q=samples[i],a=original.getTangentAt(t),b=curve.getTangentAt(t);
    assert.ok(Math.hypot(q.x-p.x*reflection.x,q.z-p.z*reflection.z)<1e-7);
    assert.ok(Math.hypot(b.x-a.x*reflection.x,b.z-a.z*reflection.z)<1e-7);
    for(const lateral of [-ROAD_WIDTH,-3.5,0,3.5,ROAD_WIDTH]){
     const x=q.x-b.z*lateral*parity,z=q.z+b.x*lateral*parity;
     assert.ok(Math.abs(terrain.heightAt(x,z)-originalTerrain.heightAt(x*reflection.x,z*reflection.z))<.003,'banks and split landing must reflect too');
     assert.equal(terrainHeight(t,track,lateral*parity,variant),terrainHeight(t,track,lateral));
    }
    const car={x:p.x,z:p.z,heading:Math.atan2(-a.x,-a.z)+.12,speed:18,lane:3.5,nitro:100};
    const mirror={...car,x:q.x,z:q.z,heading:Math.atan2(-b.x,-b.z)+.12*parity,lane:car.lane*parity};
    const control=opponentInput(car,{index:i},original,originalSamples);
    const mirrored=opponentInput(mirror,{index:i},curve,samples);
    assert.ok(Math.abs(control.steer*parity-mirrored.steer)<1e-7);
    assert.equal(control.brake,mirrored.brake);assert.equal(control.boost,mirrored.boost);
   }
  });
  test(`${TRACKS[track].name} ${reflection.name}: real suspension follows the reflected ramp and landing`,()=>{
   const bounds={min:{x:Math.min(...samples.map(p=>p.x)),z:Math.min(...samples.map(p=>p.z))},max:{x:Math.max(...samples.map(p=>p.x)),z:Math.max(...samples.map(p=>p.z))}};
   const physics=createPhysics(terrain,bounds),p=samples[0],t=curve.getTangentAt(0),lane=-3.5*parity;
   const car={x:p.x-t.z*lane,z:p.z+t.x*lane,heading:Math.atan2(-t.x,-t.z),speed:0,engineId:'302',style:'classic',lane,nitro:100};
   physics.reset(car);
   const f=TRACKS[track].features[0];let flight=0,longest=0,landing=0,peak=0;
   try{
    for(let frame=0;frame<120*40;frame++){
     const near=nearestPoint(samples,car.x,car.z);if(near.index/n>f.start+f.length+.025)break;
     physics.input(car,{...opponentInput(car,near,curve,samples),boost:false,onDirt:true,ai:true},dt);physics.step();physics.sync(car,dt);peak=Math.max(peak,car.height);
     if(car.airborne)flight+=dt;else{if(flight>longest){longest=flight;landing=nearestPoint(samples,car.x,car.z).index/n;}flight=0;}
    }
    assert.ok(longest>1&&longest<3.5,`flight ${longest}`);
    assert.ok(peak>10&&peak<18,`peak ${peak}`);
    assert.ok(landing>f.start+(f.runup+f.gap)/curve.getLength(),`landing ${landing}`);
   }finally{physics.dispose();}
  });
 }
}
