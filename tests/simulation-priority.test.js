import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {SimulationClock} from '../src/simulation-clock.js';
import {indexedNearest} from '../src/track-index.js';
import {TRACKS,createCircuit} from '../src/tracks.js';
import {createScenery} from '../src/scenery.js';
import {initPhysics,createPhysics} from '../src/physics.js';
before(initPhysics);

test('120 Hz simulation stays identical at 30, 60, 120 and 144 display FPS',()=>{
 let reference;
 for(const fps of [30,60,120,144]){
  const terrain={positions:new Float32Array([-200,0,-200,200,0,-200,-200,0,200,200,0,200]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
  const physics=createPhysics(terrain,{min:{x:-200,z:-200},max:{x:200,z:200}}),clock=new SimulationClock({now:()=>0}),cars=[{style:'classic',engineId:'302',x:0,z:0,heading:0,speed:0},{style:'ranger',engineId:'351m',x:0,z:-10,heading:Math.PI,speed:0}];
  cars.forEach(c=>physics.reset(c));let ticks=0;
  try{
   for(let frame=0;frame<fps*4;frame++)clock.advance(1/fps,dt=>{assert.equal(dt,1/120);for(const car of cars)physics.input(car,{throttle:1,steer:0,onDirt:true},dt);physics.step();cars.forEach(c=>physics.sync(c,dt));ticks++;});
   assert.equal(ticks,480);assert.equal(clock.limitedFrames,0);
   const state=cars.flatMap(c=>[c.x,c.z,c.speed,c.height,...c.suspensionLengths]);
   if(reference)state.forEach((value,i)=>assert.ok(Math.abs(value-reference[i])<1e-7,`FPS ${fps}, component ${i}`));else reference=state;
  }finally{physics.dispose();}
 }
});

test('catch-up yields after its budget, retaining interpolation fraction and complete steps',()=>{
 let time=0,count=0;const clock=new SimulationClock({now:()=>time});
 const result=clock.advance(.05,dt=>{assert.equal(dt,1/120);time+=2.1;count++;});
 assert.equal(count,2);assert.equal(result.steps,2);assert.ok(result.dropped>.03);assert.equal(clock.limitedFrames,1);assert.ok(result.alpha<1);
 const next=clock.advance(1/120,()=>{time+=.1;count++;});assert.equal(next.steps,1);assert.equal(next.dropped,0);
 // A single unusually expensive solve is completed, not cut in half.
 const slow=new SimulationClock({now:()=>time});const one=slow.advance(.05,()=>{time+=9;});assert.equal(one.steps,1);assert.ok(one.cpuMs>=9);
});

test('catch-up has a hard step cap, no growing debt, and reset discards suspended time',()=>{
 const clock=new SimulationClock({now:()=>0});const r=clock.advance(.1,()=>{});assert.equal(r.steps,4);assert.equal(clock.limitedFrames,1);assert.ok(r.alpha<1);
 clock.reset();assert.equal(clock.advance(0,()=>assert.fail('unexpected step')).steps,0);assert.equal(clock.limitedFrames,1);
 clock.reset(true);assert.equal(clock.limitedFrames,0);assert.equal(clock.droppedSeconds,0);
 const stall=clock.advance(1,()=>{});assert.equal(stall.steps,4);assert.ok(Math.abs(stall.dropped-(1-4/120))<1e-8);assert.equal(clock.limitedFrames,1);
});

const brute=(samples,x,z)=>{let distance=Infinity,index=0;for(let i=0;i<samples.length;i++){const p=samples[i],d=(p.x-x)**2+(p.z-z)**2;if(d<distance){distance=d;index=i;}}return {index,distance:Math.sqrt(distance),point:samples[index]};};
test('spatial queries exactly match exhaustive search on every course and reflection, including off-road',()=>{
 let seed=23;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let track=0;track<TRACKS.length;track++)for(let variant=0;variant<4;variant++){
  const curve=createCircuit(track,variant),samples=Array.from({length:1800},(_,i)=>curve.getPointAt(i/1800));
  for(let q=0;q<40;q++){const x=(rand()-.5)*2000,z=(rand()-.5)*1600;assert.deepEqual(indexedNearest(samples,x,z),brute(samples,x,z));}
 }
});
test('spatial ties prefer the original earliest sample and replacement tracks get a new index',()=>{
 const a=[{x:-1,z:0},{x:1,z:0},{x:-1,z:0}],b=[{x:0,z:1},{x:0,z:-1}];
 assert.equal(indexedNearest(a,0,0).index,0);assert.equal(indexedNearest(a,-1,0).index,0);assert.deepEqual(indexedNearest(b,0,0),brute(b,0,0));assert.equal(indexedNearest([],0,0).distance,Infinity);
});

test('offscreen/deferred decoration does no animation work and visible snakes update at 30 Hz',()=>{
 let seed=71,heightQueries=0;const world=new Group(),scenery=createScenery({world,samples:[],curve:{lateralSign:1},roadWidth:0,nearest:()=>({distance:Infinity}),bounds:{min:{x:-50,z:-50},max:{x:50,z:50}},heightAt:()=>{heightQueries++;return 0;},random:()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}});
 heightQueries=0;scenery.update(1/30,()=>false);assert.equal(heightQueries,0);assert.equal(scenery.getStats().activeSnakes,0);
 const count=scenery.getStats().decorUpdates;scenery.update(.1,()=>true,false);assert.equal(heightQueries,0);assert.equal(scenery.getStats().decorUpdates,count);
 scenery.update(1/30,()=>true);assert.equal(scenery.getStats().activeSnakes,18);assert.equal(heightQueries,18);
 const before=scenery.getStats().decorUpdates;for(let i=0;i<120;i++)scenery.update(1/120,()=>true);assert.equal(scenery.getStats().decorUpdates-before,30);
 const geoms=new Set(),mats=new Set();world.traverse(o=>{if(o.geometry)geoms.add(o.geometry);if(o.material)mats.add(o.material);});geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
});

test('contact marker poses still upload when decorative work has no budget',()=>{
 const world=new Group(),bodies=[],scenery=createScenery({world,samples:[new Vector3(0,0,0),new Vector3(10,0,0)],curve:{getTangentAt:()=>new Vector3(1,0,0)},roadWidth:8,nearest:()=>({distance:0}),bounds:{min:{x:0,z:0},max:{x:20,z:20}},heightAt:()=>0,random:()=>.5,addBarrier:(x,y,z)=>{const body={markerState:{position:{x,y,z},rotation:{x:0,y:0,z:0,w:1},version:0}};bodies.push(body);return body;}});
 scenery.update(0,()=>false,false);const batches=world.children.filter(o=>o.isInstancedMesh),before=batches.map(b=>Array.from(b.instanceMatrix.array));
 bodies[0].markerState.position.x+=3;bodies[0].markerState.version++;scenery.update(1/120,()=>false,false);
 assert.ok(batches.some((batch,i)=>batch.instanceMatrix.array.some((value,j)=>value!==before[i][j])));assert.equal(scenery.getStats().decorUpdates,0);
 const geoms=new Set(),mats=new Set();world.traverse(o=>{if(o.geometry)geoms.add(o.geometry);if(o.material)mats.add(o.material);});geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
});
