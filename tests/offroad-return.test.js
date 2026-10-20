import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,ROAD_WIDTH,createCircuit,nearestPoint} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {initPhysics,createPhysics} from '../src/physics.js';
before(async()=>await initPhysics());
const n=3600,dt=1/120;
for(let track=0;track<TRACKS.length;track++)for(const side of [-1,1])test(`${TRACKS[track].name}: drives back from ${side<0?'left':'right'} desert shoulder in LO through tire/cone markers`,()=>{
 const curve=createCircuit(track),samples=Array.from({length:n},(_,i)=>curve.getPointAt(i/n)),terrain=buildTerrain(samples,curve,track);
 const bounds={min:{x:Math.min(...samples.map(p=>p.x)),z:Math.min(...samples.map(p=>p.z))},max:{x:Math.max(...samples.map(p=>p.x)),z:Math.max(...samples.map(p=>p.z))}};
 const physics=createPhysics(terrain,bounds),progress=.01,p=curve.getPointAt(progress),t=curve.getTangentAt(progress),normal={x:-t.z*side,z:t.x*side};
 const car={x:p.x+normal.x*(ROAD_WIDTH+12),z:p.z+normal.z*(ROAD_WIDTH+12),heading:Math.atan2(normal.x,normal.z),speed:0,engineId:'302',style:'classic',driveMode:'lo'};
 const props=[-1.4,0,1.4].map((offset,i)=>{const x=p.x+normal.x*(ROAD_WIDTH+.06)+t.x*offset,z=p.z+normal.z*(ROAD_WIDTH+.06)+t.z*offset;return physics.addBarrier(x,terrain.heightAt(x,z)+.01,z,{kind:i===1?'cone':'tires',layers:2});});
 physics.reset(car);
 let returned=false,displacement=0;
 const origins=props.map(b=>b.translation());
 try{
  for(let i=0;i<120*12;i++){
   const near=nearestPoint(samples,car.x,car.z);
   physics.input(car,{throttle:i<180?0:1,steer:0,onDirt:near.distance<ROAD_WIDTH},dt);physics.step();physics.sync(car,dt);
   props.forEach((body,j)=>{const q=body.translation();displacement=Math.max(displacement,Math.hypot(q.x-origins[j].x,q.z-origins[j].z));});
   if(near.distance<ROAD_WIDTH-3&&!car.airborne){returned=true;break;}
  }
  assert.equal(returned,true,`stuck at distance ${nearestPoint(samples,car.x,car.z).distance}, speed ${car.speed}`);
  assert.equal(car.rollover,false);assert.ok(displacement>.25,`markers must be displaced: ${displacement}`);
 }finally{physics.dispose();}
});
