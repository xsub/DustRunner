import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,createCircuit,terrainHeight,nearestPoint,opponentInput,ROAD_WIDTH} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {advanceProgress} from '../src/race.js';
before(initPhysics);
const n=1800,dt=1/120;
test('16 independent circuits have unique outlines and larger new maps',()=>{
 assert.equal(TRACKS.length,16);assert.equal(new Set(TRACKS.map(t=>t.name)).size,16);
 const outlines=new Set();let originalArea;
 TRACKS.forEach((track,index)=>{
  const curve=createCircuit(index),points=Array.from({length:400},(_,i)=>curve.getPointAt(i/400)),xs=points.map(p=>p.x),zs=points.map(p=>p.z);
  const area=(Math.max(...xs)-Math.min(...xs))*(Math.max(...zs)-Math.min(...zs));if(index===0)originalArea=area;
  if(index>=2){assert.ok(area>originalArea*2.5&&area<originalArea*4.5);assert.ok(track.rampCount>=4&&track.rampCount<=10);assert.ok(track.features.filter(f=>f.kind==='whoops').length>=6);}
  outlines.add(points.map(p=>p.x.toFixed(2)+','+p.z.toFixed(2)).join('|'));assert.ok(points[0].distanceTo(curve.getPointAt(1))<1e-7);
 });assert.equal(outlines.size,16);
});
for(let index=2;index<TRACKS.length;index++){
 test(`${TRACKS[index].name}: matching terrain, safe runway, reflections and AI lap`,()=>{
  const curve=createCircuit(index),samples=Array.from({length:n},(_,i)=>curve.getPointAt(i/n)),terrain=buildTerrain(samples,curve,index),f=TRACKS[index].features[0];
  const xs=samples.map(p=>p.x),zs=samples.map(p=>p.z),bounds={min:{x:Math.min(...xs),z:Math.min(...zs)},max:{x:Math.max(...xs),z:Math.max(...zs)}};
  assert.ok(curve.getTangentAt(f.start-20/curve.getLength()).dot(curve.getTangentAt(f.start+f.runup/curve.getLength()))>.99);
  let min=Infinity,max=-Infinity;
  for(let j=0;j<n;j+=9){
   const p=samples[j],t=curve.getTangentAt(j/n),h=terrainHeight(j/n,index);min=Math.min(min,h);max=Math.max(max,h);
   for(const side of [-ROAD_WIDTH,0,ROAD_WIDTH])assert.ok(Math.abs(terrain.heightAt(p.x-t.z*side,p.z+t.x*side)-terrainHeight(j/n,index,side))<.025,`surface mismatch at ${j}`);
   const mirror=createCircuit(index,3).getPointAt(j/n);assert.ok(Math.hypot(mirror.x+p.x,mirror.z+p.z)<1e-7);
  }
  assert.ok(max-min>7,'hills, dips and crests must change elevation');
  const physics=createPhysics(terrain,bounds),car={x:0,z:0,heading:0,speed:0,style:'classic',engineId:'302',lane:-3.5,index:0,checkpoint:0,lap:0,nitro:100};
  const recover=j=>{const p=samples[j],t=curve.getTangentAt(j/n);Object.assign(car,{x:p.x-t.z*car.lane,z:p.z+t.x*car.lane,heading:Math.atan2(-t.x,-t.z),speed:0});physics.reset(car);physics.sync(car,0);};
  recover(0);let stuck=0,recoveries=0;
  try{
   for(let frame=0;frame<120*360&&car.lap<1;frame++){
    const near=nearestPoint(samples,car.x,car.z);physics.input(car,{...opponentInput(car,near,curve,samples),boost:false,onDirt:near.distance<ROAD_WIDTH,ai:true},dt);physics.step();physics.sync(car,dt);
    const next=nearestPoint(samples,car.x,car.z);Object.assign(car,advanceProgress(car.index,next.index,car.checkpoint,car.lap,n));car.index=next.index;stuck=Math.abs(car.speed)<1?stuck+dt:0;
    if(car.rolloverTime>3||next.distance>ROAD_WIDTH+12||stuck>6){recover((next.index+(stuck>6?Math.round(6*n/curve.getLength()):0))%n);stuck=0;recoveries++;}
   }
   assert.equal(car.lap,1,`stalled at ${car.index} after ${recoveries} recoveries`);assert.ok(recoveries<18,`${recoveries} recoveries`);
  }finally{physics.dispose();}
 });
}
